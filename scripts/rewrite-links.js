// One-off codemod used when moving the site to root-absolute, extension-less
// URLs:  node scripts/rewrite-links.js [--dry]
// Rewrites href/src/poster attributes in public/*.html and views/pages/*.html.
// Safe to re-run — already-rewritten values are left alone.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = [path.join(ROOT, 'public'), path.join(ROOT, 'views', 'pages')];
const dry = process.argv.includes('--dry');

const PAGE_MAP = {
  'index.html': '/',
  'about.html': '/about',
  'contact.html': '/contact',
  'terms.html': '/terms',
  'privacy.html': '/privacy',
  'refund.html': '/refund',
  'teacher-benefits.html': '/teacher-benefits',
  'teachers.html': '/yoga-teachers',
  'requirements.html': '/yoga-jobs',
  'login.html': '/login',
  'signup.html': '/signup',
  'forgot-password.html': '/forgot-password',
  'post-requirement.html': '/post-requirement',
  'client-dashboard.html': '/client-dashboard',
  'teacher-dashboard.html': '/teacher-dashboard',
  'admin-dashboard.html': '/admin-dashboard',
};

function rewriteValue(value) {
  const m = value.match(/^([A-Za-z0-9_-]+\.html)(.*)$/);
  if (m && PAGE_MAP[m[1]]) {
    const rest = m[2]; // "", "#frag", "?query"
    if (m[1] === 'index.html') return rest.startsWith('#') ? `/${rest}` : `/${rest}`;
    return `${PAGE_MAP[m[1]]}${rest}`;
  }
  if (/^assets\//.test(value)) return `/${value}`;
  return value;
}

let changedFiles = 0;
DIRS.forEach((dir) => {
  fs.readdirSync(dir).filter((f) => f.endsWith('.html')).forEach((file) => {
    const full = path.join(dir, file);
    const before = fs.readFileSync(full, 'utf8');
    const after = before.replace(/\b(href|src|poster|action)=("|')([^"']*)\2/g, (all, attr, q, value) => {
      const next = rewriteValue(value);
      return next === value ? all : `${attr}=${q}${next}${q}`;
    });
    if (after !== before) {
      changedFiles += 1;
      console.log('rewrote', path.relative(ROOT, full));
      if (!dry) fs.writeFileSync(full, after);
    }
  });
});
console.log(dry ? `(dry run) ${changedFiles} files would change` : `${changedFiles} files updated`);
