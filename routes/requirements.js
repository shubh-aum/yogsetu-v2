const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { jobSlug, findOrCreateLocality } = require('../services/slugs');

async function findCityId(cityName) {
  if (!cityName) return null;
  const [rows] = await db.query('SELECT id FROM cities WHERE name = ? LIMIT 1', [cityName.trim()]);
  return rows.length ? rows[0].id : null;
}

async function findStyleId(styleName) {
  if (!styleName) return null;
  const [rows] = await db.query('SELECT id FROM yoga_styles WHERE name = ? LIMIT 1', [styleName.trim()]);
  return rows.length ? rows[0].id : null;
}

async function findCertTypeId(name) {
  if (!name) return null;
  const [rows] = await db.query('SELECT id FROM certification_types WHERE name = ? LIMIT 1', [name.trim()]);
  return rows.length ? rows[0].id : null;
}

// POST /api/requirements — client posts a new requirement (or admin posts on behalf of an existing client)
router.post('/', requireRole('client', 'admin'), async (req, res, next) => {
  try {
    const {
      title, style, purpose, certification_required, preferred_gender, mode,
      demo_class_time, location, locality, city, pincode, timing, schedule, level, budget_min, budget_max, budget_note,
      description, needs, schedule_days, slots, client_user_id, source,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required.' });

    let clientUserId = req.session.user.id;
    let postedByAdminId = null;
    let src = 'platform';
    if (req.session.user.role === 'admin') {
      if (!client_user_id) return res.status(400).json({ error: 'client_user_id is required when an admin posts on behalf of a client.' });
      const [clientRows] = await db.query('SELECT user_id FROM clients WHERE user_id = ?', [client_user_id]);
      if (!clientRows.length) return res.status(404).json({ error: 'Client account not found.' });
      clientUserId = client_user_id;
      postedByAdminId = req.session.user.id;
      src = ['phone_call', 'whatsapp', 'walk_in', 'referral'].includes(source) ? source : 'phone_call';
    }

    const styleId = await findStyleId(style);
    const certId = await findCertTypeId(certification_required);
    const cityId = await findCityId(city);
    const areaName = String(locality || location || '').trim();
    const localityId = await findOrCreateLocality(db, cityId, areaName);
    const slotList = Array.isArray(slots) ? slots.filter(Boolean).map((s) => String(s).slice(0, 50)) : [];
    const scheduleText = String(schedule || timing || slotList.join(', ') || '').trim().slice(0, 200) || null;
    const slug = await jobSlug(db, title, cityId, localityId);
    const experienceLevel = ['any', 'beginner', 'intermediate', 'advanced'].includes(level) ? level : 'any';

    const [result] = await db.query(
      `INSERT INTO requirements
        (client_user_id, title, slug, style_id, purpose, certification_required_id, preferred_gender, mode,
         demo_class_time, city_id, locality_id, pincode, area, budget_min, budget_max, budget_note, description,
         schedule_text, experience_level, source, posted_by_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientUserId, title.trim(), slug, styleId, purpose || 'personal_practice', certId,
        preferred_gender || 'no_preference', mode || 'either', demo_class_time || null, cityId, localityId,
        pincode || null, areaName || null, budget_min || null, budget_max || null,
        budget_note ? String(budget_note).trim().slice(0, 120) : null,
        description ? description.trim() : null, scheduleText, experienceLevel, src, postedByAdminId,
      ]
    );

    if (slotList.length) {
      await db.query('INSERT IGNORE INTO requirement_availability_slots (requirement_id, slot_label) VALUES ?', [slotList.map((s) => [result.insertId, s])]);
    }
    // "what they're looking for" checklist: array, or one item per line
    const needList = (Array.isArray(needs) ? needs : String(needs || '').split('\n'))
      .map((n) => String(n).trim().slice(0, 255)).filter(Boolean).slice(0, 10);
    if (needList.length) {
      await db.query('INSERT INTO requirement_needs (requirement_id, item_text, sort_order) VALUES ?', [needList.map((n, i) => [result.insertId, n, i])]);
    }
    // weekly schedule needed: [{ day: 1..7, time: "7:00 AM" }]
    const days = Array.isArray(schedule_days)
      ? schedule_days.filter((d) => d && Number(d.day) >= 1 && Number(d.day) <= 7 && d.time).map((d) => [result.insertId, Number(d.day), String(d.time).slice(0, 20)])
      : [];
    if (days.length) {
      await db.query('INSERT IGNORE INTO requirement_schedule (requirement_id, day_of_week, time_slot) VALUES ?', [days]);
    }

    logAudit(req.session.user.id, req.session.user.role === 'admin' ? 'Posted a requirement for a client' : 'Posted a requirement', 'requirement', result.insertId);
    res.status(201).json({ id: result.insertId, message: 'Requirement posted.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/requirements — public job board, open + visible only
router.get('/', async (req, res, next) => {
  try {
    const { city, style, mode } = req.query;
    const clauses = ["r.status = 'open'", 'r.is_visible = 1'];
    const params = [];

    if (city) { clauses.push('c.name = ?'); params.push(city); }
    if (mode) { clauses.push('r.mode IN (?, "either")'); params.push(mode); }
    if (style) { clauses.push('ys.name = ?'); params.push(style); }

    const [rows] = await db.query(
      `SELECT r.id, r.title, r.mode, r.budget_min, r.budget_max, r.description, r.created_at,
              c.name AS city, ys.name AS style,
              (SELECT COUNT(*) FROM requirement_applications ra WHERE ra.requirement_id = r.id) AS applicant_count
       FROM requirements r
       LEFT JOIN cities c ON c.id = r.city_id
       LEFT JOIN yoga_styles ys ON ys.id = r.style_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      params
    );
    res.json({ requirements: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/requirements/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, c.name AS city, ys.name AS style
       FROM requirements r
       LEFT JOIN cities c ON c.id = r.city_id
       LEFT JOIN yoga_styles ys ON ys.id = r.style_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Requirement not found.' });
    res.json({ requirement: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/requirements/:id/apply — teacher applies to a requirement
router.post('/:id/apply', requireRole('teacher'), async (req, res, next) => {
  try {
    const [reqRows] = await db.query("SELECT status FROM requirements WHERE id = ?", [req.params.id]);
    if (!reqRows.length) return res.status(404).json({ error: 'Requirement not found.' });
    if (reqRows[0].status !== 'open') return res.status(400).json({ error: 'This requirement is no longer open.' });

    await db.query(
      'INSERT INTO requirement_applications (requirement_id, teacher_user_id) VALUES (?, ?)',
      [req.params.id, req.session.user.id]
    );
    res.status(201).json({ message: 'Application submitted.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You have already applied to this requirement.' });
    }
    next(err);
  }
});

// GET /api/requirements/:id/applicants — client (owner) sees who applied to their requirement
router.get('/:id/applicants', requireRole('client'), async (req, res, next) => {
  try {
    const [reqRows] = await db.query('SELECT id FROM requirements WHERE id = ? AND client_user_id = ?', [req.params.id, req.session.user.id]);
    if (!reqRows.length) return res.status(404).json({ error: 'Requirement not found.' });

    const [applicants] = await db.query(
      `SELECT ra.id, ra.status, ra.applied_at, ra.decided_at,
              t.user_id AS teacher_user_id, t.full_name, t.years_experience, t.team_rating, t.profile_photo_url,
              c.name AS city,
              (SELECT GROUP_CONCAT(ys.name SEPARATOR ' & ') FROM teacher_expertise te JOIN yoga_styles ys ON ys.id = te.style_id WHERE te.teacher_user_id = t.user_id) AS styles,
              (SELECT ROUND(AVG(stars), 1) FROM ratings WHERE teacher_user_id = t.user_id AND status = 'published') AS avg_rating
       FROM requirement_applications ra
       JOIN teachers t ON t.user_id = ra.teacher_user_id
       LEFT JOIN cities c ON c.id = t.city_id
       WHERE ra.requirement_id = ?
       ORDER BY ra.applied_at ASC`,
      [req.params.id]
    );
    res.json({ applicants });
  } catch (err) {
    next(err);
  }
});

// POST /api/requirements/:id/applicants/:appId/decide — client approves or rejects an applicant
router.post('/:id/applicants/:appId/decide', requireRole('client'), async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or reject.' });
    }

    const [reqRows] = await conn.query('SELECT id, client_user_id, status FROM requirements WHERE id = ? AND client_user_id = ?', [req.params.id, req.session.user.id]);
    if (!reqRows.length) return res.status(404).json({ error: 'Requirement not found.' });

    const [appRows] = await conn.query(
      'SELECT id, teacher_user_id, status FROM requirement_applications WHERE id = ? AND requirement_id = ?',
      [req.params.appId, req.params.id]
    );
    if (!appRows.length) return res.status(404).json({ error: 'Application not found.' });
    if (appRows[0].status !== 'pending') return res.status(400).json({ error: 'This application has already been decided.' });

    await conn.beginTransaction();

    if (action === 'reject') {
      await conn.query("UPDATE requirement_applications SET status = 'rejected', decided_at = NOW() WHERE id = ?", [req.params.appId]);
      await conn.commit();
      logAudit(req.session.user.id, 'Rejected a requirement applicant', 'requirement_application', req.params.appId);
      return res.json({ message: 'Application rejected.' });
    }

    // approve: mark this one approved, auto-reject other pending applicants, mark requirement matched,
    // and create (or reuse) the connection — the teacher already opted in by applying, so it's approved directly.
    await conn.query("UPDATE requirement_applications SET status = 'approved', decided_at = NOW() WHERE id = ?", [req.params.appId]);
    await conn.query(
      "UPDATE requirement_applications SET status = 'rejected', decided_at = NOW() WHERE requirement_id = ? AND id != ? AND status = 'pending'",
      [req.params.id, req.params.appId]
    );
    await conn.query("UPDATE requirements SET status = 'matched' WHERE id = ?", [req.params.id]);

    const [existingConn] = await conn.query(
      'SELECT id FROM connections WHERE client_user_id = ? AND teacher_user_id = ?',
      [reqRows[0].client_user_id, appRows[0].teacher_user_id]
    );
    if (existingConn.length) {
      await conn.query(
        "UPDATE connections SET status = 'approved', origin = 'requirement_application', source_application_id = ?, decided_at = NOW(), whatsapp_shared_at = NOW() WHERE id = ?",
        [req.params.appId, existingConn[0].id]
      );
    } else {
      await conn.query(
        `INSERT INTO connections (client_user_id, teacher_user_id, origin, source_application_id, status, decided_at, whatsapp_shared_at)
         VALUES (?, ?, 'requirement_application', ?, 'approved', NOW(), NOW())`,
        [reqRows[0].client_user_id, appRows[0].teacher_user_id, req.params.appId]
      );
    }

    await conn.commit();
    logAudit(req.session.user.id, 'Approved a requirement applicant', 'requirement_application', req.params.appId);
    res.json({ message: 'Application approved — a connection has been created.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
