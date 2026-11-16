/**
 * Succession Controller
 * Handles Legal Heir Succession Claims, Proof of Death, Partition Deeds, and On-chain Execution.
 */

const { pool, withTransaction } = require('../config/db');
const { ROLES } = require('../config/constants');
const contractService = require('../blockchain/contractService');

/**
 * File a Legal Heir Succession Claim
 * POST /api/succession/claims
 */
const fileClaim = async (req, res, next) => {
    try {
        const {
            property_id,
            deceased_owner_wallet,
            death_certificate_hash,
            probate_order_hash,
            court_bench,
            primary_successor_wallet,
            heirs,
        } = req.body;

        // Verify property exists
        const propRes = await pool.query(
            'SELECT id, property_code, nft_token_id, owner_wallet, status FROM properties WHERE id = $1',
            [property_id]
        );
        if (propRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }
        const property = propRes.rows[0];

        // Ensure shares sum to 10000 bps (100.00%)
        const totalBps = heirs.reduce((sum, h) => sum + Number(h.share_percentage_bps), 0);
        if (totalBps !== 10000) {
            return res.status(400).json({
                success: false,
                error: `Total heir partition shares must equal 10,000 basis points (100.00%). Current sum: ${totalBps} bps`,
            });
        }

        // Default primary successor to the heir with the highest share if not specified
        let primaryWallet = primary_successor_wallet;
        if (!primaryWallet) {
            const sorted = [...heirs].sort((a, b) => b.share_percentage_bps - a.share_percentage_bps);
            primaryWallet = sorted[0].heir_wallet;
        }

        // Interact on-chain via contractService
        let onChainCaseId = null;
        let txHash = null;
        try {
            const result = await contractService.fileSuccessionClaimOnChain(
                property.nft_token_id || '1',
                property.property_code,
                deceased_owner_wallet,
                death_certificate_hash,
                probate_order_hash || '',
                court_bench || 'High Court Revenue Bench',
                heirs.map(h => ({
                    heirAddress: h.heir_wallet,
                    fullName: h.full_name,
                    relationToDeceased: h.relation_to_deceased,
                    sharePercentageBps: h.share_percentage_bps,
                    kycHash: h.kyc_hash || 'QmMockLegalHeirKyc',
                }))
            );
            onChainCaseId = result.caseId || String(Date.now());
            txHash = result.txHash;
        } catch (chainErr) {
            console.warn('Blockchain succession filing warning:', chainErr.message);
            onChainCaseId = String(Date.now());
        }

        // Persist into database within transaction
        const savedClaim = await withTransaction(async (client) => {
            const insertClaimSql = `
                INSERT INTO succession_claims (
                    property_id,
                    token_id,
                    property_code,
                    deceased_owner_wallet,
                    death_certificate_hash,
                    probate_order_hash,
                    court_bench,
                    total_heirs,
                    status,
                    primary_successor_wallet,
                    on_chain_case_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review', $9, $10)
                RETURNING *
            `;
            const claimResult = await client.query(insertClaimSql, [
                property.id,
                property.nft_token_id || '1',
                property.property_code,
                deceased_owner_wallet.toLowerCase(),
                death_certificate_hash,
                probate_order_hash || null,
                court_bench || 'High Court Revenue Bench',
                heirs.length,
                primaryWallet.toLowerCase(),
                onChainCaseId,
            ]);

            const claim = claimResult.rows[0];

            for (const heir of heirs) {
                await client.query(
                    `INSERT INTO succession_heirs (
                        claim_id,
                        heir_wallet,
                        full_name,
                        relation_to_deceased,
                        share_percentage_bps,
                        kyc_hash,
                        is_identity_verified
                    ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
                    [
                        claim.id,
                        heir.heir_wallet.toLowerCase(),
                        heir.full_name,
                        heir.relation_to_deceased,
                        heir.share_percentage_bps,
                        heir.kyc_hash || 'QmMockLegalHeirKyc',
                    ]
                );
            }

            return claim;
        });

        // Retrieve heirs for response
        const heirsRes = await pool.query(
            'SELECT * FROM succession_heirs WHERE claim_id = $1 ORDER BY share_percentage_bps DESC',
            [savedClaim.id]
        );

        if (res.headersSent) return;
        return res.status(201).json({
            success: true,
            data: {
                ...savedClaim,
                heirs: heirsRes.rows,
                txHash,
            },
        });
    } catch (err) {
        if (res.headersSent) return;
        next(err);
    }
};

/**
 * List Succession Claims (Citizen views their claims, Admin views all)
 * GET /api/succession/claims
 */
const getClaims = async (req, res, next) => {
    try {
        const isOfficer = [ROLES.AUTHORITY, ROLES.SUPER_ADMIN].includes(req.user.role);
        const userWallet = (req.user.wallet_address || req.user.walletAddress || '').toLowerCase();

        let query;
        let params = [];

        if (isOfficer) {
            query = `
                SELECT c.*, p.survey_number, p.district, p.state, p.address_line, p.area_sqft
                FROM succession_claims c
                JOIN properties p ON c.property_id = p.id
                ORDER BY c.created_at DESC
            `;
        } else {
            query = `
                SELECT DISTINCT c.*, p.survey_number, p.district, p.state, p.address_line, p.area_sqft
                FROM succession_claims c
                JOIN properties p ON c.property_id = p.id
                LEFT JOIN succession_heirs h ON c.id = h.claim_id
                WHERE LOWER(c.deceased_owner_wallet) = $1
                   OR LOWER(c.primary_successor_wallet) = $1
                   OR LOWER(h.heir_wallet) = $1
                ORDER BY c.created_at DESC
            `;
            params = [userWallet];
        }

        const result = await pool.query(query, params);

        // Fetch heirs for each claim
        const claimsWithHeirs = await Promise.all(
            result.rows.map(async (claim) => {
                const heirs = await pool.query(
                    'SELECT * FROM succession_heirs WHERE claim_id = $1 ORDER BY share_percentage_bps DESC',
                    [claim.id]
                );
                return { ...claim, heirs: heirs.rows };
            })
        );

        return res.json({
            success: true,
            data: claimsWithHeirs,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get claim details by ID
 * GET /api/succession/claims/:id
 */
const getClaimById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const claimRes = await pool.query(
            `SELECT c.*, p.survey_number, p.district, p.state, p.address_line, p.area_sqft, p.owner_wallet
             FROM succession_claims c
             JOIN properties p ON c.property_id = p.id
             WHERE c.id = $1`,
            [id]
        );

        if (claimRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Succession claim not found' });
        }

        const claim = claimRes.rows[0];
        const heirsRes = await pool.query(
            'SELECT * FROM succession_heirs WHERE claim_id = $1 ORDER BY share_percentage_bps DESC',
            [id]
        );

        return res.json({
            success: true,
            data: {
                ...claim,
                heirs: heirsRes.rows,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Approve Succession Claim (Revenue Officer)
 * PUT /api/succession/claims/:id/approve
 */
const approveClaim = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const claimRes = await pool.query('SELECT * FROM succession_claims WHERE id = $1', [id]);
        if (claimRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Succession claim not found' });
        }
        const claim = claimRes.rows[0];

        if (claim.status !== 'pending_review') {
            return res.status(400).json({
                success: false,
                error: `Claim cannot be approved in its current status: ${claim.status}`,
            });
        }

        // On-chain approval
        let txHash = null;
        try {
            if (claim.on_chain_case_id) {
                const chainResult = await contractService.approveSuccessionOnChain(
                    claim.on_chain_case_id,
                    remarks || 'Verified and approved by Revenue Officer'
                );
                txHash = chainResult.txHash;
            }
        } catch (chainErr) {
            console.warn('Blockchain approveSuccession warning:', chainErr.message);
        }

        const updateRes = await pool.query(
            `UPDATE succession_claims
             SET status = 'approved',
                 officer_remarks = $1
             WHERE id = $2
             RETURNING *`,
            [remarks || 'Verified and approved by Revenue Officer', id]
        );

        if (res.headersSent) return;
        return res.json({
            success: true,
            data: {
                ...updateRes.rows[0],
                txHash,
            },
        });
    } catch (err) {
        if (res.headersSent) return;
        next(err);
    }
};

/**
 * Execute Succession Claim & Partition Title (Revenue Officer)
 * PUT /api/succession/claims/:id/execute
 */
const executeClaim = async (req, res, next) => {
    try {
        const { id } = req.params;

        const claimRes = await pool.query('SELECT * FROM succession_claims WHERE id = $1', [id]);
        if (claimRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Succession claim not found' });
        }
        const claim = claimRes.rows[0];

        if (claim.status !== 'approved') {
            return res.status(400).json({
                success: false,
                error: `Claim must be approved before execution. Current status: ${claim.status}`,
            });
        }

        // On-chain execution
        let txHash = null;
        try {
            if (claim.on_chain_case_id) {
                const chainResult = await contractService.executeSuccessionOnChain(claim.on_chain_case_id);
                txHash = chainResult.txHash;
            }
        } catch (chainErr) {
            console.warn('Blockchain executeSuccession warning:', chainErr.message);
        }

        // Database execution & property owner update
        await withTransaction(async (client) => {
            await client.query(
                `UPDATE succession_claims
                 SET status = 'executed',
                     executed_at = NOW()
                 WHERE id = $1`,
                [id]
            );

            if (claim.primary_successor_wallet) {
                await client.query(
                    `UPDATE properties
                     SET owner_wallet = $1,
                         updated_at = NOW()
                     WHERE id = $2`,
                    [claim.primary_successor_wallet.toLowerCase(), claim.property_id]
                );
            }
        });

        const updated = await pool.query('SELECT * FROM succession_claims WHERE id = $1', [id]);

        if (res.headersSent) return;
        return res.json({
            success: true,
            data: {
                ...updated.rows[0],
                txHash,
            },
        });
    } catch (err) {
        if (res.headersSent) return;
        next(err);
    }
};

/**
 * Reject Succession Claim
 * PUT /api/succession/claims/:id/reject
 */
const rejectClaim = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const updateRes = await pool.query(
            `UPDATE succession_claims
             SET status = 'rejected',
                 officer_remarks = $1
             WHERE id = $2
             RETURNING *`,
            [remarks || 'Succession claim rejected by Revenue Authority', id]
        );

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Claim not found' });
        }

        return res.json({
            success: true,
            data: updateRes.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    fileClaim,
    getClaims,
    getClaimById,
    approveClaim,
    executeClaim,
    rejectClaim,
};
