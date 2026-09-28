const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { BLOCK_KEY, getDefaults, merge } = require('../utils/aboutContent');
const pageContent = require('../utils/pageContent');

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

// Same idea for the Terms / Privacy / Refund / Contact pages (slug validated by the caller).
async function loadPageContent(slug) {
  const [rows] = await db.query(
    'SELECT content, last_edited_at FROM cms_content_blocks WHERE block_key = ?',
    [pageContent.blockKey(slug)]
  );
  let saved = null;
  if (rows.length) {
    try { saved = JSON.parse(rows[0].content); } catch (e) { saved = null; }
  }
  return { content: pageContent.effective(slug, saved), updated_at: rows.length ? rows[0].last_edited_at : null };
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

// GET /api/content/pages/:slug — public (terms | privacy | refund | contact)
router.get('/pages/:slug', async (req, res, next) => {
  try {
    if (!pageContent.isSlug(req.params.slug)) return res.status(404).json({ error: 'Page not found.' });
    res.set('Cache-Control', 'no-cache');
    res.json(await loadPageContent(req.params.slug));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.loadAboutContent = loadAboutContent;
module.exports.loadPageContent = loadPageContent;
