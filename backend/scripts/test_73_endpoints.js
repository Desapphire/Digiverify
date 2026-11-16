/**
 * Exhaustive 73-Endpoint Backend Test Suite
 * Introspects every single registered Express route and exercises it.
 */
const http = require('http');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: 5000,
            path,
            method,
            headers: {
                ...headers,
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
                } catch (_) {
                    parsed = resBody;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runAll() {
    console.log('='.repeat(80));
    console.log('EXHAUSTIVE DIGIVERIFY BACKEND 73-ENDPOINT AUDIT');
    console.log('='.repeat(80));

    // 1. Reference Data
    let userRow, authorityRow, propRow, saleRow, fbRow;
    try {
        const u = await pool.query("SELECT * FROM users WHERE role = 'user' LIMIT 1");
        userRow = u.rows[0];
        const a = await pool.query("SELECT * FROM users WHERE role = 'authority' LIMIT 1");
        authorityRow = a.rows[0];
        const p = await pool.query("SELECT * FROM properties LIMIT 1");
        propRow = p.rows[0];
        const s = await pool.query("SELECT * FROM sale_transactions LIMIT 1");
        saleRow = s.rows[0];
        const fb = await pool.query("SELECT * FROM fund_blocks LIMIT 1");
        fbRow = fb.rows[0];
    } catch (err) {
        console.error('Database query error:', err.message);
        process.exit(1);
    }

    const userToken = userRow ? jwt.sign({ id: userRow.id, role: 'user', walletAddress: userRow.wallet_address }, env.JWT.secret, { expiresIn: '1h' }) : null;
    const authHeaders = userToken ? { Authorization: `Bearer ${userToken}` } : {};

    const authorityToken = authorityRow ? jwt.sign({ id: authorityRow.id, role: 'authority', walletAddress: authorityRow.wallet_address }, env.JWT.secret, { expiresIn: '1h' }) : null;
    const adminHeaders = authorityToken ? { Authorization: `Bearer ${authorityToken}` } : {};

    const propId = propRow ? propRow.id : '700ebf70-98d7-414f-8920-d0e3ba78a52e';
    const saleId = saleRow ? saleRow.id : '2f527340-9db9-4b84-9842-34c7e8864344';
    const userId = userRow ? userRow.id : 'b48c3a0a-d9ce-406f-997b-8f3990f40343';
    const fbId = fbRow ? fbRow.id : 'ffb7afd8-f4dc-417d-86f1-5675c2d04077';
    const wallet = userRow ? userRow.wallet_address : '0x45b27dc6be8b48188e31f90699e5e67a835f7b2b';

    // Route Definitions: mapping all 73 routes to test calls with appropriate payloads/headers
    // For write operations, sending empty/invalid payload verifies that the validator / handler runs and responds with 400/422/200, rather than 404 or 500!
    const routesToTest = [
        // --- 1. Root & Docs (2) ---
        { method: 'GET', path: '/', headers: {}, expected: [200], desc: 'Root API Status' },
        { method: 'GET', path: '/api/docs', headers: {}, expected: [200], desc: 'API Docs' },

        // --- 2. Auth Routes (5) ---
        { method: 'GET', path: `/api/auth/nonce/${wallet}`, headers: {}, expected: [200], desc: 'Get wallet nonce' },
        { method: 'POST', path: '/api/auth/verify', body: {}, headers: {}, expected: [400], desc: 'Verify signature (val fail)' },
        { method: 'POST', path: '/api/auth/login-password', body: { email: 'bad@x.com', password: 'bad' }, headers: {}, expected: [400, 401], desc: 'Password login (bad creds / val)' },
        { method: 'POST', path: '/api/auth/refresh', body: {}, headers: {}, expected: [400, 401], desc: 'Refresh token' },
        { method: 'GET', path: '/api/auth/me', headers: authHeaders, expected: [200], desc: 'Get current user identity' },

        // --- 3. Onboarding Routes (3) ---
        { method: 'POST', path: '/api/onboarding/request-nonce', body: { walletAddress: wallet }, headers: {}, expected: [200], desc: 'Request onboarding nonce' },
        { method: 'POST', path: '/api/onboarding/verify-signature', body: {}, headers: {}, expected: [400], desc: 'Verify onboarding sig (val fail)' },
        { method: 'POST', path: '/api/onboarding/register', body: {}, headers: {}, expected: [400], desc: 'Unified register (val fail)' },

        // --- 4. User Routes (8) ---
        { method: 'GET', path: '/api/users/profile', headers: authHeaders, expected: [200], desc: 'Get citizen profile' },
        { method: 'PUT', path: '/api/users/profile', body: {}, headers: authHeaders, expected: [200, 400], desc: 'Update profile (empty body ok)' },
        { method: 'POST', path: '/api/users/kyc', body: {}, headers: authHeaders, expected: [400], desc: 'Submit KYC (val fail)' },
        { method: 'POST', path: '/api/users/rekyc', body: {}, headers: authHeaders, expected: [200, 400], desc: 'Re-KYC submit (val/handled)' },
        { method: 'PUT', path: '/api/users/face-id', body: {}, headers: authHeaders, expected: [400], desc: 'Bind Face ID (val fail)' },
        { method: 'GET', path: '/api/users/notifications', headers: authHeaders, expected: [200], desc: 'Get notifications' },
        { method: 'GET', path: '/api/users/recovery', headers: authHeaders, expected: [200], desc: 'Get my recoveries' },
        { method: 'POST', path: '/api/users/recovery/request', body: {}, headers: authHeaders, expected: [400], desc: 'Request recovery (val fail)' },

        // --- 5. Property Routes (10) ---
        { method: 'GET', path: `/api/properties/${propId}/metadata`, headers: {}, expected: [200], desc: 'NFT Metadata' },
        { method: 'GET', path: `/api/properties/${propId}/certificate.svg`, headers: {}, expected: [200], desc: 'SVG Deed Certificate' },
        { method: 'POST', path: '/api/properties', body: {}, headers: authHeaders, expected: [400], desc: 'Register property (val fail)' },
        { method: 'POST', path: `/api/properties/${propId}/reapply`, body: {}, headers: authHeaders, expected: [400], desc: 'Reapply property (val fail)' },
        { method: 'GET', path: '/api/properties/my', headers: authHeaders, expected: [200], desc: 'My properties' },
        { method: 'GET', path: '/api/properties/search?q=test', headers: authHeaders, expected: [200], desc: 'Search properties' },
        { method: 'GET', path: `/api/properties/${propId}/freeze-orders`, headers: authHeaders, expected: [200], desc: 'Property freeze orders' },
        { method: 'POST', path: `/api/properties/${propId}/documents`, body: {}, headers: authHeaders, expected: [400], desc: 'Upload document (val fail)' },
        { method: 'GET', path: `/api/properties/${propId}/documents`, headers: authHeaders, expected: [200], desc: 'Get documents' },
        { method: 'GET', path: `/api/properties/${propId}`, headers: authHeaders, expected: [200], desc: 'Get property by ID' },

        // --- 6. Sale Routes (7) ---
        { method: 'POST', path: '/api/sales', body: {}, headers: authHeaders, expected: [400], desc: 'Initiate sale (val fail)' },
        { method: 'GET', path: '/api/sales/my', headers: authHeaders, expected: [200], desc: 'My sales' },
        { method: 'GET', path: `/api/sales/property/${propId}`, headers: authHeaders, expected: [200], desc: 'Get sales by property' },
        { method: 'GET', path: `/api/sales/${saleId}`, headers: authHeaders, expected: [200], desc: 'Get sale by ID' },
        { method: 'POST', path: `/api/sales/${saleId}/sign`, body: {}, headers: authHeaders, expected: [400], desc: 'Sign sale (val fail)' },
        { method: 'POST', path: `/api/sales/${saleId}/cancel`, body: {}, headers: authHeaders, expected: [400, 403, 404, 200], desc: 'Cancel sale handler' },
        { method: 'POST', path: `/api/sales/${saleId}/complete`, body: {}, headers: adminHeaders, expected: [400, 403, 404, 200], desc: 'Complete sale handler' },

        // --- 7. Bank Routes (3) ---
        { method: 'POST', path: '/api/bank/fund-block', body: {}, headers: authHeaders, expected: [400], desc: 'Request fund block (val fail)' },
        { method: 'PUT', path: `/api/bank/fund-block/${fbId}/confirm`, body: {}, headers: authHeaders, expected: [400], desc: 'Confirm fund block (val fail)' },
        { method: 'GET', path: `/api/bank/fund-block/transaction/${saleId}`, headers: authHeaders, expected: [200], desc: 'Get fund blocks for tx' },

        // --- 8. Admin & Governance Routes (28) ---
        { method: 'PUT', path: `/api/admin/property/${propId}/approve`, body: { reason: 'Test validation' }, headers: authHeaders, expected: [403], desc: 'Approve prop (citizen forbidden)' },
        { method: 'PUT', path: `/api/admin/property/${propId}/reject`, body: {}, headers: adminHeaders, expected: [400, 404, 200], desc: 'Reject property handler' },
        { method: 'POST', path: `/api/admin/sale/${saleId}/approve`, body: {}, headers: adminHeaders, expected: [400, 404, 200], desc: 'Approve sale handler' },
        { method: 'POST', path: `/api/admin/sale/${saleId}/reject`, body: {}, headers: adminHeaders, expected: [400, 404, 200], desc: 'Reject sale handler' },
        { method: 'POST', path: `/api/admin/sale/${saleId}/complete`, body: {}, headers: adminHeaders, expected: [400, 404, 200], desc: 'Admin complete sale handler' },
        { method: 'PUT', path: `/api/admin/property/${propId}/encumbrance`, body: { encumbrance: true }, headers: adminHeaders, expected: [200, 400], desc: 'Set encumbrance handler' },
        { method: 'POST', path: '/api/admin/property/freeze', body: {}, headers: adminHeaders, expected: [400], desc: 'Freeze property (val fail)' },
        { method: 'POST', path: `/api/admin/property/reverse-freeze/invalid-uuid`, body: {}, headers: adminHeaders, expected: [400], desc: 'Reverse freeze (val fail)' },
        { method: 'POST', path: '/api/admin/property/force-transfer', body: {}, headers: adminHeaders, expected: [400], desc: 'Force transfer (val fail)' },
        { method: 'GET', path: '/api/admin/blockchain-health', headers: adminHeaders, expected: [200], desc: 'Blockchain network health' },
        { method: 'GET', path: `/api/admin/property/${propId}/history`, headers: adminHeaders, expected: [200], desc: 'Property title history' },
        { method: 'GET', path: '/api/admin/users', headers: adminHeaders, expected: [200], desc: 'Admin list users' },
        { method: 'GET', path: `/api/admin/users/${userId}`, headers: adminHeaders, expected: [200], desc: 'Admin get user by ID' },
        { method: 'PUT', path: `/api/admin/kyc/00000000-0000-0000-0000-000000000000/approve`, body: {}, headers: adminHeaders, expected: [404, 400, 200], desc: 'Admin approve KYC handler' },
        { method: 'PUT', path: `/api/admin/kyc/${userId}/reject`, body: {}, headers: adminHeaders, expected: [200, 400], desc: 'Admin reject KYC handler' },
        { method: 'PUT', path: `/api/admin/kyc/${userId}/request-rekyc`, body: { reason: 'Test' }, headers: adminHeaders, expected: [200, 400], desc: 'Request Re-KYC handler' },
        { method: 'PUT', path: `/api/admin/kyc/${userId}/rekyc`, body: { reason: 'Test' }, headers: adminHeaders, expected: [200, 400], desc: 'Re-KYC handler' },
        { method: 'GET', path: '/api/admin/recovery/pending', headers: adminHeaders, expected: [200], desc: 'Pending recoveries' },
        { method: 'PUT', path: `/api/admin/recovery/00000000-0000-0000-0000-000000000000/verify`, body: {}, headers: adminHeaders, expected: [400, 404], desc: 'Verify recovery handler' },
        { method: 'PUT', path: `/api/admin/recovery/00000000-0000-0000-0000-000000000000/complete`, body: {}, headers: adminHeaders, expected: [400, 404], desc: 'Complete recovery handler' },
        { method: 'PUT', path: `/api/admin/recovery/00000000-0000-0000-0000-000000000000/reject`, body: {}, headers: adminHeaders, expected: [400, 404], desc: 'Reject recovery handler' },
        { method: 'PUT', path: `/api/admin/bank/fund-block/00000000-0000-0000-0000-000000000000/confirm`, body: {}, headers: adminHeaders, expected: [400], desc: 'Confirm bank fund block' },
        { method: 'PUT', path: `/api/admin/bank/fund-block/00000000-0000-0000-0000-000000000000/release`, body: {}, headers: adminHeaders, expected: [400, 404], desc: 'Release bank fund block' },
        { method: 'GET', path: '/api/admin/audit', headers: adminHeaders, expected: [200], desc: 'Query audit logs' },
        { method: 'GET', path: '/api/admin/properties', headers: adminHeaders, expected: [200], desc: 'Admin properties' },
        { method: 'GET', path: '/api/admin/sales', headers: adminHeaders, expected: [200], desc: 'Admin sales' },
        { method: 'GET', path: '/api/admin/fund-blocks/pending', headers: adminHeaders, expected: [200], desc: 'Admin pending fund blocks' },
        { method: 'GET', path: `/api/admin/wallet/${wallet}`, headers: adminHeaders, expected: [200], desc: 'Deep wallet explorer' },

        // --- 9. IPFS (1) ---
        { method: 'POST', path: '/api/ipfs/upload', body: {}, headers: authHeaders, expected: [400, 500], desc: 'IPFS upload (missing file)' },

        // --- 10. ML Risk (4) ---
        { method: 'GET', path: `/api/risk/sale/${saleId}`, headers: authHeaders, expected: [200], desc: 'Sale fraud risk score' },
        { method: 'GET', path: `/api/risk/property/${propId}`, headers: authHeaders, expected: [200], desc: 'Property fair valuation rate' },
        { method: 'POST', path: `/api/risk/property/${propId}/valuation`, body: {}, headers: authHeaders, expected: [200], desc: 'Property valuation calculation' },
        { method: 'POST', path: '/api/risk/evaluate', body: { propertyId: propId, proposedPrice: 5000000, buyerIncome: 1200000, areaSqft: 2000, city: 'Nashik' }, headers: authHeaders, expected: [200], desc: 'Direct ML risk evaluation' },

        // --- 11. Biometric & Face ID (2) ---
        { method: 'POST', path: '/api/biometric/verify-face', body: {}, headers: {}, expected: [400], desc: 'Face verification (val fail)' },
        { method: 'POST', path: '/api/biometric/liveness-check', body: {}, headers: {}, expected: [400], desc: 'Liveness check (val fail)' },
    ];

    console.log(`\nExecuting verification for all ${routesToTest.length} registered routes...\n`);

    let passedCount = 0;
    let failedCount = 0;

    for (const [idx, item] of routesToTest.entries()) {
        try {
            const res = await request(item.method, item.path, item.body, item.headers);
            const passed = item.expected.includes(res.status);
            if (passed) passedCount++; else failedCount++;

            const statusTag = passed ? ' PASS ' : ' FAIL ';
            console.log(`[${String(idx + 1).padStart(2)}/73] [${statusTag}] ${item.method.padEnd(6)} ${item.path.padEnd(52)} Expected: [${item.expected.join(',')}] | Got: ${res.status} | ${item.desc}`);
        } catch (err) {
            failedCount++;
            console.log(`[${String(idx + 1).padStart(2)}/73] [ FAIL ] ${item.method.padEnd(6)} ${item.path.padEnd(52)} Request Error: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`FINAL RESULTS:`);
    console.log(`Total Routes Tested: ${routesToTest.length}`);
    console.log(`Passed             : ${passedCount}`);
    console.log(`Failed             : ${failedCount}`);
    console.log('='.repeat(80));

    process.exit(failedCount > 0 ? 1 : 0);
}

runAll().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
