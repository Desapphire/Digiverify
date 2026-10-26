-- ============================================================
--  Digiverify — Land Registry Database Schema
--  PostgreSQL ≥ 14  |  All tables use IF NOT EXISTS for safety
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════
--  MIGRATIONS: Add columns to existing tables if they're missing
--  (Safe to run repeatedly — IF NOT EXISTS / exception handling)
-- ════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- users table migrations
  ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42) UNIQUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS government_id_hash VARCHAR(256);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_nonce VARCHAR(64);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_hash VARCHAR(128);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS government_id_type VARCHAR(30) CHECK (government_id_type IN ('Aadhar', 'Passport', 'Voter ID', 'Driving License'));
  ALTER TABLE users ADD COLUMN IF NOT EXISTS house_number VARCHAR(256);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS locality VARCHAR(256);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(128);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(128);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(128);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS face_verified BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS face_id_hash VARCHAR(256);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_comments TEXT;

  -- Make password nullable (wallet-only users don't need it)
  ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

  -- properties table migrations
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(66);
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS encumbrance_reason TEXT;
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS admin_comments TEXT;
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS estimated_fair_price DECIMAL(18,2);

  -- sale_transactions table migrations
  ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS on_chain_id VARCHAR(66);
  ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS admin_comments TEXT;
  ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2);
  ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
  ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS risk_report JSONB;

  -- audit_logs table migrations
  ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
  ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(30);
  ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);
EXCEPTION WHEN undefined_table THEN
  -- Tables don't exist yet, CREATE TABLE below will handle it
  NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address      VARCHAR(42) UNIQUE,
    name                VARCHAR(128) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    phone               VARCHAR(20),
    government_id_hash  VARCHAR(256),             -- AES-encrypted government ID
    government_id_type  VARCHAR(30) CHECK (government_id_type IN ('Aadhar', 'Passport', 'Voter ID', 'Driving License')),
    house_number        VARCHAR(256),
    locality            VARCHAR(256),
    city                VARCHAR(128),
    pin_code            VARCHAR(20),
    state               VARCHAR(128),
    country             VARCHAR(128),
    password            TEXT,                     -- Legacy; nullable for wallet-only users
    role                VARCHAR(20) NOT NULL DEFAULT 'user'
                            CHECK (role IN (
                                 'user','authority','court',
                                 'bank_admin','super_admin'
                            )),
    auth_nonce          VARCHAR(64),              -- Current nonce for wallet signing
    kyc_status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (kyc_status IN ('pending','verified','rejected')),
    kyc_document_hash   VARCHAR(128),             -- IPFS hash of KYC docs
    face_verified       BOOLEAN NOT NULL DEFAULT FALSE,
    face_id_hash        VARCHAR(256),             -- Cryptographic biometric hash
    birthdate           DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet     ON users (wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users (kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_wallet_lower ON users (LOWER(wallet_address));

-- ────────────────────────────────────────────────────────────
-- 2. DOCUMENTS (legacy — backward compatibility)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    filename        TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    file_size       BIGINT NOT NULL,
    file_path       TEXT NOT NULL,
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','verified','rejected')),
    verified_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. PROPERTIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_code       VARCHAR(40) NOT NULL UNIQUE,
    survey_number       VARCHAR(60) NOT NULL,
    survey_details      TEXT,
    geo_lat             DECIMAL(10,7),
    geo_lng             DECIMAL(10,7),
    area_sqft           DECIMAL(12,2),
    address_line        VARCHAR(512),
    district            VARCHAR(128),
    state               VARCHAR(128),
    document_hash       VARCHAR(128),             -- Primary IPFS CID
    owner_wallet        VARCHAR(42) NOT NULL,
    nft_token_id        VARCHAR(66),              -- On-chain NFT token ID
    encumbrance_status  BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_fair_price DECIMAL(18,2),            -- ML predicted fair market price
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','registered','active','frozen','under_dispute','rejected')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_property_owner
        FOREIGN KEY (owner_wallet) REFERENCES users (wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_props_owner    ON properties (owner_wallet);
CREATE INDEX IF NOT EXISTS idx_props_status   ON properties (status);
CREATE INDEX IF NOT EXISTS idx_props_code     ON properties (property_code);
CREATE INDEX IF NOT EXISTS idx_props_survey   ON properties (survey_number);
CREATE INDEX IF NOT EXISTS idx_props_district ON properties (district);

-- ────────────────────────────────────────────────────────────
-- 4. PROPERTY DOCUMENTS (IPFS-backed)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL,
    document_type   VARCHAR(60) NOT NULL,
    ipfs_hash       VARCHAR(128) NOT NULL,
    description     TEXT,
    uploaded_by     UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pd_property FOREIGN KEY (property_id) REFERENCES properties (id),
    CONSTRAINT fk_pd_uploader FOREIGN KEY (uploaded_by)  REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_pd_property ON property_documents (property_id);

-- ────────────────────────────────────────────────────────────
-- 5. SALE TRANSACTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID NOT NULL,
    buyer_wallet        VARCHAR(42) NOT NULL,
    seller_wallet       VARCHAR(42) NOT NULL,
    sale_price          DECIMAL(18,2) NOT NULL,
    buyer_signed        BOOLEAN NOT NULL DEFAULT FALSE,
    seller_signed       BOOLEAN NOT NULL DEFAULT FALSE,
    authority_signed    BOOLEAN NOT NULL DEFAULT FALSE,
    funds_blocked       BOOLEAN NOT NULL DEFAULT FALSE,
    smart_contract_addr VARCHAR(42),
    tx_hash             VARCHAR(66),
    risk_score          DECIMAL(5,2),             -- ML Composite Risk Score (0-100)
    risk_level          VARCHAR(20),              -- Low, Medium, High, Critical
    risk_report         JSONB,                    -- Full ML JSON Breakdown
    status              VARCHAR(20) NOT NULL DEFAULT 'initiated'
                            CHECK (status IN (
                                'initiated','buyer_signed','funds_blocked',
                                'authority_approved','completed',
                                'cancelled','expired','frozen'
                            )),
    expiry_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_st_property FOREIGN KEY (property_id)  REFERENCES properties (id),
    CONSTRAINT fk_st_buyer    FOREIGN KEY (buyer_wallet)  REFERENCES users (wallet_address),
    CONSTRAINT fk_st_seller   FOREIGN KEY (seller_wallet) REFERENCES users (wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_st_property   ON sale_transactions (property_id);
CREATE INDEX IF NOT EXISTS idx_st_buyer      ON sale_transactions (buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_st_seller     ON sale_transactions (seller_wallet);
CREATE INDEX IF NOT EXISTS idx_st_status     ON sale_transactions (status);
CREATE INDEX IF NOT EXISTS idx_st_risk_level ON sale_transactions (risk_level);

-- ────────────────────────────────────────────────────────────
-- 6. MULTI-SIGNATURE APPROVALS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS multi_sig_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL,
    signer_wallet   VARCHAR(42) NOT NULL,
    signer_role     VARCHAR(20) NOT NULL
                        CHECK (signer_role IN ('buyer','seller','authority')),
    signature_hash  VARCHAR(132),
    signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_msa_txn    FOREIGN KEY (transaction_id) REFERENCES sale_transactions (id),
    CONSTRAINT fk_msa_signer FOREIGN KEY (signer_wallet)  REFERENCES users (wallet_address),
    CONSTRAINT uq_msa_unique UNIQUE (transaction_id, signer_role)
);

CREATE INDEX IF NOT EXISTS idx_msa_txn ON multi_sig_approvals (transaction_id);

-- ────────────────────────────────────────────────────────────
-- 7. FUND BLOCKS (ASBA-style)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fund_blocks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id      UUID NOT NULL,
    bank_reference_id   VARCHAR(64) UNIQUE,
    buyer_wallet        VARCHAR(42) NOT NULL,
    block_amount        DECIMAL(18,2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
    blocked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unblocked_at        TIMESTAMPTZ,
    bank_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
    bank_confirm_ts     TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','blocked','released','failed')),
    bank_user_id        UUID,

    CONSTRAINT fk_fb_txn   FOREIGN KEY (transaction_id) REFERENCES sale_transactions (id),
    CONSTRAINT fk_fb_buyer FOREIGN KEY (buyer_wallet)   REFERENCES users (wallet_address),
    CONSTRAINT fk_fb_bank  FOREIGN KEY (bank_user_id)   REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_fb_txn    ON fund_blocks (transaction_id);
CREATE INDEX IF NOT EXISTS idx_fb_buyer  ON fund_blocks (buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_fb_status ON fund_blocks (status);

-- ────────────────────────────────────────────────────────────
-- 8. COURT FREEZE ORDERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_freeze_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID NOT NULL,
    court_user_id       UUID NOT NULL,
    court_order_hash    VARCHAR(128) NOT NULL,
    case_number         VARCHAR(60),
    reason              TEXT,
    frozen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_cfo_property FOREIGN KEY (property_id)  REFERENCES properties (id),
    CONSTRAINT fk_cfo_court    FOREIGN KEY (court_user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_cfo_property ON court_freeze_orders (property_id);

-- ────────────────────────────────────────────────────────────
-- 9. COURT REVERSALS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_reversals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freeze_order_id         UUID NOT NULL UNIQUE,
    property_id             UUID NOT NULL,
    court_user_id           UUID NOT NULL,
    reversal_order_hash     VARCHAR(128) NOT NULL,
    previous_owner_wallet   VARCHAR(42),
    reason                  TEXT,
    reversed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_cr_freeze   FOREIGN KEY (freeze_order_id)       REFERENCES court_freeze_orders (id),
    CONSTRAINT fk_cr_property FOREIGN KEY (property_id)           REFERENCES properties (id),
    CONSTRAINT fk_cr_court    FOREIGN KEY (court_user_id)         REFERENCES users (id),
    CONSTRAINT fk_cr_prev     FOREIGN KEY (previous_owner_wallet) REFERENCES users (wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_cr_freeze   ON court_reversals (freeze_order_id);
CREATE INDEX IF NOT EXISTS idx_cr_property ON court_reversals (property_id);

-- ────────────────────────────────────────────────────────────
-- 10. AUDIT LOGS (append-only)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type     VARCHAR(60) NOT NULL,
    actor_wallet    VARCHAR(42),
    actor_user_id   UUID,
    ip_address      INET,
    entity_id       UUID,                         -- Generic: property_id or transaction_id
    entity_type     VARCHAR(30),                  -- 'property', 'sale_transaction', 'user', etc.
    tx_hash         VARCHAR(66),                  -- Blockchain tx hash if applicable
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_al_actor    ON audit_logs (actor_wallet);
CREATE INDEX IF NOT EXISTS idx_al_entity   ON audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_al_action   ON audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_al_created  ON audit_logs (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 11. WALLET RECOVERY REQUESTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_recovery_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    old_wallet          VARCHAR(42) NOT NULL,
    new_wallet          VARCHAR(42),
    status              VARCHAR(20) NOT NULL DEFAULT 'requested'
                            CHECK (status IN ('requested','identity_verified','completed','rejected')),
    verified_by         UUID,                     -- Authority who verified
    reason              TEXT,
    nft_transfer_tx     VARCHAR(66),              -- On-chain force-transfer tx hash
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_wr_user     FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_wr_verifier FOREIGN KEY (verified_by)  REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_wr_user   ON wallet_recovery_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_wr_status ON wallet_recovery_requests (status);

-- ────────────────────────────────────────────────────────────
-- 12. BANK LIENS & HYPOTHECATIONS (BankLienRegistry.sol)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_liens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID REFERENCES properties(id) ON DELETE CASCADE,
    token_id            VARCHAR(66),
    property_code       VARCHAR(40),
    bank_name           VARCHAR(128) NOT NULL,
    bank_branch         VARCHAR(128),
    loan_account_number VARCHAR(64) UNIQUE NOT NULL,
    sanctioned_amount   DECIMAL(18,2) NOT NULL,
    outstanding_balance DECIMAL(18,2) NOT NULL,
    borrower_wallet     VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    bank_officer_wallet VARCHAR(42),
    sanction_letter_hash VARCHAR(128),
    noc_document_hash   VARCHAR(128),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','satisfied','foreclosed','released')),
    on_chain_lien_id    VARCHAR(66),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bl_property ON bank_liens (property_id);
CREATE INDEX IF NOT EXISTS idx_bl_borrower ON bank_liens (borrower_wallet);
CREATE INDEX IF NOT EXISTS idx_bl_status   ON bank_liens (status);

-- ────────────────────────────────────────────────────────────
-- 13. INHERITANCE SUCCESSION CLAIMS (InheritanceSuccession.sol)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS succession_claims (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id             UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    token_id                VARCHAR(66),
    property_code           VARCHAR(40),
    deceased_owner_wallet   VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    death_certificate_hash  VARCHAR(128) NOT NULL,
    probate_order_hash      VARCHAR(128),
    court_bench             VARCHAR(128),
    total_heirs             INTEGER NOT NULL DEFAULT 1,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending_review'
                                CHECK (status IN ('pending_review','approved','executed','rejected')),
    officer_remarks         TEXT,
    primary_successor_wallet VARCHAR(42) REFERENCES users(wallet_address),
    on_chain_case_id        VARCHAR(66),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS succession_heirs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id                UUID NOT NULL REFERENCES succession_claims(id) ON DELETE CASCADE,
    heir_wallet             VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    full_name               VARCHAR(128) NOT NULL,
    relation_to_deceased    VARCHAR(60) NOT NULL,
    share_percentage_bps    INTEGER NOT NULL, -- e.g. 5000 = 50.00%
    kyc_hash                VARCHAR(128),
    is_identity_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sc_property ON succession_claims (property_id);
CREATE INDEX IF NOT EXISTS idx_sc_deceased ON succession_claims (deceased_owner_wallet);
CREATE INDEX IF NOT EXISTS idx_sh_claim    ON succession_heirs (claim_id);

-- ────────────────────────────────────────────────────────────
-- 14. PROPERTY TAX ASSESSMENTS & NOC (PropertyTaxVault.sol)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_taxes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id             UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    token_id                VARCHAR(66),
    property_code           VARCHAR(40),
    financial_year          INTEGER NOT NULL, -- e.g. 20252026
    base_tax_amount         DECIMAL(18,2) NOT NULL,
    cess_amount             DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    penalty_amount          DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_due               DECIMAL(18,2) NOT NULL,
    paid_amount             DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    is_cleared              BOOLEAN NOT NULL DEFAULT FALSE,
    payment_receipt_hash    VARCHAR(128),
    paid_by_wallet          VARCHAR(42) REFERENCES users(wallet_address),
    on_chain_assessment_id  VARCHAR(66),
    assessed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at                 TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tax_clearance_nocs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id             UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    token_id                VARCHAR(66),
    property_code           VARCHAR(40),
    financial_year          INTEGER NOT NULL,
    valid_until             TIMESTAMPTZ NOT NULL,
    issued_by_wallet        VARCHAR(42),
    certificate_hash        VARCHAR(128) NOT NULL,
    is_revoked              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pt_property ON property_taxes (property_id);
CREATE INDEX IF NOT EXISTS idx_pt_cleared  ON property_taxes (is_cleared);

-- ────────────────────────────────────────────────────────────
-- 15. ZERO-KNOWLEDGE IDENTITY ATTESTATIONS (CitizenIdentityRegistry.sol)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identity_attestations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_wallet              VARCHAR(42) NOT NULL UNIQUE REFERENCES users(wallet_address),
    identity_commitment_hash    VARCHAR(66) NOT NULL,
    biometric_face_match_hash   VARCHAR(66),
    kyc_level                   INTEGER NOT NULL DEFAULT 1,
    verified_by_officer         VARCHAR(42),
    attested_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at                  TIMESTAMPTZ NOT NULL,
    is_valid                    BOOLEAN NOT NULL DEFAULT TRUE,
    remarks                     TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_wallet ON identity_attestations (citizen_wallet);
CREATE INDEX IF NOT EXISTS idx_ia_valid  ON identity_attestations (is_valid);

-- ────────────────────────────────────────────────────────────
-- 16. PROPERTY CO-OWNERS & FRACTIONAL SHARES (Multi-Ownership)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_co_owners (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id             UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_wallet            VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    share_percentage_bps    INTEGER NOT NULL DEFAULT 10000, -- 10000 = 100.00%
    ownership_type          VARCHAR(40) NOT NULL DEFAULT 'sole_owner'
                                CHECK (ownership_type IN ('sole_owner','joint_tenancy','tenancy_in_common','coparcenary','fractional_partner')),
    is_primary              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_property_co_owner UNIQUE (property_id, owner_wallet)
);

CREATE INDEX IF NOT EXISTS idx_pco_property ON property_co_owners (property_id);
CREATE INDEX IF NOT EXISTS idx_pco_wallet   ON property_co_owners (owner_wallet);

-- ────────────────────────────────────────────────────────────
-- 17. PROPERTY RISK EVALUATIONS (Scheduled Auto-ML 60-min Cache)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_risk_evaluations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id             UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    overall_score           NUMERIC(5, 2) NOT NULL,
    risk_level              VARCHAR(32) NOT NULL,
    recommended_action      TEXT,
    fair_price_estimated    NUMERIC(15, 2),
    price_deviation         NUMERIC(6, 4),
    full_analysis           JSONB NOT NULL,
    calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_risk_prop_id       ON property_risk_evaluations (property_id);
CREATE INDEX IF NOT EXISTS idx_prop_risk_calculated_at ON property_risk_evaluations (calculated_at DESC);



-- ============================================================
--  Security: Revoke destructive ops on audit_logs
--  (Run manually after app role is set up)
--
--  REVOKE UPDATE, DELETE ON audit_logs FROM app_role;
-- ============================================================
