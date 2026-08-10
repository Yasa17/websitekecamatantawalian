import { databasePool } from './database.mjs';

const mapAdmin = (row) => ({
  id: row.id,
  name: row.name,
  username: row.username,
  email: row.email,
  avatarUrl: row.avatar_url,
  role: row.role,
  assignedEntityId: row.assigned_entity_id,
  assignedEntityLabel: row.assigned_entity_label,
  passwordHash: row.password_hash,
  passwordSalt: row.password_salt,
});

const adminSelect = `
  SELECT
    admins.*,
    portal_entities.label AS assigned_entity_label
  FROM admins
  JOIN portal_entities ON portal_entities.id = admins.assigned_entity_id
`;

export const isDatabaseInitialized = async () => {
  const result = await databasePool.query(`
    SELECT
      EXISTS (SELECT 1 FROM portal_entities) AS has_entities,
      EXISTS (SELECT 1 FROM admins) AS has_admins
  `);
  return result.rows[0].has_entities && result.rows[0].has_admins;
};

export const seedDatabase = async (initialData, encodePassword) => {
  const client = await databasePool.connect();
  try {
    await client.query('BEGIN');
    const entityCountResult = await client.query(
      'SELECT COUNT(*)::INTEGER AS count FROM portal_entities',
    );
    const adminCountResult = await client.query(
      'SELECT COUNT(*)::INTEGER AS count FROM admins',
    );
    const entityCount = entityCountResult.rows[0].count;
    const adminCount = adminCountResult.rows[0].count;

    if (entityCount || adminCount) {
      if (!entityCount || !adminCount) {
        throw new Error('Database hanya terisi sebagian. Periksa tabel sebelum menjalankan seed lagi.');
      }
      await client.query('ROLLBACK');
      return false;
    }

    for (const [displayOrder, entity] of initialData.portalData.entities.entries()) {
      await client.query(
        `INSERT INTO portal_entities
          (id, type, label, short_label, display_order, content)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          entity.id,
          entity.type,
          entity.label,
          entity.shortLabel || entity.label,
          displayOrder,
          JSON.stringify(entity.content),
        ],
      );
    }

    for (const { password, ...admin } of initialData.admins) {
      const passwordFields = admin.passwordHash && admin.passwordSalt
        ? { passwordHash: admin.passwordHash, passwordSalt: admin.passwordSalt }
        : encodePassword(password);
      await client.query(
        `INSERT INTO admins
          (id, name, username, email, avatar_url, role, assigned_entity_id,
           password_hash, password_salt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          admin.id,
          admin.name,
          admin.username,
          admin.email,
          admin.avatarUrl || '',
          admin.role,
          admin.assignedEntityId,
          passwordFields.passwordHash,
          passwordFields.passwordSalt,
        ],
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getPortalData = async () => {
  const result = await databasePool.query(`
    SELECT id, type, label, short_label, content
    FROM portal_entities
    ORDER BY display_order, id
  `);
  return {
    entities: result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      label: row.label,
      shortLabel: row.short_label,
      content: row.content,
    })),
  };
};

export const findAdminByLogin = async (usernameOrEmail) => {
  const result = await databasePool.query(
    `${adminSelect}
     WHERE LOWER(admins.username) = LOWER($1) OR LOWER(admins.email) = LOWER($1)
     LIMIT 1`,
    [usernameOrEmail],
  );
  return result.rowCount ? mapAdmin(result.rows[0]) : null;
};

export const findAdminById = async (adminId) => {
  const result = await databasePool.query(
    `${adminSelect} WHERE admins.id = $1 LIMIT 1`,
    [adminId],
  );
  return result.rowCount ? mapAdmin(result.rows[0]) : null;
};

export const createSession = async (tokenHash, adminId, expiresAt) => {
  await databasePool.query(
    `INSERT INTO admin_sessions (token_hash, admin_id, expires_at)
     VALUES ($1, $2, $3)`,
    [tokenHash, adminId, expiresAt],
  );
};

export const findAdminBySession = async (tokenHash) => {
  const result = await databasePool.query(
    `${adminSelect}
     JOIN admin_sessions ON admin_sessions.admin_id = admins.id
     WHERE admin_sessions.token_hash = $1 AND admin_sessions.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return result.rowCount ? mapAdmin(result.rows[0]) : null;
};

export const extendSession = async (tokenHash, expiresAt) => {
  await databasePool.query(
    'UPDATE admin_sessions SET expires_at = $2 WHERE token_hash = $1',
    [tokenHash, expiresAt],
  );
};

export const deleteSession = async (tokenHash) => {
  await databasePool.query('DELETE FROM admin_sessions WHERE token_hash = $1', [tokenHash]);
};

export const deleteExpiredSessions = async () => {
  await databasePool.query('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
};

export const updateEntityContent = async (entityId, updates) => {
  const client = await databasePool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT content FROM portal_entities WHERE id = $1 FOR UPDATE',
      [entityId],
    );
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    const content = {
      ...current.rows[0].content,
      ...updates,
      ...(updates.profile !== undefined
        ? {
            profile: {
              ...(current.rows[0].content.profile || {}),
              ...updates.profile,
            },
          }
        : {}),
    };
    const result = await client.query(
      `UPDATE portal_entities
       SET content = $2::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING content`,
      [entityId, JSON.stringify(content)],
    );
    await client.query('COMMIT');
    return {
      previousContent: current.rows[0].content,
      content: result.rows[0].content,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const entityExists = async (entityId) => {
  const result = await databasePool.query(
    'SELECT 1 FROM portal_entities WHERE id = $1 LIMIT 1',
    [entityId],
  );
  return Boolean(result.rowCount);
};

const mapCitizenSubmission = (row) => ({
  id: row.id,
  entityId: row.entity_id,
  entityLabel: row.entity_label,
  kind: row.kind,
  name: row.name,
  email: row.email,
  phone: row.phone,
  category: row.category,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createCitizenSubmission = async (submission) => {
  const recent = await databasePool.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM citizen_submissions
     WHERE entity_id = $1
       AND LOWER(email) = LOWER($2)
       AND created_at >= NOW() - INTERVAL '10 minutes'`,
    [submission.entityId, submission.email],
  );
  if (recent.rows[0].count >= 3) return null;

  const result = await databasePool.query(
    `INSERT INTO citizen_submissions
      (id, entity_id, kind, name, email, phone, category, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at`,
    [
      submission.id,
      submission.entityId,
      submission.kind,
      submission.name,
      submission.email,
      submission.phone,
      submission.category,
      submission.message,
    ],
  );
  return {
    id: result.rows[0].id,
    createdAt: result.rows[0].created_at,
  };
};

export const listCitizenSubmissionsForEntity = async (entityId) => {
  const result = await databasePool.query(
    `SELECT citizen_submissions.*, portal_entities.label AS entity_label
     FROM citizen_submissions
     JOIN portal_entities ON portal_entities.id = citizen_submissions.entity_id
     WHERE citizen_submissions.entity_id = $1
     ORDER BY citizen_submissions.created_at DESC
     LIMIT 200`,
    [entityId],
  );
  return result.rows.map(mapCitizenSubmission);
};

export const updateCitizenSubmissionStatus = async (submissionId, entityId, status) => {
  const result = await databasePool.query(
    `UPDATE citizen_submissions
     SET status = $3, updated_at = NOW()
     WHERE id = $1 AND entity_id = $2
     RETURNING *`,
    [submissionId, entityId, status],
  );
  return result.rowCount ? mapCitizenSubmission(result.rows[0]) : null;
};

export const getDistrictSummary = async () => {
  const result = await databasePool.query(`
    SELECT id, label, type, content -> 'statistics' AS statistics
    FROM portal_entities
    WHERE type <> 'kecamatan'
    ORDER BY display_order, id
  `);
  return result.rows.map((row) => ({
    id: row.id,
    label: row.label,
    type: row.type,
    statistics: row.statistics || [],
  }));
};

export const updateAdmin = async (admin) => {
  await databasePool.query(
    `UPDATE admins
     SET name = $2,
         username = $3,
         email = $4,
         avatar_url = $5,
         password_hash = $6,
         password_salt = $7,
         updated_at = NOW()
     WHERE id = $1`,
    [
      admin.id,
      admin.name,
      admin.username,
      admin.email,
      admin.avatarUrl,
      admin.passwordHash,
      admin.passwordSalt,
    ],
  );
  return findAdminById(admin.id);
};
