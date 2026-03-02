const { randomUUID } = require("crypto");
const { pool } = require("../config/db");

const mapDocWithUsers = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    title: row.title,
    description: row.description,
    fileId: row.id,
    filename: row.filename,
    originalName: row.original_name,
    contentType: row.content_type,
    fileSize: Number(row.file_size),
    status: row.status,
    createdAt: row.created_at,
    owner: row.owner_id
      ? {
          _id: row.owner_id,
          name: row.owner_name,
          email: row.owner_email,
        }
      : null,
    verifiedBy: row.verified_by_id
      ? {
          _id: row.verified_by_id,
          name: row.verified_by_name,
          email: row.verified_by_email,
        }
      : null,
  };
};

const mapBasicDoc = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    title: row.title,
    description: row.description,
    fileId: row.id,
    filename: row.filename,
    originalName: row.original_name,
    contentType: row.content_type,
    fileSize: Number(row.file_size),
    filePath: row.file_path,
    owner: row.owner_id,
    status: row.status,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
  };
};

const withUsersQuery = `
  SELECT
    d.id,
    d.title,
    d.description,
    d.filename,
    d.original_name,
    d.content_type,
    d.file_size,
    d.file_path,
    d.status,
    d.created_at,
    owner.id AS owner_id,
    owner.name AS owner_name,
    owner.email AS owner_email,
    verifier.id AS verified_by_id,
    verifier.name AS verified_by_name,
    verifier.email AS verified_by_email
  FROM documents d
  LEFT JOIN users owner ON owner.id = d.owner_id
  LEFT JOIN users verifier ON verifier.id = d.verified_by
`;

const create = async ({
  title,
  description,
  filename,
  originalName,
  contentType,
  fileSize,
  filePath,
  owner,
}) => {
  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO documents
      (id, title, description, filename, original_name, content_type, file_size, file_path, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [id, title, description || "", filename, originalName, contentType, fileSize, filePath, owner]
  );

  const created = await pool.query(`${withUsersQuery} WHERE d.id = $1 LIMIT 1`, [id]);
  return mapDocWithUsers(created.rows[0]);
};

const findById = async (id) => {
  const result = await pool.query("SELECT * FROM documents WHERE id = $1 LIMIT 1", [id]);
  return mapBasicDoc(result.rows[0]);
};

const getByOwner = async (ownerId) => {
  const result = await pool.query(`${withUsersQuery} WHERE d.owner_id = $1 ORDER BY d.created_at DESC`, [ownerId]);
  return result.rows.map(mapDocWithUsers);
};

const getPending = async () => {
  const result = await pool.query(`${withUsersQuery} WHERE d.status = 'pending' ORDER BY d.created_at DESC`);
  return result.rows.map(mapDocWithUsers);
};

const getAll = async () => {
  const result = await pool.query(`${withUsersQuery} ORDER BY d.created_at DESC`);
  return result.rows.map(mapDocWithUsers);
};

const updateStatus = async (id, status, verifiedBy) => {
  await pool.query(
    "UPDATE documents SET status = $1, verified_by = $2 WHERE id = $3",
    [status, verifiedBy, id]
  );
  const result = await pool.query(`${withUsersQuery} WHERE d.id = $1 LIMIT 1`, [id]);
  return mapDocWithUsers(result.rows[0]);
};

const deleteById = async (id) => {
  await pool.query("DELETE FROM documents WHERE id = $1", [id]);
};

const countDocuments = async (filter = {}) => {
  if (filter.status) {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM documents WHERE status = $1",
      [filter.status]
    );
    return result.rows[0].count;
  }

  const result = await pool.query("SELECT COUNT(*)::int AS count FROM documents");
  return result.rows[0].count;
};

module.exports = {
  create,
  findById,
  getByOwner,
  getPending,
  getAll,
  updateStatus,
  deleteById,
  countDocuments,
};
