/**
 * Seed Property Co-Owners in PostgreSQL
 */

const { pool } = require('../config/db');

async function run() {
    console.log('🌱 Seeding property_co_owners...');
    try {
        await pool.query('DELETE FROM property_co_owners');

        const props = (await pool.query('SELECT id, property_code, owner_wallet FROM properties')).rows;

        for (const p of props) {
            if (p.property_code === 'KA-2026-00012') {
                // Joint Ownership: Akshay (50%) + Priya Patel (50%)
                await pool.query(`
                    INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
                    VALUES ($1, $2, $3, $4, $5)
                `, [p.id, p.owner_wallet, 5000, 'joint_tenancy', true]);

                await pool.query(`
                    INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
                    VALUES ($1, $2, $3, $4, $5)
                `, [p.id, '0x32be343b94f860124dc4fee278fdcbd38c102d88', 5000, 'joint_tenancy', false]);

                console.log('✅ Seeded 2 Joint Owners for KA-2026-00012 (50% / 50%)');
            } else if (p.property_code === 'TS-2026-00073') {
                // Tenancy in Common: Vikramaditya Rao (60%) + Rajesh Sharma (40%)
                await pool.query(`
                    INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
                    VALUES ($1, $2, $3, $4, $5)
                `, [p.id, p.owner_wallet, 6000, 'tenancy_in_common', true]);

                await pool.query(`
                    INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
                    VALUES ($1, $2, $3, $4, $5)
                `, [p.id, '0x71c67e8cd33762617f5c269295e7bfa4429e7943', 4000, 'tenancy_in_common', false]);

                console.log('✅ Seeded 2 Co-Owners for TS-2026-00073 (60% / 40%)');
            } else if (p.property_code === 'MH-2026-00091') {
                // Coparcenary: Ananya Deshmukh (50%) + Akshay K Manbhaw (50%)
                await pool.query(`
                    INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
                    VALUES ($1, $2, $3, $4, $5)
                `, [p.id, p.owner_wallet, 5000, 'coparcenary', true]);

                await pool.query(`
                    INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
                    VALUES ($1, $2, $3, $4, $5)
                `, [p.id, '0x0c7658f08e5fd105f1bdb471c8d35d4d2209f8a8', 5000, 'coparcenary', false]);

                console.log('✅ Seeded 2 Coparceners for MH-2026-00091 (50% / 50%)');
            } else {
                // Sole Owner (100%)
                await pool.query(`
                    INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
                    VALUES ($1, $2, $3, $4, $5)
                `, [p.id, p.owner_wallet, 10000, 'sole_owner', true]);

                console.log(`✅ Seeded Sole Owner for ${p.property_code} (100%)`);
            }
        }

        const count = await pool.query('SELECT COUNT(*) FROM property_co_owners');
        console.log(`\n🎉 Total co-owner records seeded: ${count.rows[0].count}`);
    } catch (err) {
        console.error('Error seeding co-owners:', err);
    } finally {
        process.exit(0);
    }
}

run();
