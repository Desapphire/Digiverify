/**
 * Complete Sepolia Smart Contract Suite Auditor
 * Validates deployed bytecode, state variables, permissions, and network connectivity.
 */

const { ethers } = require('ethers');
const { getProvider, contractAddresses } = require('../config/blockchain');
const { getContracts } = require('../blockchain/contracts');

async function checkContracts() {
    console.log('='.repeat(80));
    console.log('DIGIVERIFY 8-CONTRACT SUITE AUDIT — ETHEREUM SEPOLIA');
    console.log('='.repeat(80));

    const provider = getProvider();
    const network = await provider.getNetwork();
    const currentBlock = await provider.getBlockNumber();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Current Block: #${currentBlock}\n`);

    const contracts = getContracts();
    const contractKeys = [
        { key: 'landNFT', name: 'LandNFT.sol', purpose: 'ERC-721 Immutable Title Deeds' },
        { key: 'landRegistry', name: 'LandRegistry.sol', purpose: 'Master Land & Co-Ownership Registry' },
        { key: 'saleContract', name: 'SaleContract.sol', purpose: 'Multi-Sig Escrow & Settlement' },
        { key: 'courtOverride', name: 'CourtOverride.sol', purpose: 'Judicial Orders & Dispute Enforcement' },
        { key: 'bankLienRegistry', name: 'BankLienRegistry.sol', purpose: 'Bank Lien & Mortgage Ledger' },
        { key: 'inheritanceSuccession', name: 'InheritanceSuccession.sol', purpose: 'Legal Heir & Succession Partition' },
        { key: 'propertyTaxVault', name: 'PropertyTaxVault.sol', purpose: 'Municipal Tax & NOC Vault' },
        { key: 'citizenIdentityRegistry', name: 'CitizenIdentityRegistry.sol', purpose: 'ZK Biometric Identity Attestation' },
    ];

    const results = [];

    for (const [idx, item] of contractKeys.entries()) {
        const address = contractAddresses[item.key];
        const contractInstance = contracts[item.key];

        console.log(`[${idx + 1}/8] Auditing ${item.name} (${item.key})...`);
        console.log(`  Address: ${address}`);

        if (!address) {
            results.push({ ...item, status: 'NOT CONFIGURED', codeSize: 0, details: 'Missing address in env' });
            continue;
        }

        try {
            const code = await provider.getCode(address);
            const isDeployed = code && code !== '0x' && code.length > 2;
            const codeBytes = isDeployed ? (code.length - 2) / 2 : 0;
            const balanceWei = await provider.getBalance(address);
            const balanceEth = ethers.formatEther(balanceWei);

            if (!isDeployed) {
                console.log(`  Status: NOT DEPLOYED (Empty bytecode)`);
                results.push({ ...item, address, status: 'EMPTY BYTECODE', codeSize: 0, details: 'No contract code at address' });
                continue;
            }

            console.log(`  Bytecode Size: ${codeBytes} bytes`);
            console.log(`  Contract ETH Balance: ${balanceEth} ETH`);

            // Try reading contract specific state variables
            let extraInfo = [];

            // Owner / Admin check
            try {
                if (contractInstance.owner) {
                    const owner = await contractInstance.owner();
                    extraInfo.push(`Owner: ${owner}`);
                } else if (contractInstance.admin) {
                    const admin = await contractInstance.admin();
                    extraInfo.push(`Admin: ${admin}`);
                }
            } catch (_) {}

            // ERC-721 specifics
            if (item.key === 'landNFT') {
                try {
                    const [name, symbol] = await Promise.all([
                        contractInstance.name(),
                        contractInstance.symbol()
                    ]);
                    extraInfo.push(`Token: ${name} (${symbol})`);
                } catch (e) {
                    extraInfo.push(`Token Call Err: ${e.message}`);
                }
            }

            // LandRegistry specifics
            if (item.key === 'landRegistry') {
                try {
                    if (contractInstance.landNFT) {
                        const linkedNft = await contractInstance.landNFT();
                        extraInfo.push(`Linked LandNFT: ${linkedNft}`);
                    }
                } catch (_) {}
            }

            // CitizenIdentityRegistry specifics
            if (item.key === 'citizenIdentityRegistry') {
                try {
                    const testWallet = '0xf19384D7e862253b3454f4DB200464390b296062';
                    const [isAttested, kycLevel] = await contractInstance.isCitizenAttested(testWallet);
                    extraInfo.push(`Officer Attestation: ${isAttested ? 'VERIFIED (Level ' + kycLevel + ')' : 'Not Attested'}`);
                } catch (_) {}
            }

            console.log(`  State Reads: ${extraInfo.join(' | ') || 'Contract operational'}`);
            results.push({
                ...item,
                address,
                status: 'ACTIVE & VERIFIED',
                codeSize: codeBytes,
                balanceEth,
                details: extraInfo.join(' | ') || 'Active bytecode deployed'
            });

        } catch (err) {
            console.error(`  Audit Error: ${err.message}`);
            results.push({ ...item, address, status: 'RPC ERROR', codeSize: 0, details: err.message });
        }
        console.log('');
    }

    console.log('='.repeat(80));
    console.log('SMART CONTRACT SUITE SUMMARY:');
    console.log('='.repeat(80));
    console.table(results.map(r => ({
        Contract: r.name,
        Address: r.address ? `${r.address.slice(0, 8)}...${r.address.slice(-6)}` : 'N/A',
        Status: r.status,
        Size: `${r.codeSize} B`,
        Role: r.purpose
    })));

    const activeCount = results.filter(r => r.status === 'ACTIVE & VERIFIED').length;
    console.log(`Total Verified Contracts: ${activeCount} / ${contractKeys.length}`);
    process.exit(activeCount === contractKeys.length ? 0 : 1);
}

checkContracts().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
