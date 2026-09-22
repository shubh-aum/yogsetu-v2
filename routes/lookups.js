const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/lookups/styles
router.get('/styles', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM yoga_styles ORDER BY name');
    res.json({ styles: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/lookups/cities
router.get('/cities', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM cities ORDER BY name');
    res.json({ cities: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/lookups/certification-types
router.get('/certification-types', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM certification_types ORDER BY name');
    res.json({ certificationTypes: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/lookups/platform-settings — the public-safe subset (fee status, amount, pricing visibility)
router.get('/platform-settings', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('platform_fee_enabled','platform_fee_amount','pricing_visible_platform_wide')"
    );
    const settings = { platform_fee_enabled: 'false', platform_fee_amount: '0', pricing_visible_platform_wide: 'true' };
    rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
