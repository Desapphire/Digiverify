const { Pool } = require("pg");

const connectionString = process.env.POSTGRES_URI || process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      }
);

const initSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'verifier', 'owner')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      file_path TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
      verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const connectDB = async () => {
  try {
    await pool.query("SELECT 1");
    await initSchema();
    console.log("PostgreSQL Connected");
  } catch (err) {
    console.log("DB Connection Failed", err.message);
    process.exit(1);
  }
};

module.exports = { connectDB, pool };
