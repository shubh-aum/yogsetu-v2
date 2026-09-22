const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/db');
const { logAudit } = require('../utils/audit');

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

// POST /api/auth/otp/send — stub until a real SMS provider is wired in.
// Doesn't actually send anything; /otp/verify accepts any 6-digit code.
router.post('/otp/send', (req, res) => {
  const phone = (req.body.phone || '').trim();
  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  }
  res.json({ sent: true, phone });
});

// POST /api/auth/otp/verify — stub: any 6-digit code is accepted.
router.post('/otp/verify', (req, res) => {
  const phone = (req.body.phone || '').trim();
  const code = (req.body.code || '').trim();
  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the 6-digit code.' });
  }
  res.json({ verified: true, phone });
});

// POST /api/auth/signup — client or teacher account creation
router.post('/signup', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { role, name, email, phone, password, city, style, need } = req.body;

    if (!['client', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'role must be client or teacher.' });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cityId = await findCityId(city);

    await conn.beginTransaction();

    const [userResult] = await conn.query(
      'INSERT INTO users (email, phone, password_hash, role) VALUES (?, ?, ?, ?)',
      [email.trim().toLowerCase(), phone ? phone.trim() : null, passwordHash, role]
    );
    const userId = userResult.insertId;

    if (role === 'client') {
      await conn.query(
        'INSERT INTO clients (user_id, full_name, city_id, looking_for) VALUES (?, ?, ?, ?)',
        [userId, name.trim(), cityId, need ? need.trim() : null]
      );
      await conn.query(
        `INSERT INTO wallet_transactions (user_id, credit_type, delta_amount, reason) VALUES
          (?, 'free_requirement_posting', 1, 'Signup bonus'), (?, 'free_connection', 1, 'Signup bonus')`,
        [userId, userId]
      );
    } else {
      await conn.query(
        'INSERT INTO teachers (user_id, full_name, city_id, bio) VALUES (?, ?, ?, ?)',
        [userId, name.trim(), cityId, need ? need.trim() : null]
      );
      const styleId = await findStyleId(style);
      if (styleId) {
        await conn.query(
          'INSERT INTO teacher_expertise (teacher_user_id, style_id) VALUES (?, ?)',
          [userId, styleId]
        );
      }
    }

    await conn.commit();

    req.session.user = { id: userId, email: email.trim().toLowerCase(), role };
    res.status(201).json({ user: req.session.user });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const [rows] = await db.query(
      'SELECT id, email, password_hash, role, status FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const roleMatches = !role || user.role === role || (role === 'admin' && user.role === 'subadmin');
    if (!roleMatches) {
      return res.status(401).json({ error: `This account is not registered as a ${role}.` });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'This account has been blocked. Contact support.' });
    }

    req.session.user = { id: user.id, email: user.email, role: user.role };
    logAudit(user.id, 'Logged in', 'user', user.id);
    res.json({ user: req.session.user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

module.exports = router;
