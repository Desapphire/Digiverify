/**
 * API Flow Test — End-to-End Property Sale via Backend REST API.
 * 
 * Demonstrates:
 * 1. User/Admin Registration
 * 2. KYC Submission & Approval
 * 3. Property Registration & Approval (Minting)
 * 4. Multi-Sig Sale Workflow (Initiate, Sign, Fund Block, Approve, Complete)
 */

const axios = require('axios');
const { ethers } = require('ethers');

const BASE_URL = 'http://localhost:5000/api';

// Helper to sign messages
async function signMessage(wallet, message) {
    return await wallet.signMessage(message);
}

// Helper to handle API requests with auth
const api = (token) => {
    const instance = axios.create({
        baseURL: BASE_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    instance.interceptors.response.use(
        response => response,
        error => {
            const method = error.config.method.toUpperCase();
            const url = error.config.url;
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;
            console.error(`   [${method}] ${url} failed with status ${status}: ${message}`);
            return Promise.reject(error);
        }
    );
    return instance;
};

async function main() {
    console.log('Starting Backend API Flow Test...');

    // 1️⃣ SETUP WALLETS
    const adminWallet = ethers.Wallet.createRandom();
    const sellerWallet = ethers.Wallet.createRandom();
    const buyerWallet = ethers.Wallet.createRandom();

    console.log(`\nTest Wallets:`);
    console.log(`   Admin : ${adminWallet.address}`);
    console.log(`   Seller: ${sellerWallet.address}`);
    console.log(`   Buyer : ${buyerWallet.address}`);

    // 2️⃣ REGISTER ADMIN
    console.log(`\nRegistering Admin...`);
    const adminReg = await api().post('/onboarding/register', {
        walletAddress: adminWallet.address,
        name: 'Test Admin',
        email: `admin-${Date.now()}@test.com`,
        password: 'Password123!',
        role: 'super_admin'
    });
    console.log(`   Admin registered. ID: ${adminReg.data.data.id}`);

    // LOGIN ADMIN
    const adminNonceRes = await api().get(`/auth/nonce/${adminWallet.address}`);
    const adminSig = await signMessage(adminWallet, adminNonceRes.data.data.message);
    const adminAuthRes = await api().post('/auth/verify', {
        walletAddress: adminWallet.address,
        signature: adminSig
    });
    const adminToken = adminAuthRes.data.data.accessToken;
    console.log(`   Admin logged in.`);

    // 3️⃣ REGISTER SELLER
    console.log(`\nRegistering Seller...`);
    const sellerReg = await api().post('/onboarding/register', {
        walletAddress: sellerWallet.address,
        name: 'Test Seller',
        email: `seller-${Date.now()}@test.com`,
        password: 'Password123!',
        role: 'user'
    });
    const sellerId = sellerReg.data.data.id;
    console.log(`   Seller registered. ID: ${sellerId}`);

    // LOGIN SELLER
    const sellerNonceRes = await api().get(`/auth/nonce/${sellerWallet.address}`);
    const sellerSig = await signMessage(sellerWallet, sellerNonceRes.data.data.message);
    const sellerAuthRes = await api().post('/auth/verify', {
        walletAddress: sellerWallet.address,
        signature: sellerSig
    });
    const sellerToken = sellerAuthRes.data.data.accessToken;
    console.log(`   Seller logged in.`);

    // 4️⃣ SELLER KYC
    console.log(`\n🆔 Submitting Seller KYC...`);
    await api(sellerToken).post('/users/kyc', { kycDocumentHash: 'QmSellerKYC1234567890' });
    console.log(`   Seller KYC submitted.`);

    // ADMIN APPROVE SELLER KYC
    await api(adminToken).put(`/admin/kyc/${sellerId}/approve`);
    console.log(`   Admin approved Seller KYC.`);

    // 5️⃣ REGISTER BUYER
    console.log(`\nRegistering Buyer...`);
    const buyerReg = await api().post('/onboarding/register', {
        walletAddress: buyerWallet.address,
        name: 'Test Buyer',
        email: `buyer-${Date.now()}@test.com`,
        password: 'Password123!',
        role: 'user'
    });
    const buyerId = buyerReg.data.data.id;
    console.log(`   Buyer registered. ID: ${buyerId}`);

    // LOGIN BUYER
    const buyerNonceRes = await api().get(`/auth/nonce/${buyerWallet.address}`);
    const buyerSig = await signMessage(buyerWallet, buyerNonceRes.data.data.message);
    const buyerAuthRes = await api().post('/auth/verify', {
        walletAddress: buyerWallet.address,
        signature: buyerSig
    });
    const buyerToken = buyerAuthRes.data.data.accessToken;
    console.log(`   Buyer logged in.`);

    // 6️⃣ BUYER KYC
    console.log(`\n🆔 Submitting Buyer KYC...`);
    await api(buyerToken).post('/users/kyc', { kycDocumentHash: 'QmBuyerKYC1234567890' });
    console.log(`   Buyer KYC submitted.`);

    // ADMIN APPROVE BUYER KYC
    await api(adminToken).put(`/admin/kyc/${buyerId}/approve`);
    console.log(`   Admin approved Buyer KYC.`);

    // 7️⃣ REGISTER PROPERTY (SELLER)
    console.log(`\nRegistering Property (Seller)...`);
    const propertyRes = await api(sellerToken).post('/properties', {
        surveyNumber: 'SURVEY-' + Date.now(),
        surveyDetails: 'Golden Lands, North Block',
        areaSqft: 1500,
        district: 'Hyderabad',
        state: 'Telangana',
        documentHash: 'QmPropertyDoc1234567890'
    });
    const propertyId = propertyRes.data.data.id;
    console.log(`   Property registered in DB. ID: ${propertyId}`);
    if (propertyRes.data.blockchainTxHash) {
        console.log(`    Blockchain Tx: ${propertyRes.data.blockchainTxHash}`);
    }

    // 8️⃣ ADMIN APPROVE PROPERTY (MINT NFT)
    console.log(`\nApproving Property (Admin -> Blockchain Mint)...`);
    const approvePropRes = await api(adminToken).put(`/admin/property/${propertyId}/approve`);
    console.log(`   Property approved and anchored! Blockchain Status: ${approvePropRes.data.message}`);
    if (approvePropRes.data.blockchainTxHash) {
        console.log(`    Blockchain Tx: ${approvePropRes.data.blockchainTxHash}`);
    }
    // Wait for event listener if necessary, but API should return success
    console.log(`   Waiting a few seconds for blockchain indexing...`);
    await new Promise(r => setTimeout(r, 5000));

    // 9️⃣ INITIATE SALE (SELLER)
    console.log(`\nInitiating Sale (Seller -> Buyer)...`);
    const saleRes = await api(sellerToken).post('/sales', {
        propertyId: propertyId,
        buyerWallet: buyerWallet.address,
        salePrice: 1.25
    });
    const saleId = saleRes.data.data.id;
    console.log(`   Sale initiated. Transaction ID: ${saleId}`);
    if (saleRes.data.blockchainTxHash) {
        console.log(`    Blockchain Tx: ${saleRes.data.blockchainTxHash}`);
    }
    // BUYER SIGN SALE
    console.log(`\n Buyer signing sale...`);
    // In a real app, the buyer signs a message, here we simulate with a dummy signature
    const buyerSaleSig = await signMessage(buyerWallet, "I agree to buy this property for 1.25 AVAX");
    const buyerSignRes = await api(buyerToken).post(`/sales/${saleId}/sign`, { signatureHash: buyerSaleSig });
    console.log(`   Buyer signed.`);
    if (buyerSignRes.data.blockchainTxHash) {
        console.log(`    Blockchain Tx: ${buyerSignRes.data.blockchainTxHash}`);
    }

    // 1️⃣1️⃣ REQUEST FUND BLOCK (BUYER)
    console.log(`\nRequesting Fund Block (Buyer)...`);
    const fundBlockReqRes = await api(buyerToken).post('/bank/fund-block', {
        transactionId: saleId,
        blockAmount: 1.25,
        currency: 'INR'
    });
    const fundBlockId = fundBlockReqRes.data.data.id;
    console.log(`   Fund block requested. ID: ${fundBlockId}`);

    // 1️⃣2️⃣ BANK CONFIRM FUND BLOCK (ADMIN)
    console.log(`\nBank confirming fund block (Admin)...`);
    const confirmRes = await api(adminToken).put(`/admin/bank/fund-block/${fundBlockId}/confirm`, {
        bankReferenceId: 'REF-' + Date.now()
    });
    console.log(`   Funds confirmed blocked on-chain.`);
    if (confirmRes.data.blockchainTxHash) {
        console.log(`    Blockchain Tx: ${confirmRes.data.blockchainTxHash}`);
    }

    // 1️⃣3️⃣ AUTHORITY APPROVE SALE (ADMIN)
    console.log(`\n Authority approving sale (Admin)...`);
    const approveSaleRes = await api(adminToken).post(`/admin/sale/${saleId}/approve`);
    console.log(`   Sale approved for final transfer.`);
    if (approveSaleRes.data.blockchainTxHash) {
        console.log(`    Blockchain Tx: ${approveSaleRes.data.blockchainTxHash}`);
    }

    // 1️⃣4️⃣ FINAL COMPLETION (ADMIN)
    console.log(`\nExecuting final transfer...`);
    const completeRes = await api(adminToken).post(`/admin/sale/${saleId}/complete`);
    console.log(`   Sale completed! Transfer executed: ${completeRes.data.message}`);
    if (completeRes.data.blockchainTxHash) {
        console.log(`    Blockchain Tx: ${completeRes.data.blockchainTxHash}`);
    }

    console.log(`\nAPI FLOW TEST SUCCESSFUL! `);
}

main().catch(err => {
    console.error(`\nAPI Flow Test Failed:`);
    if (err.response) {
        console.error(`   Status: ${err.response.status}`);
        console.error(`   Data: `, err.response.data);
    } else {
        console.error(`   Message: ${err.message}`);
    }
    process.exit(1);
});
