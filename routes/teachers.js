const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const PUBLIC_TEACHER_FIELDS = `
  t.user_id, t.full_name, t.gender, t.years_experience, t.teaching_mode, t.qualifications,
  t.bio, t.profile_photo_url, t.per_session_price, t.trial_price, t.verification_status,
  t.team_rating, c.name AS city
`;

// ---- file upload setup ----
// Photos are public (shown on the public teacher profile). Certifications and
// identity documents are not — they're stored outside public/ and served only
// through the protected /me/files route below, to the owning teacher or an admin.
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const PUBLIC_PHOTO_DIR = path.join(__dirname, '..', 'public', 'uploads', 'photos');
fs.mkdirSync(PUBLIC_PHOTO_DIR, { recursive: true });
fs.mkdirSync(path.join(UPLOAD_ROOT, 'certifications'), { recursive: true });
fs.mkdirSync(path.join(UPLOAD_ROOT, 'documents'), { recursive: true });

function diskStorage(dir) {
  return multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(8).toString('hex');
      cb(null, `${req.session.user.id}-${Date.now()}-${unique}${path.extname(file.originalname)}`);
    },
  });
}
const uploadPhoto = multer({ storage: diskStorage(PUBLIC_PHOTO_DIR), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadCert = multer({ storage: diskStorage(path.join(UPLOAD_ROOT, 'certifications')), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadDoc = multer({ storage: diskStorage(path.join(UPLOAD_ROOT, 'documents')), limits: { fileSize: 10 * 1024 * 1024 } });

async function findCityId(cityName) {
  if (!cityName) return null;
  const [rows] = await db.query('SELECT id FROM cities WHERE name = ? LIMIT 1', [cityName.trim()]);
  return rows.length ? rows[0].id : null;
}

// GET /api/teachers — public directory with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { city, style, mode } = req.query;
    const clauses = ["t.verification_status = 'verified'"];
    const params = [];

    if (city) {
      clauses.push('c.name = ?');
      params.push(city);
    }
    if (mode) {
      clauses.push('t.teaching_mode IN (?, "hybrid")');
      params.push(mode);
    }
    let styleJoin = '';
    if (style) {
      styleJoin = 'JOIN teacher_expertise te ON te.teacher_user_id = t.user_id JOIN yoga_styles ys ON ys.id = te.style_id';
      clauses.push('ys.name = ?');
      params.push(style);
    }

    const [rows] = await db.query(
      `SELECT DISTINCT ${PUBLIC_TEACHER_FIELDS}
       FROM teachers t
       LEFT JOIN cities c ON c.id = t.city_id
       ${styleJoin}
       WHERE ${clauses.join(' AND ')}
       ORDER BY t.team_rating DESC, t.user_id DESC
       LIMIT 100`,
      params
    );
    res.json({ teachers: rows });
  } catch (err) {
    next(err);
  }
});

// ---- "my profile" management (teacher only) — must come before /:id ----

// GET /api/teachers/me/full — everything the dashboard profile wizard needs
router.get('/me/full', requireRole('teacher'), async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const [[teacher]] = await db.query(
      `SELECT t.*, u.email, u.phone, c.name AS city
       FROM teachers t JOIN users u ON u.id = t.user_id LEFT JOIN cities c ON c.id = t.city_id
       WHERE t.user_id = ?`,
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: 'Teacher profile not found.' });

    const [expertise] = await db.query(
      `SELECT ys.id, ys.name FROM teacher_expertise te JOIN yoga_styles ys ON ys.id = te.style_id WHERE te.teacher_user_id = ?`,
      [userId]
    );
    const [certifications] = await db.query(
      `SELECT tc.id, tc.certification_type_id, ct.name AS certification_type, tc.certification_name_other,
              tc.issuing_body, tc.status, tc.verified_at, (tc.document_url IS NOT NULL) AS has_file
       FROM teacher_certifications tc LEFT JOIN certification_types ct ON ct.id = tc.certification_type_id
       WHERE tc.teacher_user_id = ? ORDER BY tc.id DESC`,
      [userId]
    );
    const [documents] = await db.query(
      `SELECT id, doc_type, status, uploaded_at, (file_url IS NOT NULL) AS has_file
       FROM teacher_documents WHERE teacher_user_id = ? ORDER BY id DESC`,
      [userId]
    );
    const [locations] = await db.query(
      `SELECT id, location_label FROM teacher_online_locations WHERE teacher_user_id = ? ORDER BY id`,
      [userId]
    );
    const [packages] = await db.query(
      `SELECT id, session_count, total_price FROM teacher_pricing_packages WHERE teacher_user_id = ? ORDER BY session_count`,
      [userId]
    );
    const [availability] = await db.query(
      `SELECT day_of_week, time_slot, is_available FROM teacher_weekly_availability WHERE teacher_user_id = ?`,
      [userId]
    );
    const [certTypes] = await db.query('SELECT id, name FROM certification_types ORDER BY name');

    res.json({ teacher, expertise, certifications, documents, locations, packages, availability, certTypes });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teachers/me/update — update own profile
router.put('/me/update', requireRole('teacher'), async (req, res, next) => {
  try {
    const { full_name, gender, years_experience, teaching_mode, qualifications, bio, per_session_price, trial_price, city, pincode } = req.body;
    const cityId = city !== undefined ? await findCityId(city) : undefined;

    await db.query(
      `UPDATE teachers SET
        full_name = COALESCE(?, full_name),
        gender = COALESCE(?, gender),
        years_experience = COALESCE(?, years_experience),
        teaching_mode = COALESCE(?, teaching_mode),
        qualifications = COALESCE(?, qualifications),
        bio = COALESCE(?, bio),
        per_session_price = COALESCE(?, per_session_price),
        trial_price = COALESCE(?, trial_price),
        city_id = COALESCE(?, city_id),
        pincode = COALESCE(?, pincode)
       WHERE user_id = ?`,
      [full_name, gender, years_experience, teaching_mode, qualifications, bio, per_session_price, trial_price, cityId, pincode, req.session.user.id]
    );

    logAudit(req.session.user.id, 'Updated profile', 'teacher', req.session.user.id);
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/teachers/me/photo — upload/replace profile photo (multipart, field name "photo")
router.post('/me/photo', requireRole('teacher'), uploadPhoto.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });
    const url = `/uploads/photos/${req.file.filename}`;
    await db.query('UPDATE teachers SET profile_photo_url = ? WHERE user_id = ?', [url, req.session.user.id]);
    res.json({ profile_photo_url: url });
  } catch (err) {
    next(err);
  }
});

// ---- expertise (yoga styles) ----

router.post('/me/expertise', requireRole('teacher'), async (req, res, next) => {
  try {
    const { style } = req.body;
    if (!style) return res.status(400).json({ error: 'style is required.' });
    const [styleRows] = await db.query('SELECT id, name FROM yoga_styles WHERE name = ?', [style.trim()]);
    if (!styleRows.length) return res.status(404).json({ error: 'Unknown style.' });
    await db.query(
      'INSERT IGNORE INTO teacher_expertise (teacher_user_id, style_id) VALUES (?, ?)',
      [req.session.user.id, styleRows[0].id]
    );
    res.status(201).json({ id: styleRows[0].id, name: styleRows[0].name });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/expertise/:styleId', requireRole('teacher'), async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM teacher_expertise WHERE teacher_user_id = ? AND style_id = ?',
      [req.session.user.id, req.params.styleId]
    );
    res.json({ message: 'Removed.' });
  } catch (err) {
    next(err);
  }
});

// ---- online locations (tags) ----

router.post('/me/locations', requireRole('teacher'), async (req, res, next) => {
  try {
    const { location_label } = req.body;
    if (!location_label || !location_label.trim()) return res.status(400).json({ error: 'location_label is required.' });
    const [result] = await db.query(
      'INSERT INTO teacher_online_locations (teacher_user_id, location_label) VALUES (?, ?)',
      [req.session.user.id, location_label.trim()]
    );
    res.status(201).json({ id: result.insertId, location_label: location_label.trim() });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/locations/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    await db.query('DELETE FROM teacher_online_locations WHERE id = ? AND teacher_user_id = ?', [req.params.id, req.session.user.id]);
    res.json({ message: 'Removed.' });
  } catch (err) {
    next(err);
  }
});

// ---- certifications ----

router.post('/me/certifications', requireRole('teacher'), uploadCert.single('file'), async (req, res, next) => {
  try {
    const { certification_type_id, certification_name_other, issuing_body } = req.body;
    const fileUrl = req.file ? `certifications/${req.file.filename}` : null;
    const [result] = await db.query(
      `INSERT INTO teacher_certifications (teacher_user_id, certification_type_id, certification_name_other, issuing_body, document_url, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.session.user.id, certification_type_id || null, certification_name_other || null, issuing_body || null, fileUrl]
    );
    res.status(201).json({ id: result.insertId, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/certifications/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    await db.query('DELETE FROM teacher_certifications WHERE id = ? AND teacher_user_id = ?', [req.params.id, req.session.user.id]);
    res.json({ message: 'Removed.' });
  } catch (err) {
    next(err);
  }
});

// ---- identity documents ----

router.post('/me/documents', requireRole('teacher'), uploadDoc.single('file'), async (req, res, next) => {
  try {
    const { doc_type } = req.body;
    const validTypes = ['aadhaar_front', 'aadhaar_back', 'government_id', 'liability_insurance', 'other'];
    if (!validTypes.includes(doc_type)) return res.status(400).json({ error: 'Invalid doc_type.' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const fileUrl = `documents/${req.file.filename}`;

    const [existing] = await db.query(
      'SELECT id FROM teacher_documents WHERE teacher_user_id = ? AND doc_type = ?',
      [req.session.user.id, doc_type]
    );
    if (existing.length) {
      await db.query(
        `UPDATE teacher_documents SET file_url = ?, status = 'pending', uploaded_at = NOW(), verified_by = NULL, verified_at = NULL WHERE id = ?`,
        [fileUrl, existing[0].id]
      );
      return res.json({ id: existing[0].id, status: 'pending' });
    }
    const [result] = await db.query(
      `INSERT INTO teacher_documents (teacher_user_id, doc_type, file_url, status, uploaded_at) VALUES (?, ?, ?, 'pending', NOW())`,
      [req.session.user.id, doc_type, fileUrl]
    );
    res.status(201).json({ id: result.insertId, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

// GET /api/teachers/me/files/:kind/:id — stream a private cert/document file to its owner or an admin
router.get('/me/files/:kind/:id', requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { kind, id } = req.params;
    const table = kind === 'certification' ? 'teacher_certifications' : kind === 'document' ? 'teacher_documents' : null;
    const column = kind === 'certification' ? 'document_url' : 'file_url';
    if (!table) return res.status(400).json({ error: 'Invalid file kind.' });

    const [rows] = await db.query(`SELECT teacher_user_id, ${column} AS rel_path FROM ${table} WHERE id = ?`, [id]);
    if (!rows.length || !rows[0].rel_path) return res.status(404).json({ error: 'File not found.' });
    if (req.session.user.role !== 'admin' && rows[0].teacher_user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Not your file.' });
    }
    res.sendFile(path.join(UPLOAD_ROOT, rows[0].rel_path));
  } catch (err) {
    next(err);
  }
});

// ---- pricing packages ----

router.get('/me/packages', requireRole('teacher'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, session_count, total_price FROM teacher_pricing_packages WHERE teacher_user_id = ? ORDER BY session_count',
      [req.session.user.id]
    );
    res.json({ packages: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/me/packages', requireRole('teacher'), async (req, res, next) => {
  try {
    const { session_count, total_price } = req.body;
    if (!session_count || !total_price) return res.status(400).json({ error: 'session_count and total_price are required.' });
    const [result] = await db.query(
      'INSERT INTO teacher_pricing_packages (teacher_user_id, session_count, total_price) VALUES (?, ?, ?)',
      [req.session.user.id, session_count, total_price]
    );
    res.status(201).json({ id: result.insertId, session_count, total_price });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/packages/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    await db.query('DELETE FROM teacher_pricing_packages WHERE id = ? AND teacher_user_id = ?', [req.params.id, req.session.user.id]);
    res.json({ message: 'Removed.' });
  } catch (err) {
    next(err);
  }
});

// ---- weekly availability ----

router.get('/me/availability', requireRole('teacher'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT day_of_week, time_slot, is_available FROM teacher_weekly_availability WHERE teacher_user_id = ?',
      [req.session.user.id]
    );
    res.json({ availability: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teachers/me/availability — upsert a single slot's on/off state
router.put('/me/availability', requireRole('teacher'), async (req, res, next) => {
  try {
    const { day_of_week, time_slot, is_available } = req.body;
    if (!day_of_week || !time_slot) return res.status(400).json({ error: 'day_of_week and time_slot are required.' });

    const [existing] = await db.query(
      'SELECT id, booked_connection_id FROM teacher_weekly_availability WHERE teacher_user_id = ? AND day_of_week = ? AND time_slot = ?',
      [req.session.user.id, day_of_week, time_slot]
    );
    // Mirrors the CHECK constraint dropped from the schema for MySQL FK reasons:
    // a booked slot can't be switched off without clearing the booking first.
    if (existing.length && existing[0].booked_connection_id && !is_available) {
      return res.status(400).json({ error: 'This slot has a booked class — it can\'t be turned off directly.' });
    }

    if (existing.length) {
      await db.query('UPDATE teacher_weekly_availability SET is_available = ? WHERE id = ?', [is_available ? 1 : 0, existing[0].id]);
    } else {
      await db.query(
        'INSERT INTO teacher_weekly_availability (teacher_user_id, day_of_week, time_slot, is_available) VALUES (?, ?, ?, ?)',
        [req.session.user.id, day_of_week, time_slot, is_available ? 1 : 0]
      );
    }
    logAudit(req.session.user.id, 'Updated weekly availability', 'teacher', req.session.user.id);
    res.json({ day_of_week, time_slot, is_available: !!is_available });
  } catch (err) {
    next(err);
  }
});

// ---- ratings received ----

router.get('/me/ratings', requireRole('teacher'), async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const [[summary]] = await db.query(
      `SELECT ROUND(AVG(stars), 1) AS avg_rating, COUNT(*) AS rating_count
       FROM ratings WHERE teacher_user_id = ? AND status = 'published'`,
      [userId]
    );
    const [reviews] = await db.query(
      `SELECT r.id, r.stars, r.review_text, r.created_at, c.full_name AS client_name
       FROM ratings r JOIN clients c ON c.user_id = r.client_user_id
       WHERE r.teacher_user_id = ? AND r.status = 'published'
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json({ summary: summary || { avg_rating: null, rating_count: 0 }, reviews, team_rating: null });
  } catch (err) {
    next(err);
  }
});

// ---- wallet (balances always computed from the ledger, never stored) ----

router.get('/me/wallet', requireRole('teacher'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT credit_type, SUM(delta_amount) AS balance
       FROM wallet_transactions WHERE user_id = ? GROUP BY credit_type`,
      [req.session.user.id]
    );
    const byType = {};
    rows.forEach((r) => { byType[r.credit_type] = Number(r.balance); });
    res.json({ balances: byType });
  } catch (err) {
    next(err);
  }
});

// POST /api/teachers/me/wallet/claim-completion-bonus — one-time credit once
// every profile section has something in it. Idempotent: checks the ledger
// for an existing grant before inserting, and re-checks completion here
// rather than trusting the client's claim.
router.post('/me/wallet/claim-completion-bonus', requireRole('teacher'), async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const [already] = await db.query(
      "SELECT id FROM wallet_transactions WHERE user_id = ? AND credit_type = 'profile_completion_bonus' LIMIT 1",
      [userId]
    );
    if (already.length) return res.json({ granted: false, reason: 'already_claimed' });

    const [[t]] = await db.query('SELECT full_name, city_id, bio, per_session_price FROM teachers WHERE user_id = ?', [userId]);
    const [[{ n: expertiseCount }]] = await db.query('SELECT COUNT(*) AS n FROM teacher_expertise WHERE teacher_user_id = ?', [userId]);
    const [[{ n: certCount }]] = await db.query('SELECT COUNT(*) AS n FROM teacher_certifications WHERE teacher_user_id = ?', [userId]);
    const [[{ n: availCount }]] = await db.query('SELECT COUNT(*) AS n FROM teacher_weekly_availability WHERE teacher_user_id = ? AND is_available = 1', [userId]);

    const complete = !!(t && t.full_name) && expertiseCount > 0 && certCount > 0 && !!(t.city_id && t.bio) && availCount > 0 && !!(t && t.per_session_price);
    if (!complete) return res.json({ granted: false, reason: 'not_complete' });

    await db.query(
      "INSERT INTO wallet_transactions (user_id, credit_type, delta_amount, reason) VALUES (?, 'profile_completion_bonus', 2, 'Profile 100% complete')",
      [userId]
    );
    res.json({ granted: true, delta_amount: 2 });
  } catch (err) {
    next(err);
  }
});

// GET /api/teachers/:id — public profile (must stay after all /me/* routes above)
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ${PUBLIC_TEACHER_FIELDS}
       FROM teachers t
       LEFT JOIN cities c ON c.id = t.city_id
       WHERE t.user_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Teacher not found.' });

    const [expertise] = await db.query(
      `SELECT ys.name FROM teacher_expertise te JOIN yoga_styles ys ON ys.id = te.style_id WHERE te.teacher_user_id = ?`,
      [req.params.id]
    );
    const [ratingRow] = await db.query(
      `SELECT ROUND(AVG(stars), 1) AS avg_rating, COUNT(*) AS rating_count
       FROM ratings WHERE teacher_user_id = ? AND status = 'published'`,
      [req.params.id]
    );

    res.json({
      teacher: rows[0],
      expertise: expertise.map((r) => r.name),
      rating: ratingRow[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
