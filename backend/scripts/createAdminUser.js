/**
 * Script to create/seed an Admin / Authority Officer user.
 */

const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

async function createAdminUser() {
    console.log('🏛️  Creating DigiVerify Authority Officer / Admin User...\n');

    const adminEmail = process.env.ADMIN_EMAIL || 'officer@landregistry.gov.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = 'Sri Rajesh Kumar (Chief Land Registrar)';
    const adminWallet = '0xf19384d7e862253b3454f4db200464390b296062';
    const adminPhone = '+91 9876543210';
    const adminRole = 'authority'; // 'authority' or 'super_admin'

    try {
        // Hash password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Check if exists
        const existing = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [adminEmail]);
        if (existing.rows.length > 0) {
            console.log(`⚠️ User with email ${adminEmail} already exists. Updating role to ${adminRole}...`);
            await pool.query(
                `UPDATE users 
                 SET role = $1, password = $2, kyc_status = 'verified', face_verified = TRUE, updated_at = NOW() 
                 WHERE id = $3`,
                [adminRole, hashedPassword, existing.rows[0].id]
            );
            console.log('✅ Admin user updated successfully!');
        } else {
            const res = await pool.query(
                `INSERT INTO users (
                    wallet_address, name, email, password, phone,
                    government_id_type, locality, city, state, country,
                    role, kyc_status, face_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id, name, email, role, kyc_status, wallet_address`,
                [
                    adminWallet,
                    adminName,
                    adminEmail,
                    hashedPassword,
                    adminPhone,
                    'Aadhar',
                    'Revenue Bhavan, Vidhana Soudha',
                    'Bengaluru',
                    'Karnataka',
                    'India',
                    adminRole,
                    'verified',
                    true
                ]
            );
            console.log('✅ Admin user created successfully!');
            console.log(res.rows[0]);
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  🏛️  OFFICER / ADMIN CREDENTIALS');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`  Email       : ${adminEmail}`);
        console.log(`  Password    : ${adminPassword}`);
        console.log(`  Role        : ${adminRole}`);
        console.log(`  Wallet      : ${adminWallet}`);
        console.log(`  KYC Status  : verified`);
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('❌ Error creating admin user:', err);
    } finally {
        process.exit(0);
    }
}

createAdminUser();
