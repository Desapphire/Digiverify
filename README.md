# Digiverify

<div align="center">

![Digiverify Hero Banner](assets/hero_banner.png)

### **Government-Grade Trustless Land Registry & Multi-Sig Conveyance Suite**
*Next-generation digital land title tokenization, automated multi-signature escrow settlements, and tamper-proof judicial oversight on Ethereum Sepolia.*

[![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum_Sepolia_(11155111)-627EEA?style=for-the-badge&logo=ethereum&logoColor=white)](https://sepolia.etherscan.io/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_/_Express_5-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/Frontend-React_19_/_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Storage](https://img.shields.io/badge/Storage-IPFS_/_Pinata-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white)](https://ipfs.tech/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture & Lifecycle](#system-architecture--lifecycle)
- [Smart Contract Ecosystem (Ethereum Sepolia)](#smart-contract-ecosystem-ethereum-sepolia)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [Prerequisites](#prerequisites)
  - [1. Database Setup](#1-database-setup)
  - [2. Smart Contract Deployment](#2-smart-contract-deployment)
  - [3. Backend Configuration & Execution](#3-backend-configuration--execution)
  - [4. Frontend Configuration & Execution](#4-frontend-configuration--execution)
- [API Overview](#api-overview)
- [Security & Compliance](#security--compliance)
- [License](#license)

---

## Overview

Traditional land registry systems suffer from severe vulnerabilities: document forgery, fraudulent multiple sales of the same parcel, non-transparent bureaucratic delays, and slow judicial dispute resolution.

**Digiverify** solves these systemic problems by combining:
1. **ERC-721 Property Tokenization** on **Ethereum Sepolia**, minting immutable, sovereign digital land titles with cadastral boundaries.
2. **ASBA-Style Bank Fund Blocking & Liens**, locking buyer funds securely in escrow to prevent defaults and payment fraud.
3. **Multi-Party Multi-Signature Settlement**, requiring non-repudiable wallet signatures from the Seller, Buyer, Bank Admin, and Government Registrar before deed finalization.
4. **Judicial Injunction & Dispute Protection**, allowing legal authorities to freeze contested titles or reverse fraudulent transfers transparently on-chain.
5. **Municipal Tax & Probate Governance**, managing succession claims, inheritance transfers, and property tax clearances on-chain.
6. **Decentralized IPFS Storage**, securing deed documents and survey maps pinned via Pinata and immutably anchored on-chain.

---

## Key Features

- **ERC-721 Digital Title Tokenization**: Land ownership is minted as a non-fungible token containing unique government parcel identifiers, cadastral survey coordinates, and document hashes.
- **3-Party Multi-Signature Escrow**: Enforces automated on-chain consensus where the Seller, Buyer, and Land Authority must each sign with cryptographic wallets before ownership transfers.
- **ASBA-Style Bank Fund Blocking**: Integrates banking fund-locking mechanisms that hold transaction funds in an account and guarantee payout only upon on-chain conveyance.
- **Autonomous Title Conveyance**: Zero manual sync needed — once all signatures and bank locks are in place, smart contracts finalize deed transfer atomically.
- **Judicial Emergency Freeze & Injunction**: Authorized court roles can freeze encumbered assets or execute judicial reversal orders with cryptographically verifiable case citations.
- **Municipal Tax Vault & NOC**: Tracks municipal valuations, records payments, and issues verifiable Tax Clearance NOCs directly on-chain.
- **Inheritance & Succession Protocol**: Formal probate workflows for legal heirs to stake inheritance claims with verification checkpoints.
- **Soulbound Citizen Attestation**: On-chain cryptographic identity attestation linking citizen KYC verification status.

---

## Smart Contract Ecosystem (Ethereum Sepolia)

The smart contract suite is written in Solidity `0.8.28`, compiled with Hardhat, and deployed on the **Ethereum Sepolia Testnet** (`Chain ID: 11155111`).

| Contract | Purpose | Sepolia Testnet Address | Explorer |
| :--- | :--- | :--- | :--- |
| **`LandNFT`** | ERC-721 token representing title deeds with metadata, freeze status, and restricted transfer logic. | `0xbCB28DC4eF6242572c0a65D1643595C582106249` | [View on Etherscan](https://sepolia.etherscan.io/address/0xbCB28DC4eF6242572c0a65D1643595C582106249) |
| **`LandRegistry`** | Cadastral registry, survey verification workflows, and minting authorizations. | `0xd6e6e94c053D204Ad535Ef8f2b01A1835696e9B1` | [View on Etherscan](https://sepolia.etherscan.io/address/0xd6e6e94c053D204Ad535Ef8f2b01A1835696e9B1) |
| **`SaleContract`** | Multi-sig escrow sales, ASBA lien verification, revenue collection, and automated conveyance. | `0xA94321fA51b6F600Ef32Ab652965AC689D967b9B` | [View on Etherscan](https://sepolia.etherscan.io/address/0xA94321fA51b6F600Ef32Ab652965AC689D967b9B) |
| **`CourtOverride`** | Judicial emergency module for freezing titles, cancelling fraudulent sales, and force-transfers. | `0x4437904bF4cff91E91c16bB135752038d3418B8C` | [View on Etherscan](https://sepolia.etherscan.io/address/0x4437904bF4cff91E91c16bB135752038d3418B8C) |
| **`BankLienRegistry`**| Bank mortgage lien registry, collateralization checks, and encumbrance tracking. | `0x6E8953f0288820bDB77CA89eaAF6c54Ff1250300` | [View on Etherscan](https://sepolia.etherscan.io/address/0x6E8953f0288820bDB77CA89eaAF6c54Ff1250300) |
| **`InheritanceSuccession`** | Probate claim submission, heir consensus, and court-authorized title succession. | `0x712a073f1849456b13c983195a62fc79D50F52B8` | [View on Etherscan](https://sepolia.etherscan.io/address/0x712a073f1849456b13c983195a62fc79D50F52B8) |
| **`PropertyTaxVault`** | Annual tax assessment registry, payment ledger, and cryptographic NOC clearance. | `0x4bC7B4A62b7a97c40Bf4F028EbF043Fb0AbB7999` | [View on Etherscan](https://sepolia.etherscan.io/address/0x4bC7B4A62b7a97c40Bf4F028EbF043Fb0AbB7999) |
| **`CitizenIdentityRegistry`** | Soulbound identity attestation for verified citizens and KYC level management. | `0xCaa02E5ba741c314c12563dBE2eABCd2d6c5c6a3` | [View on Etherscan](https://sepolia.etherscan.io/address/0xCaa02E5ba741c314c12563dBE2eABCd2d6c5c6a3) |

- **Network**: Ethereum Sepolia Testnet
- **Chain ID**: `11155111`
- **Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)

---

## Technical Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion, Lucide React | Modern, responsive SPA with role-specific dashboards, dark mode, and real-time status tracking. |
| **Backend API** | Node.js, Express 5, PostgreSQL (`pg`), JWT, bcrypt, Multer, Zod | High-performance REST API handling transactions, banking simulation, auth, and IPFS orchestration. |
| **Smart Contracts** | Solidity 0.8.28, OpenZeppelin v5, Hardhat, Ethers.js v6 | 8-contract modular suite with role-based access control, reentrancy guards, and multi-sig settlement. |
| **Decentralized Storage** | IPFS, Pinata API | Distributed storage for deed documents, land surveys, and tax receipts. |
| **Security & Identity** | AWS Rekognition, Web3 Signatures, SHA-256 Hashes, Rate Limiting | Biometric facial liveness matching, asymmetric ECDSA message verification, and anti-fraud filters. |

---

## Project Structure

```text
Digiverify/
├── backend/                 # Node.js Express 5 REST API
│   ├── blockchain/          # Ethers.js contract wrappers, ABIs & automated event listeners
│   ├── config/              # Database connection pool, blockchain config & SQL schema
│   ├── controllers/         # Business logic (Auth, Property, Sales, Bank, Admin, Biometric)
│   ├── middlewares/         # JWT verification, RBAC, rate limiting, file uploads
│   ├── models/              # PostgreSQL data access layer & query models
│   ├── routes/              # Express API route endpoints
│   ├── scripts/             # Administrative & synchronization CLI utilities
│   ├── services/            # IPFS pinning, sale workflow state machines, biometric matching
│   └── server.js            # Express application entry point
│
├── contracts/               # Hardhat Solidity Smart Contracts
│   ├── contracts/           # 8 Solidity smart contracts
│   ├── scripts/             # Deployment and test scripts
│   ├── hardhat.config.js    # Hardhat compiler & Sepolia network configuration
│   └── deployments.json     # Deployed contract addresses & deployment metadata
│
├── frontend/                # React 19 + Vite Web Application
│   ├── public/              # Static brand assets and icons
│   └── src/
│       ├── context/         # AuthContext, Web3Context
│       ├── layouts/         # AppLayout, AdminLayout, Sidebar layouts
│       ├── pages/
│       │   ├── Admin/       # Authority dashboards, KYC approval, revenue analytics, disputes
│       │   ├── Auth/        # Login, registration, biometric capture
│       │   └── Dashboard/   # Property management, purchase review, sales, fund blocking
│       └── services/        # Axios API clients & Web3 transaction helpers
│
└── model/                   # Machine learning risk scoring & anomaly detection API
```

---

## Setup & Installation

### Prerequisites

- **Node.js** `>= 18.x` & **npm** `>= 9.x`
- **PostgreSQL** `>= 14.x`
- **MetaMask** browser extension configured for **Ethereum Sepolia Testnet**
- Testnet Sepolia ETH (from [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Alchemy Faucet](https://sepoliafaucet.com/))

---

### 1. Database Setup

1. Start your local PostgreSQL server.
2. Create the database:
   ```bash
   createdb digiverify
   ```
3. Initialize the database schema:
   ```bash
   psql -d digiverify -f backend/config/schema.sql
   ```

---

### 2. Smart Contract Setup

The contracts are already compiled and deployed to Ethereum Sepolia. If you wish to recompile or redeploy:

```bash
cd contracts
npm install

# Compile contracts
npx hardhat compile

# Deploy to Ethereum Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

---

### 3. Backend Configuration & Execution

1. Navigate to `backend/` and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Configure your environment variables in `.env`:
   - Set PostgreSQL credentials (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).
   - Set `SEPOLIA_RPC_URL` (e.g. from Alchemy or Infura).
   - Set `SIGNER_PRIVATE_KEY` for the backend authority wallet.
   - Set `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` for IPFS uploads.

4. Start the backend server:
   ```bash
   npm run dev
   ```
   *The backend API will start at `http://localhost:5000`.*

---

### 4. Frontend Configuration & Execution

1. Navigate to `frontend/` and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:5173`.*

---

## API Overview

| Route Group | Path Prefix | Description |
| :--- | :--- | :--- |
| **Authentication** | `/api/auth` | User registration, login, wallet binding, JWT token renewal. |
| **Properties** | `/api/properties` | Property registration, survey approval, deed hashes, parcel search. |
| **Sales & Escrow** | `/api/sales` | Multi-sig sale initiation, buyer signing, automated final settlement. |
| **Banking (ASBA)** | `/api/bank` | Fund block creation, bank admin confirmation, lien status. |
| **Biometrics** | `/api/biometric` | Facial liveness detection, AWS Rekognition identity matching. |
| **Admin & Authority** | `/api/admin` | KYC attestation, survey review, dispute center, revenue analytics. |
| **Risk & Analytics** | `/api/risk` | ML-driven transaction risk scoring and anomaly detection. |

---

## Security & Compliance

- **Role-Based Access Control (RBAC)**: Smart contracts implement OpenZeppelin `AccessControl` segregation (`DEFAULT_ADMIN_ROLE`, `AUTHORITY_ROLE`, `BANK_ROLE`, `COURT_ROLE`).
- **Cryptographic Multi-Signature Settlement**: Eliminates unilateral transfers by requiring explicit on-chain authorizations from buyer, seller, bank, and regulatory authority.
- **Automatic Fallback Reconciliation**: The backend guarantees that database status and blockchain token ownership stay 100% consistent across all transactions.
- **Cryptographic Document Integrity**: Deed documents and boundary surveys are hashed with SHA-256 before upload and stored immutably on IPFS.
- **Judicial Intervention**: Protects against fraud and lost keys through designated court injunction and title deed force-transfer capabilities.

---

## License

This project is licensed under the **Apache License, Version 2.0**. See the [LICENSE](LICENSE) file for full details.

---

<div align="center">
  <sub>Built by <b>Team Desapphire</b></sub>
</div>
