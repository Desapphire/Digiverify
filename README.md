# Digiverify

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

![Multi-sig Flow](/assets/sale_signature.png)

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
- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: PostgreSQL via `pg`
- **Authentication & Security**: bcrypt, JSON Web Tokens, helmet, cors, express-rate-limit, express-session
- **Blockchain Interface**: ethers.js
- **Uploads & Documents**: multer, form-data, IPFS/Pinata-backed uploads
- **Validation & Logging**: zod, morgan

### Frontend
- **Framework**: React 19 with Vite
- **Routing**: React Router
- **API Client**: Axios
- **Web3**: ethers.js with MetaMask-based signing flows
- **UI Tooling**: framer-motion, lucide-react, Tailwind CSS, ESLint

### Smart Contracts
- **Tooling**: Hardhat
- **Language**: Solidity 0.8.28
- **Deployment Target**: Avalanche Fuji C-Chain
- **Libraries**: OpenZeppelin Contracts

### Python Tooling
- **Admin CLI**: click, requests, rich, PyJWT, python-dotenv
- **User CLI**: click, requests, rich, PyJWT, python-dotenv
- **Automation**: `digiverify_cli.py` and `admin_workflow.py` for API-driven workflows

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

Proprietary & Non-Commercial License. This software is provided for personal and educational use only within the Digiverify ecosystem. Commercial redistribution or resale is strictly prohibited and subject to legal action. Please refer to the [LICENSE](LICENSE) file for full terms and conditions.

---
*Created with ❤️ by the Digiverify Engineering Team.*
