# Digiverify (Squrify)

![Digiverify Hero Banner](/assets/hero_banner.png)   

**The Future of Trustless Land Registry & Verification**

Digiverify is a comprehensive, blockchain-powered platform designed for the secure registration, verification, and sale of land assets. By combining a robust Node.js/Express backend with Ethereum smart contracts and IPFS storage, Digiverify eliminates fraud and ensures immutable ownership records.

---

## 🖥️ Dashboard Overview

![Admin Dashboard](/assets/dashboard.png)  

Our centralized admin dashboard provides real-time insights into the entire ecosystem, including registered properties, confirmed transactions, and active smart contracts.

---

## 🚀 Key Features

- **Digital Asset Tokenization**: Land ownership is represented by unique, non-fungible tokens (ERC-721 NFTs).
- **Multi-Signature Sale Workflow**: Every transaction requires signed approvals from the Seller, Buyer, and a Regulatory Authority.
- **ASBA-Style Fund Blocking**: Integrated banking simulation that blocks buyer funds securely before sale completion.
- **Legal Oversight & Protection**: Courts can "freeze" disputed properties or reverse fraudulent transactions on-chain.
- **Decentralized Document Storage**: Legal documents are hashed and stored on IPFS, ensuring they are tamper-proof.

---

## 📄 Property Verification & Details

![Property Details](/assets/property_details.png)

Each property is linked to a detailed verification page showing geo-coordinates, verified IPFS-backed documents (Title Deed, Survey Report, Tax Certificate), and ownership history.

---

## 🔗 Multi-Signature Transaction Flow

![Multi-sig Flow](/assets/sale_workflow.png)

Transactions follow a strict on-chain multi-sig protocol requiring Buyer, Seller, and Authority signatures, integrated directly with MetaMask for secure execution.

---

## 🏗️ System Architecture

### Multi-Stakeholder Lifecycle
1.  **Survey & Registration**: User registers property; Authority approves and mints the NFT.
2.  **Market Listing**: Seller initiates a sale to a verified buyer.
3.  **Digital Signatures**: Buyer accepts the offer using their cryptographic wallet.
4.  **Financial Securitization**: Bank confirms funds are blocked for the specific transaction ID.
5.  **Chain Settlement**: Smart contract executes the transfer upon final Authority "seal".

---

## 💻 Technical Stack

### Backend
- **Framework**: Node.js & Express
- **Database**: PostgreSQL (pg)
- **Blockchain Interface**: Ethers.js
- **Security**: Bcrypt, Express Session, PGCrypto
- **File System**: Multer + IPFS (via CID pinning)

### Frontend
- **Library**: React.js
- **Routing**: React Router v6
- **API Client**: Axios
- **Web3**: Direct MetaMask integration for on-chain signing.

---

## 📂 Project Structure
```text
Digiverify/
├── assets/             # Project screenshots & branding
├── backend/            # Express API & Business Logic
├── frontend/           # React SPA
├── contracts/          # Solidity Smart Contracts
└── admin-cli/          # Internal tools for system admins
```

---

## 🛠️ Setup & Installation

### Step 1: Database Setup
1. Create a database called `digiverify`.
2. Run the schema migrations:
   ```bash
   psql -d digiverify -f backend/config/schema.sql
   ```

### Step 2: Launch
```bash
# Start Backend
cd backend && npm install && npm run dev

# Start Frontend
cd frontend && npm install && npm start
```

---

## 📜 License
ISC License. Distributed for development and educational purposes within the Digiverify ecosystem.

---
*Created with ❤️ by the Digiverify Engineering Team.*
