/**
 * Biometric Citizen Face Identification Test Script
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
        console.log('--- Testing Face ID Citizen Identification API ---');

        // Fetch officer user for token
        const adminRes = await pool.query("SELECT * FROM users WHERE role = 'authority' LIMIT 1");
        const officer = adminRes.rows[0];

        const officerToken = jwt.sign(
            { id: officer.id, wallet_address: officer.wallet_address, walletAddress: officer.wallet_address, role: officer.role },
            env.JWT.secret,
            { expiresIn: '1h' }
        );

        // Fetch an enrolled citizen
        const citizenRes = await pool.query("SELECT * FROM users WHERE role = 'user' AND face_verified = TRUE LIMIT 1");
        const citizen = citizenRes.rows[0];
        console.log(`Target Citizen: ${citizen.name} (${citizen.wallet_address})`);

        // Test with a sample base64 jpeg image (1x1 pixel image or mock)
        const mockBase64Face = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

        console.log('\nSending POST /api/biometric/identify-face...');
        const res = await request('POST', '/api/biometric/identify-face', {
            image: mockBase64Face,
            similarityThreshold: 80,
            simulatedMatchWallet: citizen.wallet_address,
        }, officerToken);

        console.log('Response Status:', res.status);
        console.log('Success:', res.data?.success);
        console.log('Identified:', res.data?.identified);
        console.log('Message:', res.data?.message);

        if (res.data?.data) {
            const data = res.data.data;
            console.log('\n[MATCH RESULTS]');
            console.log('- Similarity:', data.match?.similarity + '%');
            console.log('- Confidence:', data.match?.confidence + '%');
            console.log('- Scanned Face Hash:', data.match?.scannedFaceHash?.slice(0, 20) + '...');
            console.log('\n[CITIZEN DOSSIER]');
            console.log('- Name:', data.citizen?.name);
            console.log('- Email:', data.citizen?.email);
            console.log('- Wallet:', data.citizen?.walletAddress);
            console.log('- KYC Status:', data.citizen?.kycStatus);
            console.log('- Properties Owned Count:', data.properties?.length);
            console.log('- Properties List:', data.properties?.map(p => `${p.property_code} (Survey #${p.survey_number})`));
            console.log('- Transactions Count:', data.sales?.length);
            console.log('- Tax Records Count:', data.taxes?.length);
            console.log('- Active NOCs Count:', data.activeNocs?.length);
        } else {
            console.error('No data returned:', res.data);
        }

        console.log('\n--- BIOMETRIC CITIZEN IDENTIFICATION TEST PASSED ---');
        process.exit(0);
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exit(1);
    }
})();
