/**
 * PostgreSQL connection pool and schema initializer.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('./env');

const poolConfig = env.PG.connectionString
    ? { connectionString: env.PG.connectionString }
    : {
        host: env.PG.host,
        port: env.PG.port,
        user: env.PG.user,
        password: env.PG.password,
        database: env.PG.database,
    };

// Production: enforce SSL
if (env.IS_PRODUCTION) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

/**
 * Run schema.sql to ensure all tables exist.
 */
const initSchema = async () => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schemaSql);
};

/**
 * Connect to DB, run a health check, and initialize schema.
 */
const connectDB = async () => {
    try {
        await pool.query('SELECT 1');
        await initSchema();
        console.log('PostgreSQL connected — schema initialized');
    } catch (err) {
        console.error('DB connection failed:', err.message);
        process.exit(1);
    }
};

/**
 * Helper: execute a query inside a transaction.
 * Automatically rolls back on error.
 *
 * @param {Function} callback - async (client) => { ... }
 * @returns {*} Whatever the callback returns.
 */
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { pool, connectDB, withTransaction };
