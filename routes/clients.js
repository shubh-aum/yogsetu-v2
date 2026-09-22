const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');

const PUBLIC_PHOTO_DIR = path.join(__dirname, '..', 'public', 'uploads', 'photos');
fs.mkdirSync(PUBLIC_PHOTO_DIR, { recursive: true });

const uploadPhoto = multer({
  storage: multer.diskStorage({
    destination: PUBLIC_PHOTO_DIR,
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(8).toString('hex');
      cb(null, `${req.session.user.id}-${Date.now()}-${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function findCityId(cityName) {
  if (!cityName) return null;
  const [rows] = await db.query('SELECT id FROM cities WHERE name = ? LIMIT 1', [cityName.trim()]);
  return rows.length ? rows[0].id : null;
}

// GET /api/clients/me/full — everything the dashboard profile tab needs
router.get('/me/full', requireRole('client'), async (req, res, next) => {
  try {
    const [[client]] = await db.query(
      `SELECT cl.*, u.email, u.phone, c.name AS city
       FROM clients cl JOIN users u ON u.id = cl.user_id LEFT JOIN cities c ON c.id = cl.city_id
       WHERE cl.user_id = ?`,
      [req.session.user.id]
    );
    res.json({ client: client || null });
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/me/update
router.put('/me/update', requireRole('client'), async (req, res, next) => {
  try {
    const { full_name, gender, city, pincode, looking_for, bio, phone } = req.body;
    if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'Full name is required.' });

    const cityId = await findCityId(city);
    await db.query(
      `UPDATE clients SET full_name = ?, gender = ?, city_id = ?, pincode = ?, looking_for = ?, bio = ? WHERE user_id = ?`,
      [full_name.trim(), gender || 'undisclosed', cityId, pincode || null, looking_for || null, bio || null, req.session.user.id]
    );
    if (phone && phone.trim()) {
      await db.query('UPDATE users SET phone = ? WHERE id = ?', [phone.trim(), req.session.user.id]);
    }
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/me/password
router.put('/me/password', requireRole('client'), async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Current password and a new password (6+ characters) are required.' });
    }
    const [[row]] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.session.user.id]);
    const ok = row && (await bcrypt.compare(current_password, row.password_hash));
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.user.id]);
    res.json({ message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients/me/photo (multipart, field name "photo")
router.post('/me/photo', requireRole('client'), uploadPhoto.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });
    const url = `/uploads/photos/${req.file.filename}`;
    await db.query('UPDATE clients SET profile_photo_url = ? WHERE user_id = ?', [url, req.session.user.id]);
    res.json({ profile_photo_url: url });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/me/wallet
router.get('/me/wallet', requireRole('client'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT credit_type, SUM(delta_amount) AS balance FROM wallet_transactions WHERE user_id = ? GROUP BY credit_type`,
      [req.session.user.id]
    );
    const byType = {};
    rows.forEach((r) => { byType[r.credit_type] = Number(r.balance); });
    res.json({ balances: byType });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
