/**
 * Deployment Script — Deploys all 3 contracts to Avalanche Fuji.
 *
 * 1. LandNFT        → ERC-721 for land tokens
 * 2. LandRegistry   → Property registrar (gets MINTER_ROLE on LandNFT)
 * 3. SaleContract   → Multi-sig sale workflow (needs NFT approval for transfers)
 *
 * After deployment, grants:
 *   - MINTER_ROLE on LandNFT → LandRegistry
 *   - ADMIN_ROLE  on LandNFT → deployer (for force-transfers)
 *
 * Run: npx hardhat run scripts/deploy.js --network fuji
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
    const saleContract = await SaleContract.deploy(landNFTAddress);
    await saleContract.waitForDeployment();
    const saleContractAddress = await saleContract.getAddress();
    console.log("   ✅ SaleContract deployed at:", saleContractAddress);

    // ── 4. Grant roles ─────────────────────────────────────
    console.log("\n4️⃣  Granting roles...");

    // Grant MINTER_ROLE to LandRegistry so it can mint NFTs
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const tx1 = await landNFT.grantRole(MINTER_ROLE, landRegistryAddress);
    await tx1.wait();
    console.log("   ✅ MINTER_ROLE granted to LandRegistry");

    // ── 5. Save deployment info ────────────────────────────
    const deployment = {
        network: "Avalanche Fuji C-Chain (Testnet)",
        chainId: 43113,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: {
            LandNFT: landNFTAddress,
            LandRegistry: landRegistryAddress,
            SaleContract: saleContractAddress,
        },
    };

    // Save to deployments file
    const deploymentsPath = path.join(__dirname, "..", "deployments.json");
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployment, null, 2));
    console.log("\n📄 Deployment info saved to deployments.json");

    // ── 6. Copy ABIs to backend ────────────────────────────
    const backendAbisDir = path.join(__dirname, "..", "..", "backend", "blockchain", "abis");
    if (fs.existsSync(backendAbisDir)) {
        const contracts = ["LandNFT", "LandRegistry", "SaleContract"];
        for (const name of contracts) {
            const artifact = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`),
                    "utf8"
                )
            );
            fs.writeFileSync(
                path.join(backendAbisDir, `${name}.json`),
                JSON.stringify(artifact.abi, null, 2)
            );
        }
        console.log("📋 ABIs copied to backend/blockchain/abis/");
    }

    // ── Summary ────────────────────────────────────────────
    console.log("\n" + "═".repeat(60));
    console.log("  DEPLOYMENT COMPLETE");
    console.log("═".repeat(60));
    console.log(`  LandNFT       : ${landNFTAddress}`);
    console.log(`  LandRegistry  : ${landRegistryAddress}`);
    console.log(`  SaleContract  : ${saleContractAddress}`);
    console.log("═".repeat(60));
    console.log("\n📝 Update your backend/.env with:");
    console.log(`  LAND_NFT_ADDRESS=${landNFTAddress}`);
    console.log(`  LAND_REGISTRY_ADDRESS=${landRegistryAddress}`);
    console.log(`  SALE_CONTRACT_ADDRESS=${saleContractAddress}`);
    console.log(`  SIGNER_PRIVATE_KEY=${process.env.DEPLOYER_PRIVATE_KEY}`);
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
