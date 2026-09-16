const fs = require('fs');
const path = require('path');

const replacements = [
  { search: /Avalanche Fuji C-Chain \(43113\)/gi, replace: 'Ethereum Sepolia Testnet (11155111)' },
  { search: /Avalanche Fuji \(Chain ID 43113\)/gi, replace: 'Ethereum Sepolia (Chain ID 11155111)' },
  { search: /Avalanche Fuji C-Chain/gi, replace: 'Ethereum Sepolia Testnet' },
  { search: /Avalanche Fuji/gi, replace: 'Ethereum Sepolia' },
  { search: /Fuji Testnet/gi, replace: 'Sepolia Testnet' },
  { search: /43113/g, replace: '11155111' },
  { search: /Fuji/g, replace: 'Sepolia' },
  { search: /Snowtrace/g, replace: 'Etherscan' },
];

const filesToProcess = [
  'frontend/src/pages/Dashboard/PropertyDetails.jsx',
  'frontend/src/pages/Auth/Register.jsx',
  'frontend/src/pages/Auth/Login.jsx',
  'frontend/src/pages/Admin/WalletSearch.jsx',
  'frontend/src/pages/Admin/PropertyVerification.jsx',
  'frontend/src/pages/Admin/PropertyInvestigation.jsx',
  'frontend/src/pages/Admin/BlockchainHealth.jsx'
];

filesToProcess.forEach(file => {
  const fullPath = path.join(__dirname, '../..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = content;
    replacements.forEach(r => {
      updated = updated.replace(r.search, r.replace);
    });
    if (content !== updated) {
      fs.writeFileSync(fullPath, updated, 'utf8');
      console.log(`Updated ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
