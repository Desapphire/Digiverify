/**
 * End-to-End API Workflow Test Script
 * This script sequentially hits the real local backend endpoints
 * to test the complete user registration and property sale lifecycle.
 * 
 * Usage: node e2e-workflow.js
 */

const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

// Create realistic dummy data for testing
const createWallet = () => ethers.Wallet.createRandom();

const SELLER_WALLET = createWallet();
const BUYER_WALLET = createWallet();
const AUTHORITY_WALLET = createWallet();
const BANK_WALLET = createWallet();

const randomSuffix = Math.floor(Math.random() * 1000000);

console.log('--- Digiverify E2E Test Flow Started ---\n');

// Generic function to send requests and handle errors cleanly
const sendRequest = async (method, endpoint, data = null, token = null) => {
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const url = `${API_URL}${endpoint}`;

        console.log(`[${method.toUpperCase()}] ${endpoint}`);
        const response = await axios({ method, url, data, headers });
        return response.data;
    } catch (error) {
        console.error(`❌ Request Failed: [${method.toUpperCase()}] ${endpoint}`);
        console.error(error.response?.data || error.message);
        process.exit(1);
    }
};

// Execute Auth Flow (Get Nonce -> Sign -> Verify)
const authenticate = async (wallet) => {
    // 1. Get Nonce
    const nonceRes = await sendRequest('get', `/auth/nonce/${wallet.address}`);
    const messageToSign = nonceRes.data.message;

    // 2. Sign Message
    const signature = await wallet.signMessage(messageToSign);

    // 3. Verify Signature & Get Token
    const authRes = await sendRequest('post', `/auth/verify`, {
        walletAddress: wallet.address,
        signature
    });

    return authRes.data.accessToken;
};

const runE2ETest = async () => {
    try {
        console.log('== 1. Registration Phase ==');

        // Register Authority
        console.log('\\n-> Registering Authority');
        await sendRequest('post', '/users/register', {
            walletAddress: AUTHORITY_WALLET.address,
            name: 'State Authority',
            email: `authority_${randomSuffix}@digiverify.gov`,
            password: 'password123',
            role: 'authority'
        });
        const authorityToken = await authenticate(AUTHORITY_WALLET);

        // Register Bank
        console.log('\\n-> Registering Bank');
        await sendRequest('post', '/users/register', {
            walletAddress: BANK_WALLET.address,
            name: 'Central Bank',
            email: `bank_${randomSuffix}@digiverify.com`,
            password: 'password123',
            role: 'bank_admin'
        });
        const bankToken = await authenticate(BANK_WALLET);

        // Register Seller
        console.log('\\n-> Registering Seller');
        await sendRequest('post', '/users/register', {
            walletAddress: SELLER_WALLET.address,
            name: 'John Seller',
            email: `seller_${randomSuffix}@example.com`,
            password: 'password123',
            role: 'user'
        });
        const sellerToken = await authenticate(SELLER_WALLET);

        // Register Buyer
        console.log('\\n-> Registering Buyer');
        await sendRequest('post', '/users/register', {
            walletAddress: BUYER_WALLET.address,
            name: 'Alice Buyer',
            email: `buyer_${randomSuffix}@example.com`,
            password: 'password123',
            role: 'user'
        });
        const buyerToken = await authenticate(BUYER_WALLET);

        console.log('\\n✅ All Users Registered & Authenticated');

        // Approve Users KYC (Mocking direct approval as Authority)
        console.log('\\n== 2. KYC Approval Phase ==');
        // Let's get the seller profile to get their ID to approve
        const sellerProfile = await sendRequest('get', '/users/profile', null, sellerToken);
        const buyerProfile = await sendRequest('get', '/users/profile', null, buyerToken);

        await sendRequest('put', `/users/${sellerProfile.data.id}/kyc/approve`, null, authorityToken);
        await sendRequest('put', `/users/${buyerProfile.data.id}/kyc/approve`, null, authorityToken);
        console.log('✅ Seller & Buyer KYC Approved');

        console.log('\\n== 3. Property Registration ==');
        const surveyNumber = `S-${Math.floor(Math.random() * 10000)}`;
        const propertyRes = await sendRequest('post', '/properties', {
            surveyNumber,
            areaSqft: 1200,
            addressLine: '123 Fake Street',
            district: 'Tech District',
            state: 'Innovation State',
        }, sellerToken);
        const propertyId = propertyRes.data.id;
        console.log(`✅ Property Registered: ${propertyId}`);

        console.log('\\n== 4. Property Approval (Authority) ==');
        await sendRequest('put', `/authority/property/${propertyId}/approve`, null, authorityToken);
        console.log('✅ Property Approved by Authority');

        console.log('\\n== 5. Sale Initiation ==');
        const saleRes = await sendRequest('post', '/sales', {
            propertyId,
            buyerWallet: BUYER_WALLET.address,
            salePrice: 50000 // $50,000
        }, sellerToken);
        const saleId = saleRes.data.id;
        console.log(`✅ Sale Initiated: ${saleId}`);

        console.log('\\n== 6. Sale Signing (Buyer & Seller) ==');
        const buyerSignHash = await BUYER_WALLET.signMessage(`Sign agreement for sale ${saleId}`);
        await sendRequest('post', `/sales/${saleId}/sign`, { signatureHash: buyerSignHash }, buyerToken);

        const sellerSignHash = await SELLER_WALLET.signMessage(`Sign agreement for sale ${saleId}`);
        await sendRequest('post', `/sales/${saleId}/sign`, { signatureHash: sellerSignHash }, sellerToken);
        console.log('✅ Sale Signed by Both Parties');

        console.log('\\n== 7. Bank Fund Blocking (ASBA) ==');
        const fundRes = await sendRequest('post', '/bank/fund-block', {
            transactionId: saleId,
            blockAmount: 50000,
            currency: 'USD'
        }, buyerToken);
        const fundBlockId = fundRes.data.id;

        console.log('\\t-> Confirming Fund Block by Bank');
        await sendRequest('put', `/bank/fund-block/${fundBlockId}/confirm`, {
            bankReferenceId: `BANK-REF-${Math.floor(Math.random() * 100000)}`
        }, bankToken);
        console.log('✅ Funds Blocked via Bank Approval');

        console.log('\\n== 8. Sale Approval (Authority) ==');
        const authoritySignHash = await AUTHORITY_WALLET.signMessage(`Approve sale ${saleId}`);
        await sendRequest('post', `/authority/sale/${saleId}/approve`, {
            signatureHash: authoritySignHash
        }, authorityToken);
        console.log('✅ Sale Approved by Authority');

        console.log('\\n== 9. Sale Completion ==');
        await sendRequest('post', `/sales/${saleId}/complete`, null, authorityToken);

        console.log('\\n🎉 SUCCESS: Full E2E Workflow Completed Successfully!');

    } catch (err) {
        console.error('\\n💣 E2E Workflow Failed!');
        console.error(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
};

// Check if server is running before starting
axios.get(`${API_URL}/docs`)
    .then(() => {
        runE2ETest();
    })
    .catch((err) => {
        console.error(`❌ Could not connect to API at ${API_URL}`);
        console.error('Make sure your backend server is running (`npm run dev`) before executing this script.');
        process.exit(1);
    });
