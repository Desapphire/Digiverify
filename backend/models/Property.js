/**
 * Property Model — Data access layer for properties and property_documents tables.
 */

const { pool } = require('../config/db');

const mapProperty = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        propertyCode: row.property_code,
        surveyNumber: row.survey_number,
        surveyDetails: row.survey_details,
        geoLat: row.geo_lat ? parseFloat(row.geo_lat) : null,
        geoLng: row.geo_lng ? parseFloat(row.geo_lng) : null,
        areaSqft: row.area_sqft ? parseFloat(row.area_sqft) : null,
        addressLine: row.address_line,
        district: row.district,
        state: row.state,
        documentHash: row.document_hash,
        ownerWallet: row.owner_wallet,
        nftTokenId: row.nft_token_id,
        encumbranceStatus: row.encumbrance_status,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const generatePropertyCode = async (state) => {
    const prefix = (state || 'XX').substring(0, 2).toUpperCase();
    const year = new Date().getFullYear();
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM properties WHERE property_code LIKE $1`,
        [`${prefix}-${year}-%`]
    );
    const seq = String(result.rows[0].count + 1).padStart(5, '0');
    return `${prefix}-${year}-${seq}`;
};

const create = async (data, client = null) => {
    const db = client || pool;
    const propertyCode = await generatePropertyCode(data.state);
    const result = await db.query(
        `INSERT INTO properties
     (property_code, survey_number, survey_details, geo_lat, geo_lng,
      area_sqft, address_line, district, state, document_hash, owner_wallet)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
        [
            propertyCode, data.surveyNumber, data.surveyDetails || null,
            data.geoLat || null, data.geoLng || null, data.areaSqft || null,
            data.addressLine || null, data.district || null, data.state || null,
            data.documentHash || null, data.ownerWallet,
        ]
    );
    return mapProperty(result.rows[0]);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM properties WHERE id = $1 LIMIT 1', [id]);
    return mapProperty(result.rows[0]);
};

const findByOwner = async (ownerWallet) => {
    const result = await pool.query(
        'SELECT * FROM properties WHERE LOWER(owner_wallet) = LOWER($1) ORDER BY created_at DESC',
        [ownerWallet]
    );
    return result.rows.map(mapProperty);
};

const findByCode = async (propertyCode) => {
    const result = await pool.query('SELECT * FROM properties WHERE property_code = $1 LIMIT 1', [propertyCode]);
    return mapProperty(result.rows[0]);
};

const search = async ({ district, state, status, limit = 50, offset = 0 }) => {
    let query = 'SELECT * FROM properties WHERE 1=1';
    const params = [];
    let idx = 1;

    if (district) { query += ` AND district = $${idx++}`; params.push(district); }
    if (state) { query += ` AND state = $${idx++}`; params.push(state); }
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }

    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(mapProperty);
};

const updateStatus = async (id, status, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
    );
    return mapProperty(result.rows[0]);
};

const updateOwner = async (id, newOwnerWallet, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE properties SET owner_wallet = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newOwnerWallet, id]
    );
    return mapProperty(result.rows[0]);
};

const setEncumbrance = async (id, flag, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE properties SET encumbrance_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [flag, id]
    );
    return mapProperty(result.rows[0]);
};

const setNftTokenId = async (id, tokenId, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE properties SET nft_token_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [tokenId, id]
    );
    return mapProperty(result.rows[0]);
};

// ── Property Documents ──────────────────────────────────
const addDocument = async ({ propertyId, documentType, ipfsHash, description, uploadedBy }) => {
    const result = await pool.query(
        `INSERT INTO property_documents (property_id, document_type, ipfs_hash, description, uploaded_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [propertyId, documentType, ipfsHash, description || null, uploadedBy]
    );
    return result.rows[0];
};

const getDocuments = async (propertyId) => {
    const result = await pool.query(
        'SELECT * FROM property_documents WHERE property_id = $1 ORDER BY created_at DESC',
        [propertyId]
    );
    return result.rows;
};

module.exports = {
    create, findById, findByOwner, findByCode, search,
    updateStatus, updateOwner, setEncumbrance, setNftTokenId,
    addDocument, getDocuments, generatePropertyCode,
};
