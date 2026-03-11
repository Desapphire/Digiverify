/**
 * Full Flow Test — Demonstrates the entire Gov-Grade Land Registry workflow.
 * 
 * 1. Register Property (Seller)
 * 2. Approve Property (Admin/Auth -> NFT Minted)
 * 3. Initiate Sale (Seller -> SaleContract)
 * 4. Sign Sale (Buyer -> SaleContract)
 * 5. Confirm Funds (Bank -> SaleContract)
 * 6. Approve Sale (Authority -> SaleContract)
 * 7. Complete Sale (Final Transfer)
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n🚀 Starting Full Flow Test...");
    console.log("   Admin/Auth/Bank Signer:", deployer.address);

    // Load Deployment Addresses
    const deploymentsPath = path.join(__dirname, "..", "deployments.json");
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error("Deployments file not found. Run deploy.js first.");
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    const { LandNFT, LandRegistry, SaleContract } = deployments.contracts;

    // Get Contract Instances
    const landNFT = await ethers.getContractAt("LandNFT", LandNFT);
    const landRegistry = await ethers.getContractAt("LandRegistry", LandRegistry);
    const saleContract = await ethers.getContractAt("SaleContract", SaleContract);

    // 1️⃣ Generate Test Wallets
    const seller = ethers.Wallet.createRandom().connect(ethers.provider);
    const buyer = ethers.Wallet.createRandom().connect(ethers.provider);

    console.log("\n👤 Generated Test Wallets:");
    console.log("   Seller:", seller.address);
    console.log("   Buyer: ", buyer.address);

    // Fund Wallets for Gas
    console.log("\n⛽ Funding test wallets...");
    const fundAmount = ethers.parseEther("0.05");
    await (await deployer.sendTransaction({ to: seller.address, value: fundAmount })).wait();
    await (await deployer.sendTransaction({ to: buyer.address, value: fundAmount })).wait();
    console.log("   ✅ Wallets funded.");

    const propertyCode = "GOV-PROP-" + Date.now();
    const docHash = ethers.id("PROP-DOC-123");

    // 2️⃣ Seller Registers Property
    console.log(`\n🏠 Step 1: Seller registering property (${propertyCode})...`);
    await (await landRegistry.connect(seller).registerProperty(propertyCode, seller.address, docHash)).wait();
    console.log("   ✅ Property submitted for approval.");

    // 3️⃣ Authority Approves Property (Mints NFT)
    console.log("\n📜 Step 2: Authority approving property...");
    const metadataURI = `ipfs://QmTest${Date.now()}`;
    const approveTx = await landRegistry.connect(deployer).approveProperty(propertyCode, metadataURI);
    const approveReceipt = await approveTx.wait();

    // Find TokenID from logs
    const approveLog = approveReceipt.logs.find(x => x.fragment?.name === 'PropertyApproved');
    const tokenId = approveLog.args[1];
    console.log(`   ✅ Property approved. NFT Minted: TokenID ${tokenId}`);

    // Verify Owner
    const owner = await landNFT.ownerOf(tokenId);
    console.log("   Verification: NFT Owner is", owner);

    // 4️⃣ Initiate Sale
    console.log("\n🤝 Step 3: Seller initiating sale to Buyer...");
    const salePrice = ethers.parseEther("1.5");

    // Seller MUST approve SaleContract as operator first
    await (await landNFT.connect(seller).setApprovalForAll(SaleContract, true)).wait();
    console.log("   ✅ Seller approved SaleContract as NFT operator.");

    const initTx = await saleContract.connect(seller).initiateSale(tokenId, propertyCode, buyer.address, salePrice);
    const initReceipt = await initTx.wait();
    const saleId = initReceipt.logs.find(x => x.fragment?.name === 'SaleInitiated').args[0];
    console.log(`   ✅ Sale initiated. On-Chain Sale ID: ${saleId}`);

    // 5️⃣ Buyer Signs
    console.log("\n🖊️  Step 4: Buyer signing sale...");
    await (await saleContract.connect(buyer).buyerSign(saleId)).wait();
    console.log("   ✅ Buyer signed.");

    // 6️⃣ Bank Confirms Funds
    console.log("\n🏦 Step 5: Bank confirming blocked funds...");
    await (await saleContract.connect(deployer).confirmFundsBlocked(saleId)).wait();
    console.log("   ✅ Funds confirmed blocked.");

    // 7️⃣ Authority Approves Sale
    console.log("\n🏛️  Step 6: Authority approving sale transaction...");
    await (await saleContract.connect(deployer).authorityApprove(saleId)).wait();
    console.log("   ✅ Sale transaction approved by government.");

    // 8️⃣ Complete Sale (Final Transfer)
    console.log("\n🚚 Step 7: Executing final transfer...");
    const completeTx = await saleContract.connect(deployer).executeTransfer(saleId);
    await completeTx.wait();
    console.log("   ✅ Execution complete. Transfer finalized.");

    // 9️⃣ Final Verification
    const newOwner = await landNFT.ownerOf(tokenId);
    console.log("\n🏆 FINAL VERIFICATION:");
    console.log("   Property Code:", propertyCode);
    console.log("   NFT Token ID :", tokenId.toString());
    console.log("   Old Owner    :", seller.address);
    console.log("   New Owner    :", newOwner);

    if (newOwner.toLowerCase() === buyer.address.toLowerCase()) {
        console.log("\n✨ SUCCESS: Property ownership successfully transferred on-chain! ✨");
    } else {
        console.log("\n❌ FAILURE: Ownership transfer failed.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    });
