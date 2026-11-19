/**
 * Property Tax & NOC Vault Controller
 * Handles Municipal Property Tax Assessments, Dues Settlement, and On-chain 1-Year NOC Issuance.
 */

const crypto = require('crypto');
const { pool, withTransaction } = require('../config/db');
const { ROLES } = require('../config/constants');
const contractService = require('../blockchain/contractService');

/**
 * List properties with tax status summary
 * GET /api/tax/properties
 */
const getPropertiesWithTaxes = async (req, res, next) => {
    try {
        const isOfficer = [ROLES.AUTHORITY, ROLES.SUPER_ADMIN].includes(req.user.role);
        const userWallet = (req.user.wallet_address || req.user.walletAddress || '').toLowerCase();

        let propQuery = `
            SELECT p.id, p.property_code, p.survey_number, p.district, p.state, p.area_sqft, p.estimated_fair_price, p.owner_wallet, p.nft_token_id, p.status
            FROM properties p
        `;
        let params = [];

        if (!isOfficer) {
            propQuery = `
                SELECT DISTINCT p.id, p.property_code, p.survey_number, p.district, p.state, p.area_sqft, p.estimated_fair_price, p.owner_wallet, p.nft_token_id, p.status, p.created_at
                FROM properties p
                LEFT JOIN property_co_owners pco ON pco.property_id = p.id
                WHERE LOWER(p.owner_wallet) = $1 OR LOWER(pco.owner_wallet) = $1
            `;
            params = [userWallet];
        }

        propQuery += ` ORDER BY p.created_at DESC`;

        const props = await pool.query(propQuery, params);

        const list = await Promise.all(
            props.rows.map(async (p) => {
                const taxRes = await pool.query(
                    `SELECT id, financial_year, base_tax_amount, cess_amount, penalty_amount, total_due, paid_amount, is_cleared, paid_at
                     FROM property_taxes
                     WHERE property_id = $1
                     ORDER BY financial_year DESC`,
                    [p.id]
                );

                const nocRes = await pool.query(
                    `SELECT id, financial_year, valid_until, certificate_hash, is_revoked, created_at
                     FROM tax_clearance_nocs
                     WHERE property_id = $1 AND is_revoked = FALSE AND valid_until > NOW()
                     ORDER BY valid_until DESC
                     LIMIT 1`,
                    [p.id]
                );

                const totalDueOutstanding = taxRes.rows
                    .filter((t) => !t.is_cleared)
                    .reduce((acc, t) => acc + Number(t.total_due) - Number(t.paid_amount), 0);

                return {
                    ...p,
                    taxes: taxRes.rows,
                    activeNoc: nocRes.rows[0] || null,
                    totalDueOutstanding,
                    isFullyCleared: totalDueOutstanding === 0,
                };
            })
        );

        return res.json({
            success: true,
            data: list,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get tax assessments & NOCs for a single property
 * GET /api/tax/property/:propertyId
 */
const getPropertyTaxDetails = async (req, res, next) => {
    try {
        const { propertyId } = req.params;

        const propRes = await pool.query(
            `SELECT id, property_code, survey_number, address_line, district, state, area_sqft, owner_wallet, nft_token_id, status
             FROM properties WHERE id = $1`,
            [propertyId]
        );

        if (propRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        const property = propRes.rows[0];

        const taxesRes = await pool.query(
            `SELECT * FROM property_taxes WHERE property_id = $1 ORDER BY financial_year DESC`,
            [propertyId]
        );

        const nocsRes = await pool.query(
            `SELECT * FROM tax_clearance_nocs WHERE property_id = $1 ORDER BY created_at DESC`,
            [propertyId]
        );

        return res.json({
            success: true,
            data: {
                property,
                taxes: taxesRes.rows,
                nocs: nocsRes.rows,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Record a new Tax Assessment (Municipal Officer)
 * POST /api/tax/assess
 */
const recordAssessment = async (req, res, next) => {
    try {
        const { property_id, financial_year, base_tax_amount, cess_amount = 0, penalty_amount = 0 } = req.body;

        const propRes = await pool.query(
            'SELECT id, property_code, nft_token_id, owner_wallet FROM properties WHERE id = $1',
            [property_id]
        );

        if (propRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        const property = propRes.rows[0];
        const totalDue = Number(base_tax_amount) + Number(cess_amount) + Number(penalty_amount);

        // Record on-chain
        let onChainAssessmentId = null;
        let txHash = null;
        try {
            const chainResult = await contractService.recordTaxAssessmentOnChain(
                property.nft_token_id || '1',
                property.property_code,
                financial_year,
                base_tax_amount,
                cess_amount,
                penalty_amount
            );
            onChainAssessmentId = chainResult.assessmentId || String(Date.now());
            txHash = chainResult.txHash;
        } catch (chainErr) {
            console.warn('Blockchain recordAssessment warning:', chainErr.message);
            onChainAssessmentId = String(Date.now());
        }

        const insertSql = `
            INSERT INTO property_taxes (
                property_id,
                token_id,
                property_code,
                financial_year,
                base_tax_amount,
                cess_amount,
                penalty_amount,
                total_due,
                paid_amount,
                is_cleared,
                on_chain_assessment_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00, FALSE, $9)
            RETURNING *
        `;

        const result = await pool.query(insertSql, [
            property.id,
            property.nft_token_id || '1',
            property.property_code,
            financial_year,
            base_tax_amount,
            cess_amount,
            penalty_amount,
            totalDue,
            onChainAssessmentId,
        ]);

        if (res.headersSent) return;
        return res.status(201).json({
            success: true,
            data: {
                ...result.rows[0],
                txHash,
            },
        });
    } catch (err) {
        if (res.headersSent) return;
        next(err);
    }
};

/**
 * Pay Property Tax & Auto-Issue Cryptographic 1-Year NOC
 * POST /api/tax/:assessmentId/pay
 */
const payTax = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const payerWallet = (req.user.wallet_address || req.user.walletAddress || '').toLowerCase();

        const taxRes = await pool.query(
            `SELECT t.*, p.nft_token_id, p.property_code
             FROM property_taxes t
             JOIN properties p ON t.property_id = p.id
             WHERE t.id = $1`,
            [assessmentId]
        );

        if (taxRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Tax assessment record not found' });
        }

        const assessment = taxRes.rows[0];

        if (assessment.is_cleared) {
            return res.status(400).json({ success: false, error: 'This property tax assessment has already been cleared' });
        }

        const receiptHash = `REC-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
        const certificateHash = `NOC-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

        // Call on-chain NOC issuance
        let txHash = null;
        try {
            const chainResult = await contractService.issueTaxClearanceNOCOnChain(
                assessment.nft_token_id || assessment.token_id || '1',
                assessment.property_code,
                assessment.financial_year,
                31536000, // 1 year in seconds
                certificateHash
            );
            txHash = chainResult.txHash;
        } catch (chainErr) {
            console.warn('Blockchain issueTaxClearanceNOC warning:', chainErr.message);
        }

        // Persist settlement & NOC record in DB
        const result = await withTransaction(async (client) => {
            const updateTax = await client.query(
                `UPDATE property_taxes
                 SET is_cleared = TRUE,
                     paid_amount = total_due,
                     payment_receipt_hash = $1,
                     paid_by_wallet = $2,
                     paid_at = NOW()
                 WHERE id = $3
                 RETURNING *`,
                [receiptHash, payerWallet, assessmentId]
            );

            const insertNoc = await client.query(
                `INSERT INTO tax_clearance_nocs (
                    property_id,
                    token_id,
                    property_code,
                    financial_year,
                    valid_until,
                    issued_by_wallet,
                    certificate_hash,
                    is_revoked
                ) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 year', $5, $6, FALSE)
                RETURNING *`,
                [
                    assessment.property_id,
                    assessment.nft_token_id || assessment.token_id || '1',
                    assessment.property_code,
                    assessment.financial_year,
                    payerWallet,
                    certificateHash,
                ]
            );

            return {
                tax: updateTax.rows[0],
                noc: insertNoc.rows[0],
            };
        });

        if (res.headersSent) return;
        return res.json({
            success: true,
            data: {
                ...result,
                txHash,
            },
        });
    } catch (err) {
        if (res.headersSent) return;
        next(err);
    }
};

/**
 * Get NOC Certificate by ID
 * GET /api/tax/noc/:id
 */
const getNOCById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const nocRes = await pool.query(
            `SELECT n.*, p.survey_number, p.address_line, p.district, p.state, p.area_sqft, p.owner_wallet
             FROM tax_clearance_nocs n
             JOIN properties p ON n.property_id = p.id
             WHERE n.id = $1`,
            [id]
        );

        if (nocRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Tax Clearance NOC not found' });
        }

        return res.json({
            success: true,
            data: nocRes.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPropertiesWithTaxes,
    getPropertyTaxDetails,
    recordAssessment,
    payTax,
    getNOCById,
};
