/**
 * Deployment Script — Deploys all 4 Government-Grade contracts to Avalanche Fuji.
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n🚀 Deploying contracts with:", deployer.address);
    console.log("   Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "AVAX\n");

    // ── 1. Deploy LandNFT ──────────────────────────────────
    console.log("1️⃣  Deploying LandNFT...");
    const LandNFT = await ethers.getContractFactory("LandNFT");
    const landNFT = await LandNFT.deploy();
    await landNFT.waitForDeployment();
    const landNFTAddress = await landNFT.getAddress();
    console.log("   ✅ LandNFT deployed at:", landNFTAddress);

    // ── 2. Deploy LandRegistry ─────────────────────────────
    console.log("\n2️⃣  Deploying LandRegistry...");
    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    const landRegistry = await LandRegistry.deploy(landNFTAddress);
    await landRegistry.waitForDeployment();
    const landRegistryAddress = await landRegistry.getAddress();
    console.log("   ✅ LandRegistry deployed at:", landRegistryAddress);

    // ── 3. Deploy SaleContract ─────────────────────────────
    console.log("\n3️⃣  Deploying SaleContract...");
    const SaleContract = await ethers.getContractFactory("SaleContract");
    const saleContract = await SaleContract.deploy(landNFTAddress, landRegistryAddress);
    await saleContract.waitForDeployment();
    const saleContractAddress = await saleContract.getAddress();
    console.log("   ✅ SaleContract deployed at:", saleContractAddress);

    // ── 4. Deploy CourtOverride ────────────────────────────
    console.log("\n4️⃣  Deploying CourtOverride...");
    const CourtOverride = await ethers.getContractFactory("CourtOverride");
    const courtOverride = await CourtOverride.deploy(landNFTAddress, saleContractAddress);
    await courtOverride.waitForDeployment();
    const courtOverrideAddress = await courtOverride.getAddress();
    console.log("   ✅ CourtOverride deployed at:", courtOverrideAddress);

    // ── 5. Grant roles ─────────────────────────────────────
    console.log("\n5️⃣  Granting roles...");

    // LandNFT Roles
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const COURT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COURT_ROLE"));

    await (await landNFT.grantRole(MINTER_ROLE, landRegistryAddress)).wait();
    console.log("   ✅ MINTER_ROLE of LandNFT granted to LandRegistry");

    await (await landNFT.grantRole(COURT_ROLE, courtOverrideAddress)).wait();
    console.log("   ✅ COURT_ROLE of LandNFT granted to CourtOverride");

    // SaleContract Roles
    const AUTHORITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUTHORITY_ROLE"));
    await (await saleContract.grantRole(AUTHORITY_ROLE, courtOverrideAddress)).wait();
    console.log("   ✅ AUTHORITY_ROLE of SaleContract granted to CourtOverride");

    const SALE_CONTRACT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SALE_CONTRACT_ROLE"));
    await (await landNFT.grantRole(SALE_CONTRACT_ROLE, saleContractAddress)).wait();
    console.log("   ✅ SALE_CONTRACT_ROLE of LandNFT granted to SaleContract");

    // ── 6. Save deployment info ────────────────────────────
    const deployment = {
        network: "Avalanche Fuji C-Chain (Testnet)",
        chainId: 43113,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: {
            LandNFT: landNFTAddress,
            LandRegistry: landRegistryAddress,
            SaleContract: saleContractAddress,
            CourtOverride: courtOverrideAddress
        },
    };

    const deploymentsPath = path.join(__dirname, "..", "deployments.json");
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployment, null, 2));
    console.log("\n📄 Deployment info saved to deployments.json");

    // ── 7. Copy ABIs to backend ────────────────────────────
    const backendAbisDir = path.join(__dirname, "..", "..", "backend", "blockchain", "abis");
    if (fs.existsSync(backendAbisDir)) {
        const contracts = ["LandNFT", "LandRegistry", "SaleContract", "CourtOverride"];
        for (const name of contracts) {
            const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
                fs.writeFileSync(path.join(backendAbisDir, `${name}.json`), JSON.stringify(artifact.abi, null, 2));
            }
        }
        console.log("📋 ABIs copied to backend/blockchain/abis/");
    }

    // summary
    console.log("\n" + "═".repeat(60));
    console.log("  GOVERNMENT-GRADE DEPLOYMENT COMPLETE");
    console.log("═".repeat(60));
    console.log(`  LandNFT       : ${landNFTAddress}`);
    console.log(`  LandRegistry  : ${landRegistryAddress}`);
    console.log(`  SaleContract  : ${saleContractAddress}`);
    console.log(`  CourtOverride : ${courtOverrideAddress}`);
    console.log("═".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
