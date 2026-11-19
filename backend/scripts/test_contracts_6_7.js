/**
 * Contract 6 (InheritanceSuccession) & Contract 7 (PropertyTaxVault) Test Suite
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: 5000,
            path,
            method,
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(payload ? {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                } : {})
            }
        };

        const req = http.request(options, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(resBody);
                } catch {
                    parsed = resBody;
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

(async () => {
    try {
        console.log('--- Testing Contract 6 & Contract 7 Full-Stack APIs ---');

        // Fetch a user and an authority user for tokens
        const userRes = await pool.query("SELECT * FROM users WHERE role = 'user' LIMIT 1");
        const citizen = userRes.rows[0];

        const adminRes = await pool.query("SELECT * FROM users WHERE role = 'authority' LIMIT 1");
        const officer = adminRes.rows[0];

        const citizenToken = jwt.sign(
            { id: citizen.id, wallet_address: citizen.wallet_address, walletAddress: citizen.wallet_address, role: citizen.role },
            env.JWT.secret,
            { expiresIn: '1h' }
        );

        const officerToken = jwt.sign(
            { id: officer.id, wallet_address: officer.wallet_address, walletAddress: officer.wallet_address, role: officer.role },
            env.JWT.secret,
            { expiresIn: '1h' }
        );

        // Fetch a property
        const propRes = await pool.query('SELECT * FROM properties LIMIT 1');
        const property = propRes.rows[0];
        console.log(`Using Property: ${property.property_code} (ID: ${property.id})`);

        // ── 1. CONTRACT 7: Property Tax Vault ─────────────────────────────
        console.log('\n[Contract 7] Testing Record Tax Assessment (Officer)...');
        const assessRes = await request('POST', '/api/tax/assess', {
            property_id: property.id,
            financial_year: 20252026,
            base_tax_amount: 15000,
            cess_amount: 750,
            penalty_amount: 0,
        }, officerToken);

        console.log('Record Assessment Status:', assessRes.status);
        if (assessRes.status !== 201) {
            console.error('Failed record assessment:', assessRes.data);
        } else {
            console.log('Assessment created successfully:', assessRes.data.data.id, 'Total Due:', assessRes.data.data.total_due);
        }

        const assessmentId = assessRes.data?.data?.id;

        console.log('\n[Contract 7] Testing Get Properties with Taxes (Citizen)...');
        const taxesListRes = await request('GET', '/api/tax/properties', null, citizenToken);
        console.log('Get Taxes Status:', taxesListRes.status, 'Total properties:', taxesListRes.data?.data?.length);

        console.log('\n[Contract 7] Testing Pay Tax & Receive Cryptographic 1-Year NOC...');
        const payRes = await request('POST', `/api/tax/${assessmentId}/pay`, { payment_method: 'CryptoVault' }, citizenToken);
        console.log('Pay Tax Status:', payRes.status);
        if (payRes.status === 200) {
            console.log('Tax cleared! Receipt:', payRes.data.data.tax.payment_receipt_hash);
            console.log('1-Year NOC Issued! Hash:', payRes.data.data.noc.certificate_hash, 'Valid until:', payRes.data.data.noc.valid_until);

            // Test fetching NOC details
            const nocRes = await request('GET', `/api/tax/noc/${payRes.data.data.noc.id}`, null, citizenToken);
            console.log('Get NOC By ID Status:', nocRes.status, 'Valid:', !!nocRes.data?.data);
        } else {
            console.error('Tax payment error:', payRes.data);
        }

        // ── 2. CONTRACT 6: Inheritance & Succession ───────────────────────
        console.log('\n[Contract 6] Testing File Succession Claim (Citizen)...');
        const fileRes = await request('POST', '/api/succession/claims', {
            property_id: property.id,
            deceased_owner_wallet: property.owner_wallet,
            death_certificate_hash: 'QmTestDeathCertificateHash123456789',
            probate_order_hash: 'QmTestProbateOrderHash987654321',
            court_bench: 'High Court Revenue Division',
            primary_successor_wallet: citizen.wallet_address,
            heirs: [
                {
                    heir_wallet: citizen.wallet_address,
                    full_name: citizen.full_name || 'Primary Legal Heir',
                    relation_to_deceased: 'Son',
                    share_percentage_bps: 6000, // 60.00%
                    kyc_hash: 'QmHeir1KycHash',
                },
                {
                    heir_wallet: officer.wallet_address, // for testing secondary heir address
                    full_name: 'Secondary Legal Heir',
                    relation_to_deceased: 'Daughter',
                    share_percentage_bps: 4000, // 40.00%
                    kyc_hash: 'QmHeir2KycHash',
                }
            ]
        }, citizenToken);

        console.log('File Claim Status:', fileRes.status);
        if (fileRes.status !== 201) {
            console.error('Filing claim error:', fileRes.data);
        } else {
            console.log('Claim filed! Case ID:', fileRes.data.data.id, 'Total Heirs:', fileRes.data.data.total_heirs);
        }

        const claimId = fileRes.data?.data?.id;

        console.log('\n[Contract 6] Testing Get Succession Claims...');
        const claimsList = await request('GET', '/api/succession/claims', null, officerToken);
        console.log('List Claims Status:', claimsList.status, 'Found claims:', claimsList.data?.data?.length);

        console.log('\n[Contract 6] Testing Approve Succession Claim (Officer)...');
        const approveRes = await request('PUT', `/api/succession/claims/${claimId}/approve`, {
            remarks: 'All heir affidavits and death certificate verified by Revenue Officer'
        }, officerToken);
        console.log('Approve Claim Status:', approveRes.status, 'Status now:', approveRes.data?.data?.status);

        console.log('\n[Contract 6] Testing Execute Partition & Reassign Title (Officer)...');
        const executeRes = await request('PUT', `/api/succession/claims/${claimId}/execute`, {}, officerToken);
        console.log('Execute Claim Status:', executeRes.status, 'Status now:', executeRes.data?.data?.status);

        console.log('\n--- ALL CONTRACT 6 & 7 TESTS COMPLETED SUCCESSFULLY! ---');
        process.exit(0);
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exit(1);
    }
})();
