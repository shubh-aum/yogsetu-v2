// Cities, localities and yoga specialties — the lookup data every public
// listing page filters and links by.
const db = require('../config/db');

async function getStyles() {
  const [rows] = await db.query('SELECT id, name, slug, short_name AS shortName, description FROM yoga_styles ORDER BY id');
  return rows;
}

async function getStyleBySlug(slug) {
  const [rows] = await db.query('SELECT id, name, slug, short_name AS shortName, description FROM yoga_styles WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

async function getCityBySlug(slug) {
  const [rows] = await db.query('SELECT id, name, slug FROM cities WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

async function getLocalityBySlug(cityId, slug) {
  const [rows] = await db.query('SELECT id, city_id AS cityId, name, slug FROM localities WHERE city_id = ? AND slug = ? LIMIT 1', [cityId, slug]);
  return rows[0] || null;
}

// Cities that actually have something to show, with counts (drives filter
// dropdowns and the crawlable "browse by city" link lists).
async function getCitiesWithTeachers() {
  const [rows] = await db.query(
    `SELECT c.id, c.name, c.slug, COUNT(t.user_id) AS teacherCount
       FROM cities c
       LEFT JOIN teachers t ON t.city_id = c.id AND t.verification_status = 'verified'
      GROUP BY c.id ORDER BY c.name`
  );
  return rows;
}

async function getCitiesWithJobs() {
  const [rows] = await db.query(
    `SELECT c.id, c.name, c.slug, COUNT(r.id) AS jobCount
       FROM cities c
       LEFT JOIN requirements r ON r.city_id = c.id AND r.is_visible = 1 AND r.status = 'open'
      GROUP BY c.id ORDER BY c.name`
  );
  return rows;
}

async function getLocalities(cityId) {
  const [rows] = await db.query(
    `SELECT l.id, l.city_id AS cityId, l.name, l.slug,
            (SELECT COUNT(*) FROM teachers t WHERE t.locality_id = l.id AND t.verification_status = 'verified') AS teacherCount,
            (SELECT COUNT(*) FROM requirements r WHERE r.locality_id = l.id AND r.is_visible = 1 AND r.status = 'open') AS jobCount
       FROM localities l WHERE l.city_id = ? ORDER BY l.name`,
    [cityId]
  );
  return rows;
}

module.exports = { getStyles, getStyleBySlug, getCityBySlug, getLocalityBySlug, getCitiesWithTeachers, getCitiesWithJobs, getLocalities };
