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
    console.log("\nStarting Full Flow Test...");
    console.log("   Admin/Auth/Bank Signer:", deployer.address);

    // Deploy Fresh Contract Instances for Test
    const LandNFTFactory = await ethers.getContractFactory("LandNFT");
    const landNFT = await LandNFTFactory.deploy();
    await landNFT.waitForDeployment();
    const landNFTAddress = await landNFT.getAddress();

    const LandRegistryFactory = await ethers.getContractFactory("LandRegistry");
    const landRegistry = await LandRegistryFactory.deploy(landNFTAddress);
    await landRegistry.waitForDeployment();
    const landRegistryAddress = await landRegistry.getAddress();

    const SaleContractFactory = await ethers.getContractFactory("SaleContract");
    const saleContract = await SaleContractFactory.deploy(landNFTAddress, landRegistryAddress);
    await saleContract.waitForDeployment();
    const saleContractAddress = await saleContract.getAddress();

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const SALE_CONTRACT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SALE_CONTRACT_ROLE"));
    await (await landNFT.grantRole(MINTER_ROLE, landRegistryAddress)).wait();
    await (await landNFT.grantRole(SALE_CONTRACT_ROLE, saleContractAddress)).wait();

    // 1️⃣ Generate Test Wallets
    const seller = ethers.Wallet.createRandom().connect(ethers.provider);
    const buyer = ethers.Wallet.createRandom().connect(ethers.provider);

    console.log("\nGenerated Test Wallets:");
    console.log("   Seller:", seller.address);
    console.log("   Buyer: ", buyer.address);

    // 2️⃣ Fund Test Wallets
    console.log("\nFunding test wallets...");
    await (await deployer.sendTransaction({ to: seller.address, value: ethers.parseEther("10.0") })).wait();
    await (await deployer.sendTransaction({ to: buyer.address, value: ethers.parseEther("10.0") })).wait();
    console.log("   Wallets funded.");

    // 3️⃣ Register Property
    const propertyCode = `GOV-PROP-${Date.now()}`;
    const docHash = "0x" + "a".repeat(64);
    console.log(`\nStep 1: Seller registering property (${propertyCode})...`);
    await (await landRegistry.connect(seller).registerProperty(propertyCode, seller.address, docHash)).wait();
    console.log("   Property submitted for approval.");

    // 4️⃣ Authority Approves Property (Mints NFT)
    console.log("\nStep 2: Authority approving property...");
    const metadataURI = `ipfs://QmTest${Date.now()}`;
    await (await landRegistry.connect(deployer).approveProperty(propertyCode, metadataURI)).wait();

    const propRecord = await landRegistry.propertyRecords(propertyCode);
    const tokenId = propRecord.tokenId;
    console.log(`   Property approved. NFT Minted: TokenID ${tokenId}`);

    // Verify Owner
    const owner = await landNFT.ownerOf(tokenId);
    console.log("   Verification: NFT Owner is", owner);

    // 5️⃣ Initiate Sale
    console.log("\nStep 3: Seller initiating sale to Buyer...");
    const salePrice = ethers.parseEther("1.5");

    // Seller MUST approve SaleContract as operator first
    await (await landNFT.connect(seller).setApprovalForAll(saleContractAddress, true)).wait();
    console.log("   Seller approved SaleContract as NFT operator.");

    await (await saleContract.connect(seller).initiateSale(tokenId, propertyCode, seller.address, buyer.address, salePrice)).wait();
    const saleId = await saleContract.saleCount();
    console.log(`   Sale initiated. On-Chain Sale ID: ${saleId}`);

    // 5️⃣ Buyer Signs
    console.log("\n Step 4: Buyer signing sale...");
    await (await saleContract.connect(buyer).buyerSign(saleId)).wait();
    console.log("   Buyer signed.");

    // 6️⃣ Bank Confirms Funds
    console.log("\nStep 5: Bank confirming blocked funds...");
    await (await saleContract.connect(deployer).confirmFundsBlocked(saleId)).wait();
    console.log("   Funds confirmed blocked.");

    // 7️⃣ Authority Approves Sale
    console.log("\n Step 6: Authority approving sale transaction...");
    await (await saleContract.connect(deployer).authorityApprove(saleId)).wait();
    console.log("   Sale transaction approved by government.");

    // 8️⃣ Complete Sale (Final Transfer)
    console.log("\nStep 7: Executing final transfer...");
    const completeTx = await saleContract.connect(deployer).executeTransfer(saleId);
    await completeTx.wait();
    console.log("   Execution complete. Transfer finalized.");

    // 9️⃣ Final Verification
    const newOwner = await landNFT.ownerOf(tokenId);
    console.log("\nFINAL VERIFICATION:");
    console.log("   Property Code:", propertyCode);
    console.log("   NFT Token ID :", tokenId.toString());
    console.log("   Old Owner    :", seller.address);
    console.log("   New Owner    :", newOwner);

    if (newOwner.toLowerCase() === buyer.address.toLowerCase()) {
        console.log("\nSUCCESS: Property ownership successfully transferred on-chain! ");
    } else {
        console.log("\nFAILURE: Ownership transfer failed.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nTest failed:", error);
        process.exit(1);
    });
