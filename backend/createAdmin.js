/**
 * Create Super Admin User
 * Run: node createAdmin.js
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool, connectDB } = require('./config/db');

const ADMIN = {
    name: 'Super Admin',
    email: 'admin@squrify.com',
    password: 'Admin@123',            // Change this!
    role: 'super_admin',
    walletAddress: '0x0000000000000000000000000000000000000001',
};

(async () => {
    try {
        await connectDB();

        // Check if admin already exists
        const existing = await pool.query(
            'SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1)',
            [ADMIN.email]
        );

        if (existing.rows.length > 0) {
            console.log('\n⚠️  Admin user already exists:');
            console.log(`   ID    : ${existing.rows[0].id}`);
            console.log(`   Email : ${existing.rows[0].email}`);
            console.log(`   Role  : ${existing.rows[0].role}\n`);
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
        const id = crypto.randomUUID();

        // Insert admin user
        const result = await pool.query(
            `INSERT INTO users (id, wallet_address, name, email, password, role, kyc_status, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, 'verified', TRUE)
             RETURNING id, name, email, role, wallet_address`,
            [id, ADMIN.walletAddress, ADMIN.name, ADMIN.email, hashedPassword, ADMIN.role]
        );

        const user = result.rows[0];
        console.log('\n✅ Super Admin created successfully!');
        console.log('─'.repeat(40));
        console.log(`   ID      : ${user.id}`);
        console.log(`   Name    : ${user.name}`);
        console.log(`   Email   : ${user.email}`);
        console.log(`   Password: ${ADMIN.password}`);
        console.log(`   Role    : ${user.role}`);
        console.log(`   Wallet  : ${user.wallet_address}`);
        console.log('─'.repeat(40));
        console.log('\n🔐 Use these credentials to login:');
        console.log(`   python admin_cli.py login -e ${ADMIN.email}\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
