// One-off: move terms/privacy/refund/contact out of /public into views/pages as
// templates whose <main> is filled from the admin-managed content.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

['terms', 'privacy', 'refund', 'contact'].forEach((name) => {
  const src = path.join(root, 'public', `${name}.html`);
  const dest = path.join(root, 'views', 'pages', `${name}.html`);
  let html = fs.readFileSync(src, 'utf8');
  const a = html.indexOf('<main>');
  const b = html.indexOf('</main>');
  if (a < 0 || b < 0) throw new Error('no <main> in ' + name);
  html = html.slice(0, a) + '<main id="main">\n<!--@main-->\n' + html.slice(b);
  html = html.replace('<link rel="stylesheet" href="/assets/css/site.css">', '<link rel="stylesheet" href="/assets/css/site.css">\n<link rel="stylesheet" href="/assets/css/legal.css">');
  html = html.replace('<script src="/assets/js/site.js"></script>', '<script src="/assets/js/site.js"></script>\n<script src="/assets/js/legal.js"></script>');
  fs.writeFileSync(dest, html);
  fs.unlinkSync(src);
  console.log('moved', name);
});
