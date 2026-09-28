const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { BLOCK_KEY, getDefaults, merge } = require('../utils/aboutContent');

// Loads the saved About-page document and merges it over the defaults. Shared
// with the admin editor so both always see the same effective content.
async function loadAboutContent() {
  const [rows] = await db.query(
    'SELECT content, last_edited_at FROM cms_content_blocks WHERE block_key = ?',
    [BLOCK_KEY]
  );
  let saved = null;
  if (rows.length) {
    try { saved = JSON.parse(rows[0].content); } catch (e) { saved = null; }
  }
  return { content: merge(getDefaults(), saved), updated_at: rows.length ? rows[0].last_edited_at : null };
}

// GET /api/content/about — public
router.get('/about', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-cache');
    res.json(await loadAboutContent());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.loadAboutContent = loadAboutContent;
