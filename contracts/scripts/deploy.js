/**
 * Deployment Script — Deploys all 8 DigiVerify Smart Contracts to Avalanche Fuji.
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n🚀 Deploying DigiVerify contracts with:", deployer.address);
    console.log("   Account Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "AVAX\n");

    // ── 1. Deploy LandNFT ──────────────────────────────────
    console.log("1️⃣  Deploying LandNFT...");
    const LandNFT = await ethers.getContractFactory("LandNFT");
    const landNFT = await LandNFT.deploy();
    await landNFT.waitForDeployment();
    const landNFTAddress = await landNFT.getAddress();
    console.log("   LandNFT deployed at:", landNFTAddress);

    // ── 2. Deploy LandRegistry ─────────────────────────────
    console.log("\n2️⃣  Deploying LandRegistry...");
    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    const landRegistry = await LandRegistry.deploy(landNFTAddress);
    await landRegistry.waitForDeployment();
    const landRegistryAddress = await landRegistry.getAddress();
    console.log("   LandRegistry deployed at:", landRegistryAddress);

    // ── 3. Deploy SaleContract ─────────────────────────────
    console.log("\n3️⃣  Deploying SaleContract...");
    const SaleContract = await ethers.getContractFactory("SaleContract");
    const saleContract = await SaleContract.deploy(landNFTAddress, landRegistryAddress);
    await saleContract.waitForDeployment();
    const saleContractAddress = await saleContract.getAddress();
    console.log("   SaleContract deployed at:", saleContractAddress);

    // ── 4. Deploy CourtOverride ────────────────────────────
    console.log("\n4️⃣  Deploying CourtOverride...");
    const CourtOverride = await ethers.getContractFactory("CourtOverride");
    const courtOverride = await CourtOverride.deploy(landNFTAddress, saleContractAddress, landRegistryAddress);
    await courtOverride.waitForDeployment();
    const courtOverrideAddress = await courtOverride.getAddress();
    console.log("   CourtOverride deployed at:", courtOverrideAddress);

    // ── 5. Deploy BankLienRegistry ─────────────────────────
    console.log("\n5️⃣  Deploying BankLienRegistry...");
    const BankLienRegistry = await ethers.getContractFactory("BankLienRegistry");
    const bankLienRegistry = await BankLienRegistry.deploy();
    await bankLienRegistry.waitForDeployment();
    const bankLienRegistryAddress = await bankLienRegistry.getAddress();
    console.log("   BankLienRegistry deployed at:", bankLienRegistryAddress);

    // ── 6. Deploy InheritanceSuccession ────────────────────
    console.log("\n6️⃣  Deploying InheritanceSuccession...");
    const InheritanceSuccession = await ethers.getContractFactory("InheritanceSuccession");
    const inheritanceSuccession = await InheritanceSuccession.deploy(landNFTAddress, landRegistryAddress);
    await inheritanceSuccession.waitForDeployment();
    const inheritanceSuccessionAddress = await inheritanceSuccession.getAddress();
    console.log("   InheritanceSuccession deployed at:", inheritanceSuccessionAddress);

    // ── 7. Deploy PropertyTaxVault ─────────────────────────
    console.log("\n7️⃣  Deploying PropertyTaxVault...");
    const PropertyTaxVault = await ethers.getContractFactory("PropertyTaxVault");
    const propertyTaxVault = await PropertyTaxVault.deploy(deployer.address);
    await propertyTaxVault.waitForDeployment();
    const propertyTaxVaultAddress = await propertyTaxVault.getAddress();
    console.log("   PropertyTaxVault deployed at:", propertyTaxVaultAddress);

    // ── 8. Deploy CitizenIdentityRegistry ──────────────────
    console.log("\n8️⃣  Deploying CitizenIdentityRegistry...");
    const CitizenIdentityRegistry = await ethers.getContractFactory("CitizenIdentityRegistry");
    const citizenIdentityRegistry = await CitizenIdentityRegistry.deploy();
    await citizenIdentityRegistry.waitForDeployment();
    const citizenIdentityRegistryAddress = await citizenIdentityRegistry.getAddress();
    console.log("   CitizenIdentityRegistry deployed at:", citizenIdentityRegistryAddress);

    // ── 9. Grant Inter-Contract Roles ───────────────────────
    console.log("\n🔐 Granting inter-contract governance roles...");

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const COURT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COURT_ROLE"));
    const SALE_CONTRACT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SALE_CONTRACT_ROLE"));
    const AUTHORITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUTHORITY_ROLE"));

    // LandNFT Roles
    await (await landNFT.grantRole(MINTER_ROLE, landRegistryAddress)).wait();
    await (await landNFT.grantRole(COURT_ROLE, courtOverrideAddress)).wait();
    await (await landNFT.grantRole(COURT_ROLE, inheritanceSuccessionAddress)).wait();
    await (await landNFT.grantRole(SALE_CONTRACT_ROLE, saleContractAddress)).wait();

    // LandRegistry Roles
    await (await landRegistry.grantRole(SALE_CONTRACT_ROLE, saleContractAddress)).wait();
    await (await landRegistry.grantRole(COURT_ROLE, courtOverrideAddress)).wait();
    await (await landRegistry.grantRole(AUTHORITY_ROLE, inheritanceSuccessionAddress)).wait();

    // SaleContract Roles
    await (await saleContract.grantRole(AUTHORITY_ROLE, courtOverrideAddress)).wait();

    console.log("   ✅ All access control roles configured successfully!");

    // ── 10. Save deployment info ───────────────────────────
    const deployment = {
        network: "Avalanche Fuji C-Chain (Testnet)",
        chainId: 43113,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: {
            LandNFT: landNFTAddress,
            LandRegistry: landRegistryAddress,
            SaleContract: saleContractAddress,
            CourtOverride: courtOverrideAddress,
            BankLienRegistry: bankLienRegistryAddress,
            InheritanceSuccession: inheritanceSuccessionAddress,
            PropertyTaxVault: propertyTaxVaultAddress,
            CitizenIdentityRegistry: citizenIdentityRegistryAddress,
        },
    };

    const deploymentsPath = path.join(__dirname, "..", "deployments.json");
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployment, null, 2));
    console.log("\n💾 Deployment info saved to contracts/deployments.json");

    // ── 11. Copy ABIs to backend ───────────────────────────
    const backendAbisDir = path.join(__dirname, "..", "..", "backend", "blockchain", "abis");
    if (fs.existsSync(backendAbisDir)) {
        const contracts = [
            "LandNFT",
            "LandRegistry",
            "SaleContract",
            "CourtOverride",
            "BankLienRegistry",
            "InheritanceSuccession",
            "PropertyTaxVault",
            "CitizenIdentityRegistry"
        ];
        for (const name of contracts) {
            const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
                fs.writeFileSync(path.join(backendAbisDir, `${name}.json`), JSON.stringify(artifact.abi, null, 2));
            }
        }
        console.log("📦 All 8 ABIs copied to backend/blockchain/abis/");
    }

    // ── Summary ─────────────────────────────────────────────
    console.log("\n" + "═".repeat(65));
    console.log("  🏛️  DIGIVERIFY GOVTECH SMART CONTRACT SUITE DEPLOYED");
    console.log("═".repeat(65));
    console.log(`  1. LandNFT                 : ${landNFTAddress}`);
    console.log(`  2. LandRegistry            : ${landRegistryAddress}`);
    console.log(`  3. SaleContract            : ${saleContractAddress}`);
    console.log(`  4. CourtOverride           : ${courtOverrideAddress}`);
    console.log(`  5. BankLienRegistry        : ${bankLienRegistryAddress}`);
    console.log(`  6. InheritanceSuccession   : ${inheritanceSuccessionAddress}`);
    console.log(`  7. PropertyTaxVault        : ${propertyTaxVaultAddress}`);
    console.log(`  8. CitizenIdentityRegistry : ${citizenIdentityRegistryAddress}`);
    console.log("═".repeat(65));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
