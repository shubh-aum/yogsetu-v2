// One-off: dashboards link each requirement to its public, SEO-friendly job page.
const fs = require('fs');
const root = path => require('path').join(__dirname, '..', path);

// ---- API: add public_url to requirements (client) and applications (teacher)
let api = fs.readFileSync(root('routes/dashboard.js'), 'utf8');
const rep = (a, b) => { if (!api.includes(a)) throw new Error('dashboard.js anchor: ' + a.slice(0, 50)); api = api.replace(a, () => b); };
rep("const { requireRole } = require('../middleware/auth');", "const { requireRole } = require('../middleware/auth');\nconst { URLS } = require('../lib/site');\n\nconst withJobUrl = (row) => ({\n  ...row,\n  public_url: URLS.job({ slug: row.slug, citySlug: row.city_slug, localitySlug: row.locality_slug }),\n});");
rep(`      \`SELECT id, title, status, is_visible, created_at,
              (SELECT COUNT(*) FROM requirement_applications ra WHERE ra.requirement_id = requirements.id) AS applicant_count
       FROM requirements WHERE client_user_id = ? ORDER BY created_at DESC\`,`,
`      \`SELECT r.id, r.title, r.slug, r.status, r.is_visible, r.created_at, c.slug AS city_slug, l.slug AS locality_slug,
              (SELECT COUNT(*) FROM requirement_applications ra WHERE ra.requirement_id = r.id) AS applicant_count
       FROM requirements r
       LEFT JOIN cities c ON c.id = r.city_id
       LEFT JOIN localities l ON l.id = r.locality_id
       WHERE r.client_user_id = ? ORDER BY r.created_at DESC\`,`);
rep("    res.json({ requirements, connections });", "    res.json({ requirements: requirements.map(withJobUrl), connections });");
rep("      `SELECT ra.id, ra.status, ra.applied_at, r.title, r.id AS requirement_id,\n              r.budget_min, r.budget_max, r.mode, c.name AS city,",
    "      `SELECT ra.id, ra.status, ra.applied_at, r.title, r.slug, r.id AS requirement_id,\n              r.budget_min, r.budget_max, r.mode, c.name AS city, c.slug AS city_slug, l.slug AS locality_slug,");
rep("       LEFT JOIN cities c ON c.id = r.city_id\n       LEFT JOIN connections conn ON conn.source_application_id = ra.id",
    "       LEFT JOIN cities c ON c.id = r.city_id\n       LEFT JOIN localities l ON l.id = r.locality_id\n       LEFT JOIN connections conn ON conn.source_application_id = ra.id");
rep("    res.json({ profile: profile[0] || null, applications, connections, rating: ratingRow[0] });", "    res.json({ profile: profile[0] || null, applications: applications.map(withJobUrl), connections, rating: ratingRow[0] });");
fs.writeFileSync(root('routes/dashboard.js'), api);

// ---- front-ends
function link(file, pairs) {
  let s = fs.readFileSync(root(file), 'utf8');
  pairs.forEach(([a, b]) => { if (!s.includes(a)) throw new Error(file + ' anchor: ' + a.slice(0, 50)); s = s.split(a).join(b); });
  fs.writeFileSync(root(file), s);
}
link('public/client-dashboard.html', [
  ["<h4>' + esc(r.title) + '</h4>", "<h4><a href=\"' + esc(r.public_url || '/yoga-jobs') + '\" target=\"_blank\" rel=\"noopener\" style=\"color:inherit;text-decoration:none;\">' + esc(r.title) + '</a></h4>"],
]);
link('public/teacher-dashboard.html', [
  ["<h4>' + esc(a.title) + '</h4>", "<h4><a href=\"' + esc(a.public_url || '/yoga-jobs') + '\" target=\"_blank\" rel=\"noopener\" style=\"color:inherit;text-decoration:none;\">' + esc(a.title) + '</a></h4>"],
]);
console.log('dashboard links patched');
