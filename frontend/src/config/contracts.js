/**
 * DigiVerify Smart Contract Addresses & Blockchain Explorer Config
 * Dynamically loaded from Vite environment variables (VITE_*) with Fuji defaults.
 */

export const CONTRACT_ADDRESSES = {
    LAND_NFT: import.meta.env.VITE_LAND_NFT_ADDRESS || '0xf48B73bfE1ba268145221954631fBD04B4d9520E',
    LAND_REGISTRY: import.meta.env.VITE_LAND_REGISTRY_ADDRESS || '0x5eAD24C7aD38d31e5265230994Bf23859060f7F4',
    SALE_CONTRACT: import.meta.env.VITE_SALE_CONTRACT_ADDRESS || '0x45F28298B7bADaeA10EE7d74f89c0e6c07b13bDC',
    COURT_OVERRIDE: import.meta.env.VITE_COURT_OVERRIDE_ADDRESS || '0xffD327f15609a033E8DF79DD77Eb29Ff52E980B8',
};

export const CHAIN_CONFIG = {
    CHAIN_ID: Number(import.meta.env.VITE_CHAIN_ID) || 43113,
    CHAIN_NAME: import.meta.env.VITE_CHAIN_NAME || 'Avalanche Fuji C-Chain',
    RPC_URL: import.meta.env.VITE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    EXPLORER_URL: import.meta.env.VITE_EXPLORER_URL || 'https://testnet.snowtrace.io',
    CURRENCY_SYMBOL: 'AVAX',
};

export const getExplorerNftUrl = (tokenId) => 
    `${CHAIN_CONFIG.EXPLORER_URL}/nft/${CONTRACT_ADDRESSES.LAND_NFT}/${tokenId || '1'}`;

export const getExplorerAddressUrl = (address) => 
    `${CHAIN_CONFIG.EXPLORER_URL}/address/${address}`;

export const getExplorerTxUrl = (txHash) => 
    `${CHAIN_CONFIG.EXPLORER_URL}/tx/${txHash}`;
