/**
 * Comprehensive Backend Endpoint Verification Script
 * Validates route status, response format, RBAC, and error handling.
 */
const http = require('http');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

// Helper to make HTTP requests
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

async function runTests() {
    console.log('='.repeat(80));
    console.log('DIGIVERIFY BACKEND COMPLETE ENDPOINT VERIFICATION SUITE');
    console.log('Target Server: http://127.0.0.1:5000');
    console.log('='.repeat(80));

    // 1. Fetch real test data from database
    console.log('\n[1/4] Fetching reference test data from PostgreSQL...');
    let userRow, authorityRow, bankRow, propRow, saleRow;
    try {
        const userRes = await pool.query("SELECT * FROM users WHERE role = 'user' LIMIT 1");
        userRow = userRes.rows[0];

        const authRes = await pool.query("SELECT * FROM users WHERE role = 'authority' LIMIT 1");
        authorityRow = authRes.rows[0];

        const bankRes = await pool.query("SELECT * FROM users WHERE role = 'bank_admin' LIMIT 1");
        bankRow = bankRes.rows[0];

        const propRes = await pool.query("SELECT * FROM properties LIMIT 1");
        propRow = propRes.rows[0];

        const saleRes = await pool.query("SELECT * FROM sale_transactions LIMIT 1");
        saleRow = saleRes.rows[0];

        console.log(`  Reference User: ${userRow ? userRow.email + ' (' + userRow.id + ')' : 'None found'}`);
        console.log(`  Reference Authority: ${authorityRow ? authorityRow.email + ' (' + authorityRow.id + ')' : 'None found'}`);
        console.log(`  Reference Property: ${propRow ? propRow.property_code + ' (' + propRow.id + ')' : 'None found'}`);
        console.log(`  Reference Sale: ${saleRow ? saleRow.id : 'None found'}`);
    } catch (err) {
        console.error('Failed to query test data from DB:', err.message);
        process.exit(1);
    }

    // 2. Generate valid JWT tokens for roles
    const userToken = userRow ? jwt.sign({ id: userRow.id, role: 'user', walletAddress: userRow.wallet_address }, env.JWT.secret, { expiresIn: '1h' }) : null;
    const authHeaders = userToken ? { Authorization: `Bearer ${userToken}` } : {};

    const authorityToken = authorityRow ? jwt.sign({ id: authorityRow.id, role: 'authority', walletAddress: authorityRow.wallet_address }, env.JWT.secret, { expiresIn: '1h' }) : null;
    const adminHeaders = authorityToken ? { Authorization: `Bearer ${authorityToken}` } : {};

    const testResults = [];

    function record(group, method, endpoint, expected, actual, passed, details = '') {
        const symbol = passed ? ' PASS ' : ' FAIL ';
        testResults.push({ group, method, endpoint, expected, actual, passed, details });
        console.log(`  [${symbol}] ${method.padEnd(5)} ${endpoint.padEnd(45)} Expected: ${expected} | Actual: ${actual} ${details ? '(' + details + ')' : ''}`);
    }

    console.log('\n[2/4] Testing Public & Health Endpoints...');
    {
        // GET /
        const res1 = await request('GET', '/');
        record('Public', 'GET', '/', '200', res1.status, res1.status === 200, res1.body?.network);

        // GET /api/docs
        const res2 = await request('GET', '/api/docs');
        record('Public', 'GET', '/api/docs', '200', res2.status, res2.status === 200, `${Object.keys(res2.body?.endpoints || {}).length} module groups`);

        // 404 test
        const res3 = await request('GET', '/api/nonexistent-endpoint-test');
        record('Public', 'GET', '/api/nonexistent-endpoint-test', '404', res3.status, res3.status === 404);

        // GET /api/auth/nonce/:wallet
        const testWallet = '0x45b27dc6be8b48188e31f90699e5e67a835f7b2b';
        const res4 = await request('GET', `/api/auth/nonce/${testWallet}`);
        record('Auth', 'GET', `/api/auth/nonce/:wallet`, '200', res4.status, res4.status === 200, res4.body?.data?.nonce ? 'Nonce generated' : '');

        // POST /api/onboarding/request-nonce
        const res5 = await request('POST', '/api/onboarding/request-nonce', { walletAddress: testWallet });
        record('Onboarding', 'POST', '/api/onboarding/request-nonce', '200', res5.status, res5.status === 200);

        // POST /api/auth/login-password (invalid credentials test)
        const res6 = await request('POST', '/api/auth/login-password', { email: 'nonexistent@example.com', password: 'WrongPassword123!' });
        record('Auth', 'POST', '/api/auth/login-password (bad creds)', '401', res6.status, res6.status === 401, res6.body?.message);

        // Public NFT metadata & SVG (if property exists)
        if (propRow) {
            const res7 = await request('GET', `/api/properties/${propRow.id}/metadata`);
            record('NFT Public', 'GET', `/api/properties/:id/metadata`, '200', res7.status, res7.status === 200, res7.body?.name);

            const res8 = await request('GET', `/api/properties/${propRow.id}/certificate.svg`);
            const isSvg = typeof res8.body === 'string' && res8.body.includes('<svg');
            record('NFT Public', 'GET', `/api/properties/:id/certificate.svg`, '200', res8.status, res8.status === 200 && isSvg, 'Valid SVG response');
        }
    }

    console.log('\n[3/4] Testing Authenticated User Endpoints...');
    {
        // Unauthenticated check (should reject with 401)
        const unauth1 = await request('GET', '/api/auth/me');
        record('Auth Guard', 'GET', '/api/auth/me (no token)', '401', unauth1.status, unauth1.status === 401);

        // Authenticated GET /api/auth/me
        const resMe = await request('GET', '/api/auth/me', null, authHeaders);
        record('User', 'GET', '/api/auth/me', '200', resMe.status, resMe.status === 200, resMe.body?.data?.user?.email);

        // GET /api/users/profile
        const resProf = await request('GET', '/api/users/profile', null, authHeaders);
        record('User', 'GET', '/api/users/profile', '200', resProf.status, resProf.status === 200, resProf.body?.data?.name);

        // GET /api/users/notifications
        const resNotif = await request('GET', '/api/users/notifications', null, authHeaders);
        record('User', 'GET', '/api/users/notifications', '200', resNotif.status, resNotif.status === 200, `${resNotif.body?.data?.length ?? 0} notifications`);

        // GET /api/users/recovery
        const resRec = await request('GET', '/api/users/recovery', null, authHeaders);
        record('User', 'GET', '/api/users/recovery', '200', resRec.status, resRec.status === 200);

        // GET /api/properties/my
        const resMyProps = await request('GET', '/api/properties/my', null, authHeaders);
        record('Property', 'GET', '/api/properties/my', '200', resMyProps.status, resMyProps.status === 200, `${resMyProps.body?.data?.length ?? 0} properties`);

        // GET /api/properties/search
        const resSearch = await request('GET', '/api/properties/search?q=Nashik', null, authHeaders);
        record('Property', 'GET', '/api/properties/search', '200', resSearch.status, resSearch.status === 200, `${resSearch.body?.data?.length ?? 0} results`);

        if (propRow) {
            // GET /api/properties/:id
            const resPropId = await request('GET', `/api/properties/${propRow.id}`, null, authHeaders);
            record('Property', 'GET', '/api/properties/:id', '200', resPropId.status, resPropId.status === 200, resPropId.body?.data?.propertyCode);

            // GET /api/properties/:id/documents
            const resDocs = await request('GET', `/api/properties/${propRow.id}/documents`, null, authHeaders);
            record('Property', 'GET', '/api/properties/:id/documents', '200', resDocs.status, resDocs.status === 200, `${resDocs.body?.data?.length ?? 0} documents`);

            // GET /api/properties/:id/freeze-orders
            const resFreeze = await request('GET', `/api/properties/${propRow.id}/freeze-orders`, null, authHeaders);
            record('Property', 'GET', '/api/properties/:id/freeze-orders', '200', resFreeze.status, resFreeze.status === 200);

            // GET /api/risk/property/:propertyId
            const resRiskProp = await request('GET', `/api/risk/property/${propRow.id}`, null, authHeaders);
            record('Risk', 'GET', '/api/risk/property/:id', '200', resRiskProp.status, resRiskProp.status === 200, `Fair Price: ₹${resRiskProp.body?.data?.fair_price?.toLocaleString('en-IN') || 'N/A'}`);
        }

        // GET /api/sales/my
        const resMySales = await request('GET', '/api/sales/my', null, authHeaders);
        record('Sale', 'GET', '/api/sales/my', '200', resMySales.status, resMySales.status === 200, `${resMySales.body?.data?.length ?? 0} sales`);

        if (saleRow) {
            // GET /api/sales/:id
            const resSaleId = await request('GET', `/api/sales/${saleRow.id}`, null, authHeaders);
            record('Sale', 'GET', '/api/sales/:id', '200', resSaleId.status, resSaleId.status === 200, `Price: ₹${Number(resSaleId.body?.data?.salePrice || 0).toLocaleString('en-IN')}`);

            // GET /api/risk/sale/:saleId
            const resRiskSale = await request('GET', `/api/risk/sale/${saleRow.id}`, null, authHeaders);
            record('Risk', 'GET', '/api/risk/sale/:id', '200', resRiskSale.status, resRiskSale.status === 200, `Risk: ${resRiskSale.body?.data?.risk_level || 'N/A'}`);

            // GET /api/bank/fund-block/transaction/:transactionId
            const resFb = await request('GET', `/api/bank/fund-block/transaction/${saleRow.id}`, null, authHeaders);
            record('Bank', 'GET', '/api/bank/fund-block/transaction/:id', '200', resFb.status, resFb.status === 200);
        }

        // POST /api/risk/evaluate (Direct ML risk test)
        const resRiskEval = await request('POST', '/api/risk/evaluate', {
            propertyId: propRow ? propRow.id : null,
            proposedPrice: 5000000,
            buyerIncome: 1200000,
            areaSqft: 2000,
            city: 'Nashik'
        }, authHeaders);
        record('Risk', 'POST', '/api/risk/evaluate', '200', resRiskEval.status, resRiskEval.status === 200, `Risk Level: ${resRiskEval.body?.data?.risk_level || 'N/A'}`);

        // POST /api/biometric/liveness-check (empty payload validation test)
        const resBio = await request('POST', '/api/biometric/liveness-check', {});
        record('Biometric', 'POST', '/api/biometric/liveness-check (validation)', '400', resBio.status, resBio.status === 400, resBio.body?.message);
    }

    console.log('\n[4/4] Testing Admin, Authority & Governance Endpoints...');
    {
        // RBAC Security Guard: Citizen trying to access Admin endpoint must receive 403 Forbidden
        const rbacCheck = await request('GET', '/api/admin/properties', null, authHeaders);
        record('RBAC Guard', 'GET', '/api/admin/properties (citizen token)', '403', rbacCheck.status, rbacCheck.status === 403, 'Correctly forbidden for user role');

        // GET /api/admin/blockchain-health
        const resBcHealth = await request('GET', '/api/admin/blockchain-health', null, adminHeaders);
        record('Admin', 'GET', '/api/admin/blockchain-health', '200', resBcHealth.status, resBcHealth.status === 200, `Block: ${resBcHealth.body?.data?.telemetry?.blockNumber || 'Synced'}`);

        // GET /api/admin/users
        const resAdminUsers = await request('GET', '/api/admin/users', null, adminHeaders);
        record('Admin', 'GET', '/api/admin/users', '200', resAdminUsers.status, resAdminUsers.status === 200, `${resAdminUsers.body?.data?.length ?? 0} citizens loaded`);

        if (userRow) {
            // GET /api/admin/users/:id
            const resAdminUser = await request('GET', `/api/admin/users/${userRow.id}`, null, adminHeaders);
            record('Admin', 'GET', '/api/admin/users/:id', '200', resAdminUser.status, resAdminUser.status === 200, resAdminUser.body?.data?.email);
        }

        // GET /api/admin/properties
        const resAdminProps = await request('GET', '/api/admin/properties', null, adminHeaders);
        record('Admin', 'GET', '/api/admin/properties', '200', resAdminProps.status, resAdminProps.status === 200, `${resAdminProps.body?.data?.length ?? 0} properties loaded`);

        if (propRow) {
            // GET /api/admin/property/:id/history
            const resHist = await request('GET', `/api/admin/property/${propRow.id}/history`, null, adminHeaders);
            record('Admin', 'GET', '/api/admin/property/:id/history', '200', resHist.status, resHist.status === 200, `${resHist.body?.data?.length ?? 0} chain-of-title events`);
        }

        // GET /api/admin/sales
        const resAdminSales = await request('GET', '/api/admin/sales', null, adminHeaders);
        record('Admin', 'GET', '/api/admin/sales', '200', resAdminSales.status, resAdminSales.status === 200, `${resAdminSales.body?.data?.length ?? 0} sales recorded`);

        // GET /api/admin/fund-blocks/pending
        const resPendingFb = await request('GET', '/api/admin/fund-blocks/pending', null, adminHeaders);
        record('Admin', 'GET', '/api/admin/fund-blocks/pending', '200', resPendingFb.status, resPendingFb.status === 200, `${resPendingFb.body?.data?.length ?? 0} fund blocks`);

        // GET /api/admin/wallet/:query
        const resWalletLookup = await request('GET', `/api/admin/wallet/${userRow?.wallet_address || '0x45b27dc6be8b48188e31f90699e5e67a835f7b2b'}`, null, adminHeaders);
        record('Admin', 'GET', '/api/admin/wallet/:query', '200', resWalletLookup.status, resWalletLookup.status === 200, resWalletLookup.body?.data?.user ? 'Citizen matched' : 'Lookup OK');

        // GET /api/admin/recovery/pending
        const resPendingRec = await request('GET', '/api/admin/recovery/pending', null, adminHeaders);
        record('Admin', 'GET', '/api/admin/recovery/pending', '200', resPendingRec.status, resPendingRec.status === 200, `${resPendingRec.body?.data?.length ?? 0} pending recoveries`);

        // GET /api/admin/audit
        const resAudit = await request('GET', '/api/admin/audit', null, adminHeaders);
        record('Admin', 'GET', '/api/admin/audit', '200', resAudit.status, resAudit.status === 200, `${resAudit.body?.data?.length ?? 0} audit logs`);
    }

    // 5. Final Summary
    console.log('\n' + '='.repeat(80));
    const total = testResults.length;
    const passed = testResults.filter(t => t.passed).length;
    const failed = total - passed;

    console.log(`ENDPOINT VERIFICATION SUMMARY:`);
    console.log(`Total Tested Endpoints: ${total}`);
    console.log(`Passed               : ${passed}`);
    console.log(`Failed               : ${failed}`);
    console.log('='.repeat(80));

    if (failed > 0) {
        console.log('\nFAILED ENDPOINTS:');
        testResults.filter(t => !t.passed).forEach(t => {
            console.log(`  ${t.method} ${t.endpoint} - Expected ${t.expected}, got ${t.actual}`);
        });
    }

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
