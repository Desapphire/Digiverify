/**
 * ML Risk Service — Digiverify Property & AML Fraud Assessment Bridge
 * Interfaces with the Python Machine Learning Risk Engine.
 */

const { spawn } = require('child_process');
const path = require('path');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

const MODEL_DIR = path.resolve(__dirname, '../../model');
const SCRIPT_PATH = path.join(MODEL_DIR, 'score_api.py');
const PYTHON_CMD = process.env.PYTHON_PATH || 'python';

/**
 * Execute the Python scoring engine with a JSON payload.
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
const runModelScoring = (payload) => {
    return new Promise((resolve, reject) => {
        let isTimedOut = false;
        const jsonString = JSON.stringify(payload);
        const child = spawn(PYTHON_CMD, [SCRIPT_PATH], {
            cwd: MODEL_DIR,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            timeout: 8000, // 8-second execution timeout
        });

        const killTimer = setTimeout(() => {
            isTimedOut = true;
            try {
                child.kill('SIGKILL');
            } catch (_) {}
        }, 8500);

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (chunk) => {
            stdoutData += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
            stderrData += chunk.toString();
        });

        child.on('error', (err) => {
            clearTimeout(killTimer);
            reject(new AppError(`Failed to execute ML risk model: ${err.message}`, 500));
        });

        child.on('close', (code, signal) => {
            clearTimeout(killTimer);
            if (isTimedOut || signal === 'SIGTERM' || signal === 'SIGKILL') {
                return reject(new AppError('ML risk model inference timed out after 8 seconds.', 504));
            }
            if (code !== 0) {
                return reject(new AppError(`ML model failed with code ${code}: ${stderrData || stdoutData}`, 500));
            }

            try {
                const response = JSON.parse(stdoutData.trim());
                if (!response.success) {
                    return reject(new AppError(response.error || 'ML model evaluation failed', 500));
                }
                resolve(response.data);
            } catch (parseErr) {
                reject(new AppError(`Invalid JSON from ML model output: ${stdoutData}`, 500));
            }
        });

        // Pass JSON payload via stdin
        child.stdin.write(jsonString);
        child.stdin.end();
    });
};

/**
 * Assess risk for an existing sale transaction by fetching property and buyer history.
 * @param {string} saleId 
 * @returns {Promise<Object>}
 */
const assessSaleTransaction = async (saleId) => {
    const saleResult = await pool.query(
        `SELECT st.*, 
                p.property_code, p.survey_number, p.survey_details, 
                p.area_sqft, p.district, p.state, p.address_line,
                u.created_at AS buyer_created_at
         FROM sale_transactions st
         JOIN properties p ON st.property_id = p.id
         LEFT JOIN users u ON LOWER(st.buyer_wallet) = LOWER(u.wallet_address)
         WHERE st.id = $1 LIMIT 1`,
        [saleId]
    );

    if (saleResult.rows.length === 0) {
        throw new AppError('Sale transaction not found for risk evaluation.', 404);
    }

    const sale = saleResult.rows[0];
    const buyerWallet = sale.buyer_wallet ? sale.buyer_wallet.toLowerCase() : '';

    // Aggregate buyer historical transaction behavior from database
    let transactions90d = 1;
    let avgTxValue = parseFloat(sale.sale_price) || 5000000;
    let walletAgeDays = 365;
    let counterpartyCount = 1;

    if (buyerWallet) {
        // Transactions in last 90 days
        const tx90dRes = await pool.query(
            `SELECT COUNT(*)::int AS count, COALESCE(AVG(sale_price), 0)::float AS avg_val
             FROM sale_transactions
             WHERE (LOWER(buyer_wallet) = $1 OR LOWER(seller_wallet) = $1)
               AND created_at >= NOW() - INTERVAL '90 days'`,
            [buyerWallet]
        );
        if (tx90dRes.rows.length > 0) {
            transactions90d = Math.max(1, tx90dRes.rows[0].count);
            if (tx90dRes.rows[0].avg_val > 0) {
                avgTxValue = tx90dRes.rows[0].avg_val;
            }
        }

        // Distinct counterparties
        const counterpartyRes = await pool.query(
            `SELECT COUNT(DISTINCT seller_wallet)::int AS count
             FROM sale_transactions
             WHERE LOWER(buyer_wallet) = $1`,
            [buyerWallet]
        );
        if (counterpartyRes.rows.length > 0) {
            counterpartyCount = Math.max(1, counterpartyRes.rows[0].count);
        }

        // Wallet registration age
        if (sale.buyer_created_at) {
            const ageMs = Date.now() - new Date(sale.buyer_created_at).getTime();
            walletAgeDays = Math.max(1, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
        }
    }

    // Parse BHK if present in survey details or default to 3
    let bhk = '3 BHK';
    if (sale.survey_details) {
        const match = sale.survey_details.match(/(\d+)\s*BHK/i);
        if (match) bhk = `${match[1]} BHK`;
    }

    const payload = {
        city: sale.district || sale.state || 'Ahmedabad',
        bhk,
        size_sqft: parseFloat(sale.area_sqft) || 1500,
        rera: true,
        price: parseFloat(sale.sale_price) || 5000000,
        transaction_value: parseFloat(sale.sale_price) || 5000000,
        buyer_annual_income: (parseFloat(sale.sale_price) || 5000000) * 0.4, // Baseline income estimate if unstated
        transactions_90d: transactions90d,
        avg_transaction_value: avgTxValue,
        wallet_age_days: walletAgeDays,
        counterparty_count: counterpartyCount,
    };

    const riskReport = await runModelScoring(payload);

    // Persist calculated risk score into database for fast filtering
    try {
        await pool.query(
            `UPDATE sale_transactions 
             SET risk_score = $1, risk_level = $2, risk_report = $3, updated_at = NOW() 
             WHERE id = $4`,
            [riskReport.overall_score, riskReport.risk_level, JSON.stringify(riskReport), sale.id]
        );
    } catch (dbErr) {
        console.warn('⚠️ Could not cache risk_score to database:', dbErr.message);
    }

    return {
        saleId: sale.id,
        propertyId: sale.property_id,
        propertyCode: sale.property_code,
        buyerWallet: sale.buyer_wallet,
        sellerWallet: sale.seller_wallet,
        riskScore: riskReport.overall_score,
        riskLevel: riskReport.risk_level,
        evaluatedAt: new Date().toISOString(),
        evaluationInputs: payload,
        riskReport,
    };
};

/**
 * Predict fair price and price risk for a registered property.
 * @param {string} propertyId 
 * @param {number} [proposedPrice]
 * @returns {Promise<Object>}
 */
const assessPropertyValuation = async (propertyId, proposedPrice = null) => {
    const propRes = await pool.query(
        `SELECT * FROM properties WHERE id = $1 LIMIT 1`,
        [propertyId]
    );

    if (propRes.rows.length === 0) {
        throw new AppError('Property not found.', 404);
    }

    const prop = propRes.rows[0];
    const price = proposedPrice ? parseFloat(proposedPrice) : 5000000;

    let bhk = '3 BHK';
    if (prop.survey_details) {
        const match = prop.survey_details.match(/(\d+)\s*BHK/i);
        if (match) bhk = `${match[1]} BHK`;
    }

    const payload = {
        city: prop.district || prop.state || 'Ahmedabad',
        bhk,
        size_sqft: parseFloat(prop.area_sqft) || 1500,
        rera: true,
        price,
        transaction_value: price,
        buyer_annual_income: price * 0.4,
        transactions_90d: 1,
        avg_transaction_value: price,
        wallet_age_days: 365,
        counterparty_count: 3,
    };

    const riskReport = await runModelScoring(payload);

    // Persist estimated fair price into database
    if (riskReport?.price_risk?.fair_price) {
        try {
            await pool.query(
                `UPDATE properties SET estimated_fair_price = $1, updated_at = NOW() WHERE id = $2`,
                [riskReport.price_risk.fair_price, prop.id]
            );
        } catch (dbErr) {
            console.warn('⚠️ Could not cache estimated_fair_price to database:', dbErr.message);
        }
    }

    return {
        propertyId: prop.id,
        propertyCode: prop.property_code,
        surveyNumber: prop.survey_number,
        district: prop.district,
        areaSqft: prop.area_sqft,
        fairPriceEstimated: riskReport.price_risk.fair_price,
        priceRisk: riskReport.price_risk,
        fullRiskAnalysis: riskReport,
    };
};

/**
 * Custom direct risk evaluation from provided parameters.
 * @param {Object} customParams 
 * @returns {Promise<Object>}
 */
const assessCustomRisk = async (customParams) => {
    return await runModelScoring(customParams);
};

module.exports = {
    runModelScoring,
    assessSaleTransaction,
    assessPropertyValuation,
    assessCustomRisk,
};
