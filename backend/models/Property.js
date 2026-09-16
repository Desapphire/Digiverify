/**
 * Property Model — Data access layer for properties, property_documents, and property_co_owners tables.
 */

const { pool } = require('../config/db');

const mapProperty = (row, coOwners = []) => {
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
        encumbranceReason: row.encumbrance_reason || null,
        estimatedFairPrice: row.estimated_fair_price ? parseFloat(row.estimated_fair_price) : null,
        status: row.status,
        adminComments: row.admin_comments,
        coOwners: coOwners || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const getCoOwnersByPropertyIds = async (propertyIds) => {
    if (!propertyIds || propertyIds.length === 0) return {};
    try {
        const result = await pool.query(`
            SELECT 
                pco.property_id,
                pco.owner_wallet,
                pco.share_percentage_bps,
                pco.ownership_type,
                pco.is_primary,
                u.name,
                u.email,
                u.phone,
                u.kyc_status,
                u.face_verified
            FROM property_co_owners pco
            LEFT JOIN users u ON LOWER(u.wallet_address) = LOWER(pco.owner_wallet)
            WHERE pco.property_id = ANY($1::uuid[])
            ORDER BY pco.is_primary DESC, pco.share_percentage_bps DESC
        `, [propertyIds]);

        const map = {};
        result.rows.forEach(r => {
            if (!map[r.property_id]) map[r.property_id] = [];
            map[r.property_id].push({
                ownerWallet: r.owner_wallet,
                name: r.name || 'Registered Co-Owner',
                email: r.email,
                phone: r.phone,
                kycStatus: r.kyc_status || 'unverified',
                faceVerified: !!r.face_verified,
                sharePercentageBps: r.share_percentage_bps,
                sharePercentage: (r.share_percentage_bps / 100).toFixed(2) + '%',
                ownershipType: r.ownership_type,
                isPrimary: r.is_primary
            });
        });
        return map;
    } catch (err) {
        console.warn('Error fetching co-owners (table might be initializing):', err.message);
        return {};
    }
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
            data.documentHash || null, data.ownerWallet ? data.ownerWallet.toLowerCase() : null,
        ]
    );

    const prop = result.rows[0];

    // Add primary owner into property_co_owners
    if (prop && prop.owner_wallet) {
        await db.query(`
            INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (property_id, owner_wallet) DO NOTHING
        `, [prop.id, prop.owner_wallet, 10000, 'sole_owner', true]);
    }

    return mapProperty(prop);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM properties WHERE id = $1 LIMIT 1', [id]);
    if (!result.rows[0]) return null;
    const coOwnersMap = await getCoOwnersByPropertyIds([id]);
    return mapProperty(result.rows[0], coOwnersMap[id] || []);
};

const findByOwner = async (ownerWallet) => {
    const result = await pool.query(`
        SELECT p.* FROM properties p
        LEFT JOIN property_co_owners pco ON pco.property_id = p.id
        WHERE LOWER(p.owner_wallet) = LOWER($1) OR LOWER(pco.owner_wallet) = LOWER($1)
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `, [ownerWallet]);

    const ids = result.rows.map(r => r.id);
    const coOwnersMap = await getCoOwnersByPropertyIds(ids);
    return result.rows.map(r => mapProperty(r, coOwnersMap[r.id] || []));
};

const findByCode = async (propertyCode) => {
    const result = await pool.query('SELECT * FROM properties WHERE property_code = $1 LIMIT 1', [propertyCode]);
    if (!result.rows[0]) return null;
    const coOwnersMap = await getCoOwnersByPropertyIds([result.rows[0].id]);
    return mapProperty(result.rows[0], coOwnersMap[result.rows[0].id] || []);
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
    const ids = result.rows.map(r => r.id);
    const coOwnersMap = await getCoOwnersByPropertyIds(ids);

    return result.rows.map(r => mapProperty(r, coOwnersMap[r.id] || []));
};

const updateStatus = async (id, status, adminComments = null, client = null) => {
    // If 3rd param is actually a pg client/connection
    if (adminComments && typeof adminComments.query === 'function' && !client) {
        client = adminComments;
        adminComments = null;
    }
    const db = client || pool;
    let result;
    if (adminComments !== null && typeof adminComments === 'string') {
        result = await db.query(
            'UPDATE properties SET status = $1, admin_comments = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [status, adminComments, id]
        );
    } else {
        result = await db.query(
            'UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
    }
    return mapProperty(result.rows[0]);
};

const updateOwner = async (id, newOwnerWallet, client = null) => {
    const db = client || pool;
    const normalizedWallet = newOwnerWallet ? newOwnerWallet.toLowerCase() : null;
    const result = await db.query(
        'UPDATE properties SET owner_wallet = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [normalizedWallet, id]
    );

    // Update primary co-owner
    await db.query('DELETE FROM property_co_owners WHERE property_id = $1', [id]);
    if (normalizedWallet) {
        await db.query(`
            INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
            VALUES ($1, $2, 10000, 'sole_owner', TRUE)
        `, [id, normalizedWallet]);
    }

    return mapProperty(result.rows[0]);
};

const setEncumbrance = async (id, flag, reason = null, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE properties SET encumbrance_status = $1, encumbrance_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [flag, flag ? (reason || null) : null, id]
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

// ── Multi-Owner / Co-Owners ─────────────────────────────
const addCoOwner = async ({ propertyId, ownerWallet, sharePercentageBps, ownershipType, isPrimary = false }) => {
    const result = await pool.query(`
        INSERT INTO property_co_owners (property_id, owner_wallet, share_percentage_bps, ownership_type, is_primary)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (property_id, owner_wallet) DO UPDATE SET
            share_percentage_bps = $3,
            ownership_type = $4,
            is_primary = $5
        RETURNING *
    `, [propertyId, ownerWallet.toLowerCase(), sharePercentageBps || 5000, ownershipType || 'joint_tenancy', isPrimary]);
    return result.rows[0];
};

const reapply = async (id, data, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `UPDATE properties
         SET survey_number = $1,
             survey_details = $2,
             geo_lat = $3,
             geo_lng = $4,
             area_sqft = $5,
             address_line = $6,
             district = $7,
             state = $8,
             document_hash = $9,
             status = 'pending',
             admin_comments = NULL,
             updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [
            data.surveyNumber,
            data.surveyDetails || null,
            data.geoLat || null,
            data.geoLng || null,
            data.areaSqft || null,
            data.addressLine || null,
            data.district || null,
            data.state || null,
            data.documentHash || null,
            id
        ]
    );

    if (!result.rows[0]) return null;
    const coOwnersMap = await getCoOwnersByPropertyIds([id]);
    return mapProperty(result.rows[0], coOwnersMap[id] || []);
};

module.exports = {
    create, findById, findByOwner, findByCode, search,
    updateStatus, updateOwner, setEncumbrance, setNftTokenId,
    addDocument, getDocuments, generatePropertyCode,
    addCoOwner, getCoOwnersByPropertyIds, reapply
};
