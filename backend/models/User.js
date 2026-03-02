const { randomUUID } = require("crypto");
const { pool } = require("../config/db");

const mapUser = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    createdAt: row.created_at,
  };
};

const findOne = async ({ email }) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
  return mapUser(result.rows[0]);
};

const create = async ({ name, email, password, role }) => {
  const id = randomUUID();
  const result = await pool.query(
    `
      INSERT INTO users (id, name, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [id, name, email, password, role || "owner"]
  );
  return mapUser(result.rows[0]);
};

const findById = async (id) => {
  const result = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return mapUser(result.rows[0]);
};

const countDocuments = async () => {
  const result = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  return result.rows[0].count;
};

module.exports = {
  findOne,
  create,
  findById,
  countDocuments,
};
