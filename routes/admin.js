const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { loadAboutContent } = require('./content');
const { BLOCK_KEY, MAX_JSON_BYTES, getDefaults, sanitize } = require('../utils/aboutContent');

// Images uploaded from the CMS editors are public site content.
const CMS_IMAGE_DIR = path.join(__dirname, '..', 'public', 'uploads', 'cms');
fs.mkdirSync(CMS_IMAGE_DIR, { recursive: true });
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const uploadCmsImage = multer({
  storage: multer.diskStorage({
    destination: CMS_IMAGE_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`),
  }),
  // SVG is deliberately excluded — it can carry script.
  fileFilter: (req, file, cb) => (IMAGE_TYPES[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG, WebP or GIF images are allowed.'))),
  limits: { fileSize: 8 * 1024 * 1024 },
}).single('image');

router.use(requireRole('admin'));

// GET /api/admin/teachers?status=pending
router.get('/teachers', async (req, res, next) => {
  try {
    const { status } = req.query;
    const clauses = [];
    const params = [];
    if (status) { clauses.push('t.verification_status = ?'); params.push(status); }

    const [rows] = await db.query(
      `SELECT t.user_id, t.full_name, t.verification_status, t.team_rating, t.years_experience, u.email, u.status AS account_status, u.created_at,
              c.name AS city,
              (SELECT GROUP_CONCAT(ys.name SEPARATOR ' & ') FROM teacher_expertise te JOIN yoga_styles ys ON ys.id = te.style_id WHERE te.teacher_user_id = t.user_id) AS styles,
              (SELECT ROUND(AVG(stars), 1) FROM ratings WHERE teacher_user_id = t.user_id AND status = 'published') AS avg_rating
       FROM teachers t JOIN users u ON u.id = t.user_id
       LEFT JOIN cities c ON c.id = t.city_id
       ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
       ORDER BY t.user_id DESC`,
      params
    );
    res.json({ teachers: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/teachers/:id/full — everything the verification/doc-review modal needs
router.get('/teachers/:id/full', async (req, res, next) => {
  try {
    const [[teacher]] = await db.query(
      `SELECT t.*, u.email, u.phone, u.status AS account_status, u.created_at, c.name AS city
       FROM teachers t JOIN users u ON u.id = t.user_id LEFT JOIN cities c ON c.id = t.city_id
       WHERE t.user_id = ?`,
      [req.params.id]
    );
    if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });

    const [expertise] = await db.query(
      `SELECT ys.name FROM teacher_expertise te JOIN yoga_styles ys ON ys.id = te.style_id WHERE te.teacher_user_id = ?`,
      [req.params.id]
    );
    const [certifications] = await db.query(
      `SELECT tc.id, tc.certification_name_other, tc.issuing_body, tc.status, tc.document_url, ct.name AS certification_type
       FROM teacher_certifications tc LEFT JOIN certification_types ct ON ct.id = tc.certification_type_id
       WHERE tc.teacher_user_id = ?`,
      [req.params.id]
    );
    const [documents] = await db.query(
      `SELECT id, doc_type, status, file_url, uploaded_at FROM teacher_documents WHERE teacher_user_id = ?`,
      [req.params.id]
    );
    res.json({ teacher, expertise: expertise.map((e) => e.name), certifications, documents });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/teachers/:id/verification — approve or reject a teacher
router.patch('/teachers/:id/verification', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'status must be verified, rejected or pending.' });
    }
    const [result] = await db.query(
      'UPDATE teachers SET verification_status = ? WHERE user_id = ?',
      [status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Teacher not found.' });
    logAudit(req.session.user.id, `Set teacher verification to ${status}`, 'teacher', req.params.id);
    res.json({ message: `Teacher ${status}.` });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/teachers/:id/team-rating — admin-assigned quality score
router.patch('/teachers/:id/team-rating', async (req, res, next) => {
  try {
    const rating = Number(req.body.team_rating);
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'team_rating must be between 1 and 5.' });
    const [result] = await db.query('UPDATE teachers SET team_rating = ? WHERE user_id = ?', [rating, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Teacher not found.' });
    logAudit(req.session.user.id, `Set team rating to ${rating}`, 'teacher', req.params.id);
    res.json({ message: 'Team rating updated.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/clients — client directory
router.get('/clients', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT cl.user_id, cl.full_name, u.email, u.status AS account_status, u.created_at, c.name AS city,
              (SELECT COUNT(*) FROM requirements r WHERE r.client_user_id = cl.user_id) AS requirement_count
       FROM clients cl JOIN users u ON u.id = cl.user_id LEFT JOIN cities c ON c.id = cl.city_id
       ORDER BY cl.user_id DESC`
    );
    res.json({ clients: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/requirements — every requirement platform-wide, for the Client Directory > Requirements view
router.get('/requirements', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.title, r.status, r.is_visible, r.created_at, r.source,
              cl.full_name AS client_name,
              (SELECT COUNT(*) FROM requirement_applications ra WHERE ra.requirement_id = r.id) AS applicant_count
       FROM requirements r LEFT JOIN clients cl ON cl.user_id = r.client_user_id
       ORDER BY r.created_at DESC`
    );
    res.json({ requirements: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/requirements/:id/visibility — pull a requirement off the public board
router.patch('/requirements/:id/visibility', async (req, res, next) => {
  try {
    const { is_visible } = req.body;
    const [result] = await db.query(
      'UPDATE requirements SET is_visible = ? WHERE id = ?',
      [is_visible ? 1 : 0, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Requirement not found.' });
    logAudit(req.session.user.id, `Set requirement visibility to ${is_visible ? 'visible' : 'blocked'}`, 'requirement', req.params.id);
    res.json({ message: 'Requirement visibility updated.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/connections — full connection audit trail
router.get('/connections', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT conn.id, conn.status, conn.requested_at, conn.decided_at,
              cl.full_name AS client_name, t.full_name AS teacher_name
       FROM connections conn
       JOIN clients cl ON cl.user_id = conn.client_user_id
       JOIN teachers t ON t.user_id = conn.teacher_user_id
       ORDER BY conn.requested_at DESC
       LIMIT 200`
    );
    res.json({ connections: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status — block or reactivate an account
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'status must be active or blocked.' });
    }
    const [result] = await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found.' });
    logAudit(req.session.user.id, `Set account status to ${status}`, 'user', req.params.id);
    res.json({ message: `User ${status}.` });
  } catch (err) {
    next(err);
  }
});

// ---- ratings moderation ----

// GET /api/admin/ratings
router.get('/ratings', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.stars, r.review_text, r.status, r.flagged_reason, r.created_at,
              t.full_name AS teacher_name, cl.full_name AS client_name
       FROM ratings r JOIN teachers t ON t.user_id = r.teacher_user_id JOIN clients cl ON cl.user_id = r.client_user_id
       ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json({ ratings: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/ratings/:id — keep (published) or remove a review
router.patch('/ratings/:id', async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!['keep', 'remove'].includes(action)) return res.status(400).json({ error: 'action must be keep or remove.' });
    const status = action === 'keep' ? 'published' : 'removed';
    const [result] = await db.query('UPDATE ratings SET status = ? WHERE id = ?', [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Rating not found.' });
    logAudit(req.session.user.id, action === 'keep' ? 'Kept a review' : 'Removed a review', 'rating', req.params.id);
    res.json({ message: `Review ${status}.` });
  } catch (err) {
    next(err);
  }
});

// ---- platform settings (fee, pricing visibility) ----

const SETTINGS_DEFAULTS = {
  platform_fee_enabled: 'false',
  platform_fee_amount: '49',
  first_connection_free_rule: 'true',
  pricing_visible_platform_wide: 'true',
};

// GET /api/admin/settings
router.get('/settings', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM platform_settings');
    const settings = { ...SETTINGS_DEFAULTS };
    rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/settings — upsert one or more setting keys
router.put('/settings', async (req, res, next) => {
  try {
    const entries = Object.entries(req.body || {}).filter(([k]) => k in SETTINGS_DEFAULTS);
    if (!entries.length) return res.status(400).json({ error: 'No recognized settings provided.' });
    for (const [key, value] of entries) {
      await db.query(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [key, String(value), req.session.user.id]
      );
    }
    logAudit(req.session.user.id, 'Updated platform settings', 'platform_settings', null);
    res.json({ message: 'Settings saved.' });
  } catch (err) {
    next(err);
  }
});

// ---- CMS content blocks ----

// GET /api/admin/cms
router.get('/cms', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, block_key, label, content, last_edited_at FROM cms_content_blocks ORDER BY label');
    res.json({ blocks: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/cms/:blockKey — upsert by key (creates the row the first time it's edited)
router.put('/cms/:blockKey', async (req, res, next) => {
  try {
    const { content, label } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content is required.' });
    await db.query(
      `INSERT INTO cms_content_blocks (block_key, label, content, last_edited_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content), last_edited_by = VALUES(last_edited_by)`,
      [req.params.blockKey, label || req.params.blockKey, content, req.session.user.id]
    );
    logAudit(req.session.user.id, 'Edited site content', 'cms_content_block', null);
    res.json({ message: 'Content saved.' });
  } catch (err) {
    next(err);
  }
});

// ---- About page (one structured JSON document in cms_content_blocks) ----

// GET /api/admin/content/about — effective content (saved values over defaults)
router.get('/content/about', async (req, res, next) => {
  try {
    res.json(await loadAboutContent());
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/content/about — body: { content: {...} }; unknown keys are dropped
router.put('/content/about', async (req, res, next) => {
  try {
    if (!req.body.content || typeof req.body.content !== 'object') {
      return res.status(400).json({ error: 'content is required.' });
    }
    const clean = JSON.stringify(sanitize(getDefaults(), req.body.content));
    if (Buffer.byteLength(clean) > MAX_JSON_BYTES) {
      return res.status(400).json({ error: 'That is too much content for one page — shorten some text or remove a few items.' });
    }
    await db.query(
      `INSERT INTO cms_content_blocks (block_key, label, content, last_edited_by) VALUES (?, 'About page', ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content), last_edited_by = VALUES(last_edited_by)`,
      [BLOCK_KEY, clean, req.session.user.id]
    );
    logAudit(req.session.user.id, 'Edited the About page', 'cms_content_block', null);
    res.json({ message: 'About page saved.', ...(await loadAboutContent()) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/uploads/image — multipart field "image"; returns the public URL
router.post('/uploads/image', (req, res) => {
  uploadCmsImage(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image is larger than 8 MB.' : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
    logAudit(req.session.user.id, 'Uploaded a site image', 'cms_content_block', null);
    res.status(201).json({ url: `/uploads/cms/${req.file.filename}` });
  });
});

// ---- subadmins & permissions ----

// GET /api/admin/permission-modules — lookup for the permissions matrix
router.get('/permission-modules', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, module_key, module_label FROM permission_modules ORDER BY id');
    res.json({ modules: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/subadmins
router.get('/subadmins', async (req, res, next) => {
  try {
    const [subadmins] = await db.query(
      `SELECT u.id, u.email, u.status, u.created_at FROM users u WHERE u.role = 'subadmin' ORDER BY u.id DESC`
    );
    const [perms] = await db.query(
      `SELECT sp.subadmin_user_id, pm.module_key FROM subadmin_permissions sp JOIN permission_modules pm ON pm.id = sp.module_id`
    );
    const byUser = {};
    perms.forEach((p) => {
      (byUser[p.subadmin_user_id] = byUser[p.subadmin_user_id] || []).push(p.module_key);
    });
    res.json({ subadmins: subadmins.map((s) => ({ ...s, modules: byUser[s.id] || [] })) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/subadmins — create a subadmin account
router.post('/subadmins', async (req, res, next) => {
  try {
    const { email, password, modules } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'email and a password (6+ characters) are required.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'subadmin')",
      [email.trim().toLowerCase(), hash]
    );
    if (Array.isArray(modules) && modules.length) {
      const [moduleRows] = await db.query('SELECT id, module_key FROM permission_modules WHERE module_key IN (?)', [modules]);
      if (moduleRows.length) {
        const values = moduleRows.map((m) => [result.insertId, m.id, req.session.user.id]);
        await db.query('INSERT INTO subadmin_permissions (subadmin_user_id, module_id, granted_by) VALUES ?', [values]);
      }
    }
    logAudit(req.session.user.id, 'Created a subadmin account', 'user', result.insertId);
    res.status(201).json({ id: result.insertId, message: 'Subadmin created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' });
    next(err);
  }
});

// PUT /api/admin/subadmins/:id/permissions — replace the full permission set for a subadmin
router.put('/subadmins/:id/permissions', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { modules } = req.body;
    if (!Array.isArray(modules)) return res.status(400).json({ error: 'modules must be an array of module keys.' });

    await conn.beginTransaction();
    await conn.query('DELETE FROM subadmin_permissions WHERE subadmin_user_id = ?', [req.params.id]);
    if (modules.length) {
      const [moduleRows] = await conn.query('SELECT id, module_key FROM permission_modules WHERE module_key IN (?)', [modules]);
      if (moduleRows.length) {
        const values = moduleRows.map((m) => [req.params.id, m.id, req.session.user.id]);
        await conn.query('INSERT INTO subadmin_permissions (subadmin_user_id, module_id, granted_by) VALUES ?', [values]);
      }
    }
    await conn.commit();
    logAudit(req.session.user.id, 'Updated subadmin permissions', 'user', req.params.id);
    res.json({ message: 'Permissions saved.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// DELETE /api/admin/subadmins/:id — remove a subadmin account
router.delete('/subadmins/:id', async (req, res, next) => {
  try {
    const [result] = await db.query("DELETE FROM users WHERE id = ? AND role = 'subadmin'", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Subadmin not found.' });
    logAudit(req.session.user.id, 'Removed a subadmin account', 'user', req.params.id);
    res.json({ message: 'Subadmin removed.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/activity — recent audit trail (optionally filtered by actor role)
router.get('/activity', async (req, res, next) => {
  try {
    const { role } = req.query;
    const clauses = [];
    const params = [];
    if (role) { clauses.push('u.role = ?'); params.push(role); }

    const [rows] = await db.query(
      `SELECT al.id, al.action, al.target_type, al.target_id, al.created_at,
              COALESCE(t.full_name, cl.full_name, u.email) AS actor_name, u.role AS actor_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       LEFT JOIN teachers t ON t.user_id = al.actor_user_id
       LEFT JOIN clients cl ON cl.user_id = al.actor_user_id
       ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
       ORDER BY al.created_at DESC LIMIT 100`,
      params
    );
    res.json({ activity: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
