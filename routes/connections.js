const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

// POST /api/connections — client requests a teacher directly (direct_browse)
router.post('/', requireRole('client'), async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { teacher_user_id, message } = req.body;
    if (!teacher_user_id) return res.status(400).json({ error: 'teacher_user_id is required.' });

    const [teacherRows] = await conn.query(
      "SELECT user_id FROM teachers WHERE user_id = ? AND verification_status = 'verified'",
      [teacher_user_id]
    );
    if (!teacherRows.length) return res.status(404).json({ error: 'Teacher not found or not yet verified.' });

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO connections (client_user_id, teacher_user_id, origin) VALUES (?, ?, 'direct_browse')`,
      [req.session.user.id, teacher_user_id]
    );
    if (message && message.trim()) {
      await conn.query(
        'INSERT INTO messages (connection_id, sender_user_id, body) VALUES (?, ?, ?)',
        [result.insertId, req.session.user.id, message.trim().slice(0, 2000)]
      );
    }
    await conn.commit();
    res.status(201).json({ message: 'Request sent to the teacher.', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You already have a connection with this teacher.' });
    }
    next(err);
  } finally {
    conn.release();
  }
});

// GET /api/connections — list the caller's own connections (client or teacher).
// Contact details (email/phone) are only included once a connection is approved.
router.get('/', async (req, res, next) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Please log in.' });
    const { role, id } = req.session.user;
    const column = role === 'teacher' ? 'teacher_user_id' : 'client_user_id';

    const [rows] = await db.query(
      `SELECT conn.id, conn.status, conn.origin, conn.decline_reason, conn.requested_at, conn.decided_at, conn.whatsapp_shared_at,
              conn.client_user_id, conn.teacher_user_id,
              cu.full_name AS client_name, tu.full_name AS teacher_name, tc.name AS teacher_city,
              (SELECT GROUP_CONCAT(ys.name SEPARATOR ' & ') FROM teacher_expertise te JOIN yoga_styles ys ON ys.id = te.style_id WHERE te.teacher_user_id = tu.user_id) AS teacher_styles,
              CASE WHEN conn.status = 'approved' THEN cu_user.email END AS client_email,
              CASE WHEN conn.status = 'approved' THEN cu_user.phone END AS client_phone,
              CASE WHEN conn.status = 'approved' THEN tu_user.email END AS teacher_email,
              CASE WHEN conn.status = 'approved' THEN tu_user.phone END AS teacher_phone,
              (SELECT body FROM messages WHERE connection_id = conn.id ORDER BY sent_at ASC LIMIT 1) AS first_message,
              r.id AS rating_id, r.stars AS rating_stars, r.review_text AS rating_text, r.created_at AS rated_at
       FROM connections conn
       LEFT JOIN clients cu ON cu.user_id = conn.client_user_id
       LEFT JOIN teachers tu ON tu.user_id = conn.teacher_user_id
       LEFT JOIN cities tc ON tc.id = tu.city_id
       LEFT JOIN users cu_user ON cu_user.id = conn.client_user_id
       LEFT JOIN users tu_user ON tu_user.id = conn.teacher_user_id
       LEFT JOIN ratings r ON r.connection_id = conn.id
       WHERE conn.${column} = ?
       ORDER BY conn.requested_at DESC`,
      [id]
    );
    res.json({ connections: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/connections/:id — teacher approves or declines a pending connection
router.patch('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const { action, decline_reason } = req.body;
    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or decline.' });
    }

    const [rows] = await db.query(
      'SELECT id, status FROM connections WHERE id = ? AND teacher_user_id = ?',
      [req.params.id, req.session.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Connection not found.' });
    if (rows[0].status !== 'pending') return res.status(400).json({ error: 'This connection has already been decided.' });

    const newStatus = action === 'approve' ? 'approved' : 'declined';
    await db.query(
      `UPDATE connections SET status = ?, decline_reason = ?, decided_at = NOW(),
        whatsapp_shared_at = IF(? = 'approved', NOW(), whatsapp_shared_at)
       WHERE id = ?`,
      [newStatus, action === 'decline' ? (decline_reason || null) : null, newStatus, req.params.id]
    );
    logAudit(req.session.user.id, action === 'approve' ? 'Accepted a connection request' : 'Declined a connection request', 'connection', req.params.id);
    res.json({ message: `Connection ${newStatus}.` });
  } catch (err) {
    next(err);
  }
});

// ---- messages: post-approval conversation thread on a connection ----

async function loadOwnedConnection(req) {
  const [rows] = await db.query(
    'SELECT id, status, client_user_id, teacher_user_id FROM connections WHERE id = ?',
    [req.params.id]
  );
  if (!rows.length) return null;
  const conn = rows[0];
  const { id, role } = req.session.user;
  const owns = (role === 'client' && conn.client_user_id === id) || (role === 'teacher' && conn.teacher_user_id === id);
  return owns ? conn : null;
}

router.get('/:id/messages', async (req, res, next) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Please log in.' });
    const conn = await loadOwnedConnection(req);
    if (!conn) return res.status(404).json({ error: 'Connection not found.' });

    const [messages] = await db.query(
      `SELECT m.id, m.body, m.sent_at, m.sender_user_id,
              CASE WHEN m.sender_user_id = ? THEN 'me' ELSE 'them' END AS direction
       FROM messages m WHERE m.connection_id = ? ORDER BY m.sent_at ASC`,
      [req.session.user.id, req.params.id]
    );
    res.json({ connection: conn, messages });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/messages', async (req, res, next) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Please log in.' });
    const conn = await loadOwnedConnection(req);
    if (!conn) return res.status(404).json({ error: 'Connection not found.' });
    if (conn.status !== 'approved') return res.status(400).json({ error: 'Messaging opens once the connection is approved.' });

    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message body is required.' });

    const [result] = await db.query(
      'INSERT INTO messages (connection_id, sender_user_id, body) VALUES (?, ?, ?)',
      [req.params.id, req.session.user.id, body.slice(0, 2000)]
    );
    res.status(201).json({ id: result.insertId, body, sent_at: new Date(), direction: 'me' });
  } catch (err) {
    next(err);
  }
});

// POST /api/connections/:id/rating — client rates the teacher on an approved connection (once)
router.post('/:id/rating', requireRole('client'), async (req, res, next) => {
  try {
    const { stars, review_text } = req.body;
    const n = Number(stars);
    if (!n || n < 1 || n > 5) return res.status(400).json({ error: 'stars must be between 1 and 5.' });

    const [rows] = await db.query(
      'SELECT id, teacher_user_id, status FROM connections WHERE id = ? AND client_user_id = ?',
      [req.params.id, req.session.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Connection not found.' });
    if (rows[0].status !== 'approved') return res.status(400).json({ error: 'You can only rate an approved connection.' });

    await db.query(
      'INSERT INTO ratings (connection_id, teacher_user_id, client_user_id, stars, review_text) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, rows[0].teacher_user_id, req.session.user.id, n, (review_text || '').trim().slice(0, 2000) || null]
    );
    res.status(201).json({ message: 'Rating submitted.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You have already rated this connection.' });
    }
    next(err);
  }
});

module.exports = router;
