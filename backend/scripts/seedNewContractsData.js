/**
 * Seed live database with realistic records for all 4 new smart contracts:
 * - bank_liens (BankLienRegistry)
 * - succession_claims & succession_heirs (InheritanceSuccession)
 * - property_taxes & tax_clearance_nocs (PropertyTaxVault)
 * - identity_attestations (CitizenIdentityRegistry)
 */

const { pool } = require('../config/db');

async function seedLiveDatabase() {
    console.log('🌱 Starting live database seeding for new smart contract models...\n');

    try {
        // Fetch properties
        const propRes = await pool.query('SELECT id, property_code, survey_number, owner_wallet, nft_token_id FROM properties ORDER BY created_at ASC');
        const properties = propRes.rows;
        console.log(`Found ${properties.length} existing properties in live database.`);

        // Fetch users
        const userRes = await pool.query('SELECT id, wallet_address, name, email FROM users ORDER BY created_at ASC');
        const users = userRes.rows;
        console.log(`Found ${users.length} existing users in live database.\n`);

        const p1 = properties.find(p => p.property_code === 'KA-2026-00012') || properties[0];
        const p2 = properties.find(p => p.property_code === 'TS-2026-00073') || properties[1] || properties[0];
        const p3 = properties.find(p => p.property_code === 'MH-2026-00091') || properties[2] || properties[0];
        const p4 = properties.find(p => p.property_code === 'MA-2026-00001') || properties[3] || properties[0];

        const u1 = users.find(u => u.wallet_address === '0xf19384d7e862253b3454f4db200464390b296062') || users[0];
        const u2 = users.find(u => u.wallet_address === '0x71c67e8cd33762617f5c269295e7bfa4429e7943') || users[1] || users[0];
        const u3 = users.find(u => u.wallet_address === '0x32be343b94f860124dc4fee278fdcbd38c102d88') || users[2] || users[0];

        // ── 1. Seed Bank Liens ──────────────────────────────────────────────
        console.log('🏦 1. Seeding Bank Mortgage Liens (BankLienRegistry.sol)...');
        await pool.query('DELETE FROM bank_liens WHERE loan_account_number IN ($1, $2, $3)', [
            'SBI-HL-2026-98124',
            'HDFC-MORT-2024-4412',
            'ICICI-HL-2025-7721'
        ]);

        if (p1 && u1) {
            await pool.query(`
                INSERT INTO bank_liens (
                    property_id, token_id, property_code, bank_name, bank_branch,
                    loan_account_number, sanctioned_amount, outstanding_balance,
                    borrower_wallet, bank_officer_wallet, sanction_letter_hash,
                    noc_document_hash, status, on_chain_lien_id, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() - INTERVAL '45 days'
                )
            `, [
                p1.id,
                p1.nft_token_id || '1001',
                p1.property_code,
                'State Bank of India',
                'Indiranagar RACPC Branch, Bengaluru',
                'SBI-HL-2026-98124',
                7500000.00,
                6850000.00,
                u1.wallet_address,
                '0x8A9E19F4bC8311Fa39B658C9e64C92E156D1F7c2',
                'QmSbiSanctionLetter98124Hash',
                null,
                'active',
                '1'
            ]);
            console.log(`   ✅ Active SBI mortgage lien added for property ${p1.property_code} (₹75,00,000)`);
        }

        if (p2 && u2) {
            await pool.query(`
                INSERT INTO bank_liens (
                    property_id, token_id, property_code, bank_name, bank_branch,
                    loan_account_number, sanctioned_amount, outstanding_balance,
                    borrower_wallet, bank_officer_wallet, sanction_letter_hash,
                    noc_document_hash, status, on_chain_lien_id, created_at, released_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() - INTERVAL '180 days', NOW() - INTERVAL '10 days'
                )
            `, [
                p2.id,
                p2.nft_token_id || '1004',
                p2.property_code,
                'HDFC Bank Ltd',
                'Banjara Hills Branch, Hyderabad',
                'HDFC-MORT-2024-4412',
                4500000.00,
                0.00,
                u2.wallet_address,
                '0x8A9E19F4bC8311Fa39B658C9e64C92E156D1F7c2',
                'QmHdfcSanctionLetter4412Hash',
                'QmHdfcNocRelease4412Hash',
                'satisfied',
                '2'
            ]);
            console.log(`   ✅ Satisfied HDFC lien with Bank NOC added for property ${p2.property_code}`);
        }

        // ── 2. Seed Succession Claims & Heirs ───────────────────────────────
        console.log('\n📜 2. Seeding Succession Claims & Legal Heirs (InheritanceSuccession.sol)...');
        await pool.query("DELETE FROM succession_claims WHERE death_certificate_hash = 'QmDeathCertPatel2026'");

        if (p3 && u3) {
            const claimRes = await pool.query(`
                INSERT INTO succession_claims (
                    property_id, token_id, property_code, deceased_owner_wallet,
                    death_certificate_hash, probate_order_hash, court_bench,
                    total_heirs, status, officer_remarks, primary_successor_wallet,
                    on_chain_case_id, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL '20 days'
                ) RETURNING id
            `, [
                p3.id,
                p3.nft_token_id || '1005',
                p3.property_code,
                p3.owner_wallet || u3.wallet_address,
                'QmDeathCertPatel2026',
                'QmProbateOrderHC202689',
                'Bombay High Court — Pune Bench',
                2,
                'approved',
                'Verified death certificate against civil registration registry. Verified two legal heirs.',
                u3.wallet_address,
                '1'
            ]);

            const claimId = claimRes.rows[0].id;

            await pool.query(`
                INSERT INTO succession_heirs (
                    claim_id, heir_wallet, full_name, relation_to_deceased,
                    share_percentage_bps, kyc_hash, is_identity_verified, created_at
                ) VALUES 
                ($1, $2, 'Anand Patel', 'Son / Legal Heir', 5000, 'QmKycAnandPatelHash', TRUE, NOW() - INTERVAL '20 days'),
                ($1, $3, 'Sunita Patel', 'Daughter / Legal Heir', 5000, 'QmKycSunitaPatelHash', TRUE, NOW() - INTERVAL '20 days')
            `, [claimId, u3.wallet_address, u2 ? u2.wallet_address : u3.wallet_address]);

            console.log(`   ✅ Succession claim & 2 verified legal heirs added for property ${p3.property_code}`);
        }

        // ── 3. Seed Property Taxes & Clearance NOCs ────────────────────────
        console.log('\n💳 3. Seeding Property Tax Assessments & NOCs (PropertyTaxVault.sol)...');
        await pool.query('DELETE FROM property_taxes WHERE property_id IN ($1, $2, $3)', [
            p1 ? p1.id : null,
            p2 ? p2.id : null,
            p3 ? p3.id : null
        ].filter(Boolean));

        await pool.query('DELETE FROM tax_clearance_nocs WHERE property_id IN ($1, $2, $3)', [
            p1 ? p1.id : null,
            p2 ? p2.id : null,
            p3 ? p3.id : null
        ].filter(Boolean));

        if (p1 && u1) {
            await pool.query(`
                INSERT INTO property_taxes (
                    property_id, token_id, property_code, financial_year,
                    base_tax_amount, cess_amount, penalty_amount, total_due,
                    paid_amount, is_cleared, payment_receipt_hash, paid_by_wallet,
                    on_chain_assessment_id, assessed_at, paid_at
                ) VALUES (
                    $1, $2, $3, 20252026, 18500.00, 1850.00, 0.00, 20350.00,
                    20350.00, TRUE, 'QmBbmpTaxReceipt2026894', $4,
                    '101', NOW() - INTERVAL '60 days', NOW() - INTERVAL '58 days'
                )
            `, [p1.id, p1.nft_token_id || '1001', p1.property_code, u1.wallet_address]);

            await pool.query(`
                INSERT INTO tax_clearance_nocs (
                    property_id, token_id, property_code, financial_year,
                    valid_until, issued_by_wallet, certificate_hash, is_revoked, created_at
                ) VALUES (
                    $1, $2, $3, 20252026,
                    NOW() + INTERVAL '1 year', '0x0000000000000000000000000000000000000001',
                    'QmBbmpNocClearanceCert2026', FALSE, NOW() - INTERVAL '58 days'
                )
            `, [p1.id, p1.nft_token_id || '1001', p1.property_code]);

            console.log(`   ✅ Cleared property tax (₹20,350) + 1-Year Valid NOC added for ${p1.property_code}`);
        }

        if (p2 && u2) {
            await pool.query(`
                INSERT INTO property_taxes (
                    property_id, token_id, property_code, financial_year,
                    base_tax_amount, cess_amount, penalty_amount, total_due,
                    paid_amount, is_cleared, payment_receipt_hash, paid_by_wallet,
                    on_chain_assessment_id, assessed_at, paid_at
                ) VALUES (
                    $1, $2, $3, 20252026, 13000.00, 1200.00, 0.00, 14200.00,
                    14200.00, TRUE, 'QmGhmcTaxReceipt2026112', $4,
                    '102', NOW() - INTERVAL '90 days', NOW() - INTERVAL '88 days'
                )
            `, [p2.id, p2.nft_token_id || '1004', p2.property_code, u2.wallet_address]);

            await pool.query(`
                INSERT INTO tax_clearance_nocs (
                    property_id, token_id, property_code, financial_year,
                    valid_until, issued_by_wallet, certificate_hash, is_revoked, created_at
                ) VALUES (
                    $1, $2, $3, 20252026,
                    NOW() + INTERVAL '1 year', '0x0000000000000000000000000000000000000001',
                    'QmGhmcNocClearanceCert2026', FALSE, NOW() - INTERVAL '88 days'
                )
            `, [p2.id, p2.nft_token_id || '1004', p2.property_code]);

            console.log(`   ✅ Cleared property tax (₹14,200) + 1-Year Valid NOC added for ${p2.property_code}`);
        }

        if (p3) {
            await pool.query(`
                INSERT INTO property_taxes (
                    property_id, token_id, property_code, financial_year,
                    base_tax_amount, cess_amount, penalty_amount, total_due,
                    paid_amount, is_cleared, payment_receipt_hash, paid_by_wallet,
                    on_chain_assessment_id, assessed_at, paid_at
                ) VALUES (
                    $1, $2, $3, 20252026, 25000.00, 2400.00, 1000.00, 28400.00,
                    0.00, FALSE, NULL, NULL,
                    '103', NOW() - INTERVAL '30 days', NULL
                )
            `, [p3.id, p3.nft_token_id || '1005', p3.property_code]);
            console.log(`   ⚠️ Pending property tax arrears (₹28,400) added for disputed property ${p3.property_code}`);
        }

        // ── 4. Seed Zero-Knowledge KYC Attestations ────────────────────────
        console.log('\n🪪 4. Seeding ZK KYC Identity Attestations (CitizenIdentityRegistry.sol)...');
        const crypto = require('crypto');
        for (const u of users) {
            if (!u.wallet_address) continue;
            const commitmentHash = '0x' + crypto.createHash('sha256').update(u.wallet_address.toLowerCase() + '-AADHAAR-SALT').digest('hex');
            const biometricHash = '0x' + crypto.createHash('sha256').update(u.wallet_address.toLowerCase() + '-BIOMETRIC-FACE-EMBEDDING').digest('hex');

            await pool.query(`
                INSERT INTO identity_attestations (
                    citizen_wallet, identity_commitment_hash, biometric_face_match_hash,
                    kyc_level, verified_by_officer, attested_at, expires_at, is_valid, remarks
                ) VALUES (
                    $1, $2, $3, 3, '0x0000000000000000000000000000000000000001',
                    NOW() - INTERVAL '15 days',
                    NOW() + INTERVAL '3 years',
                    TRUE,
                    'Full GovTech Biometric & Aadhaar Zero-Knowledge Verification Attested'
                ) ON CONFLICT (citizen_wallet) DO UPDATE SET
                    identity_commitment_hash = $2,
                    biometric_face_match_hash = $3,
                    is_valid = TRUE,
                    kyc_level = 3,
                    expires_at = NOW() + INTERVAL '3 years'
            `, [u.wallet_address, commitmentHash, biometricHash]);
            console.log(`   ✅ ZK Identity Attestation (KYC Level 3) recorded for ${u.name} (${u.wallet_address})`);
        }

        console.log('\n🎉 Live database updated and synchronized successfully across all 8 smart contract models!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        process.exit(0);
    }
}

seedLiveDatabase();
