<div align="center">
  <img src="./frontend/public/logo.png" alt="Digiverify Logo" width="120" />
</div>

# Digiverify

**The Future of Trustless Land Registry & Cyber Verification**

Digiverify is a comprehensive, government-grade platform designed for the secure registration, verification, and sale of land assets. Powered by a robust Node.js/Express backend and an immersive **Cyber HUD** frontend (React), Digiverify eliminates fraud and ensures immutable ownership records by anchoring transaction proofs to blockchain architecture.

---

## 🖥️ System Interface

Our application has undergone a premium "Cyber HUD" visual overhaul, featuring:
- **Immersive Glassmorphism**: High-fidelity dark mode styling with neon cyan/magenta data accents.
- **Terminal Aesthetics**: Monospace typography (`JetBrains Mono`) for ledger logs, notifications, and crypto wallets.
- **Holographic Experiences**: Deep integration of rich media and holographic backgrounds for contract signatures and property search layouts.

---

## 🚀 Key Features

* **Digital Asset Tokenization**: Land ownership is securely tracked.
* **Biometric & FaceID Validation**: OpenCV-powered liveness checks before issuing critical actions (e.g., initiating property sales, wallet recovery).
* **Multi-Signature Sale Workflow**: Every transaction requires signed cryptographic approvals from the Seller, Buyer, and a Regulatory Authority.
* **Breach Recovery Module**: A dedicated incident response workflow to freeze assets and safely re-allocate compromised wallet key-pairs.
* **Real-time Commlink Logs**: System activity and authority approvals are tracked natively via the centralized Cyber Notifications ledger.

---

## 🏗️ Architecture & Modules

### 1. The Citizen Dashboard (Frontend)
- **Identity & KYC**: Users must pass KYC + FaceID mapping before interacting with land contracts.
- **Market Operations**: Fluid interfaces for buying, selling, and executing fund escrow protocols.
- **Asset Portfolio**: Visual tracking of acquired and pending land assets.

### 2. The Command Center (Admin / Authority)
- **KYC & Property Verification**: Government validators can approve or reject property filings and identities.
- **Investigation Logs**: Authorities can search hashes, track transaction states, and monitor wallet breaches across the platform.

---

## 💻 Technical Stack

### Frontend
- **Framework**: React.js / Vite
- **Styling**: Vanilla CSS (Custom Cyber-HUD design system, Flexbox/Grid) + Lucide Icons (react-lucide)
- **Computer Vision**: OpenCV.js for localized face-scanning.
- **Web3 Integrations**: Ethers.js integration for hardware signing.

### Backend
- **Framework**: Node.js & Express API
- **Database**: PostgreSQL (`pg`) with declarative schema management.
- **Security Protocols**: JWT (`jsonwebtoken`), Bcrypt encoding, Express Session tracking.
- **File Systems**: Multer handling for biometric & government ID capture.

---

## 📂 Repository Structure

```text
Digiverify/
├── backend/            # Express API & Core DB Logic
├── frontend/           # React Interface (Vite)
├── contracts/          # Smart Contract Prototypes
├── admin-cli/          # Python automation wrappers for sysadmins
└── database_schema.md  # Detailed DB architectural map
```

---

## 🛠️ Setup & Installation

### Step 1: Initialize the Postgres Ledger
Create a root database named `digiverify`, then execute the schema application:
```bash
psql -d digiverify -f backend/config/schema.sql
```

### Step 2: Boot Sequences
Launch the modular services:

**Backend (API Server):**
```bash
cd backend
npm install
npm run dev
```

**Frontend (Client Proxy):**
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 Legal & Licensing
ISC License. Built for rigorous verification and demonstration purposes within the Digiverify ecosystem.

---
*Commanded by the Digiverify Systems Architecture Team.*
