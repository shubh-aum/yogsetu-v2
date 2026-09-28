// Slug allocation for teachers and job posts. `exec` is any object with a
// mysql2 promise `.query` (the pool, or a transaction connection).
const { slugify, uniqueSlug } = require('../lib/slug');

// Words that must never become a teacher/job slug because they are route segments.
const RESERVED = new Set(['online', 'all', 'new', 'search', 'page', 'map', 'sitemap']);

async function reservedForCity(exec, cityId) {
  const set = new Set(RESERVED);
  const [styles] = await exec.query('SELECT slug FROM yoga_styles WHERE slug IS NOT NULL');
  styles.forEach((r) => set.add(r.slug));
  if (cityId) {
    const [locs] = await exec.query('SELECT slug FROM localities WHERE city_id = ?', [cityId]);
    locs.forEach((r) => set.add(r.slug));
  }
  return set;
}

// Teacher slugs are globally unique (they identify a person) and, because the
// public URL is /yoga-teachers/:city/:slug, must not collide with that city's
// locality or specialty slugs.
async function teacherSlug(exec, name, cityId, excludeUserId) {
  const base = slugify(name) || 'teacher';
  const reserved = await reservedForCity(exec, cityId);
  const [rows] = await exec.query(
    'SELECT slug FROM teachers WHERE slug LIKE ? AND user_id <> ?',
    [`${base}%`, excludeUserId || 0]
  );
  const taken = new Set(rows.map((r) => r.slug));
  return uniqueSlug(base, (s) => taken.has(s) || reserved.has(s));
}

// Shorten a title to a readable slug: whole words, <= 60 chars.
function titleBase(title) {
  const full = slugify(title, 120);
  if (full.length <= 60) return full;
  const cut = full.slice(0, 60);
  const lastDash = cut.lastIndexOf('-');
  return lastDash > 25 ? cut.slice(0, lastDash) : cut;
}

// Job slugs are unique inside their (city, locality) bucket, matching the URL
// /yoga-jobs/:city/:locality/:slug — and avoid that city's locality slugs so
// /yoga-jobs/:city/:x is never ambiguous.
async function jobSlug(exec, title, cityId, localityId, excludeId) {
  const base = titleBase(title) || 'yoga-teacher-required';
  const reserved = await reservedForCity(exec, cityId);
  const [rows] = await exec.query(
    `SELECT slug FROM requirements
      WHERE slug LIKE ? AND id <> ? AND city_id <=> ? AND locality_id <=> ?`,
    [`${base}%`, excludeId || 0, cityId || null, localityId || null]
  );
  const taken = new Set(rows.map((r) => r.slug));
  return uniqueSlug(base, (s) => taken.has(s) || reserved.has(s));
}

// Find-or-create a locality inside a city (used when a teacher/client types an area).
async function findOrCreateLocality(exec, cityId, name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  if (!cityId || !clean) return null;
  const [rows] = await exec.query('SELECT id FROM localities WHERE city_id = ? AND name = ? LIMIT 1', [cityId, clean]);
  if (rows.length) return rows[0].id;
  const [existing] = await exec.query('SELECT slug FROM localities WHERE city_id = ?', [cityId]);
  const taken = new Set(existing.map((r) => r.slug));
  const [styles] = await exec.query('SELECT slug FROM yoga_styles WHERE slug IS NOT NULL');
  styles.forEach((r) => taken.add(r.slug));
  RESERVED.forEach((r) => taken.add(r));
  const slug = uniqueSlug(clean, (s) => taken.has(s));
  const [result] = await exec.query('INSERT INTO localities (city_id, name, slug) VALUES (?, ?, ?)', [cityId, clean, slug]);
  return result.insertId;
}

module.exports = { teacherSlug, jobSlug, findOrCreateLocality, titleBase };
