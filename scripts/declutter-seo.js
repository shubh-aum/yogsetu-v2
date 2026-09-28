// One-off: take the visible SEO copy off the directory pages.
//  - remove the intro block (breadcrumbs + heading + paragraph) and the hero "in <city>" suffix
//  - move the "browse by" link lists to below the footer
// Structured data (JSON-LD), titles, meta descriptions and canonicals are untouched.
const fs = require('fs');
const path = require('path');
const root = (p) => path.join(__dirname, '..', p);

function edit(file, fn) {
  const full = root(file);
  const before = fs.readFileSync(full, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error('no change: ' + file);
  fs.writeFileSync(full, after);
  console.log('updated', file);
}
const must = (s, needle) => { if (!s.includes(needle)) throw new Error('missing: ' + needle.slice(0, 60)); return s; };

// ---- templates: drop intro slots, move links below the footer
['views/pages/teachers.html', 'views/pages/requirements.html'].forEach((f) => edit(f, (s) => {
  s = must(s, '<!--@intro-->\n\n').replace('<!--@intro-->\n\n', '');
  s = must(s, '<!--@links-->\n\n').replace('<!--@links-->\n\n', '');
  s = s.replace('<!--@h1-place-->', '');
  s = must(s, '</footer>').replace('</footer>', '</footer>\n\n<!--@links-->');
  return s;
}));

// ---- views: summary text (for the meta description only) instead of visible intro HTML
edit('views/teachersPage.js', (s) => {
  const a = s.indexOf('// crawlable intro');
  const b = s.indexOf('// internal links for crawlers');
  if (a < 0 || b < 0) throw new Error('teachersPage anchors');
  const summary = `// plain-text summary of a listing — used for the meta description only (never rendered on the page)
function summary(ctx, teachers) {
  const place = ctx.locality ? \`\${ctx.locality.name}, \${ctx.city.name}\` : ctx.city ? ctx.city.name : 'India';
  const prices = teachers.map((t) => t.price).filter(Boolean);
  const styleNames = [...new Set(teachers.flatMap((t) => t.styles.map((s) => s.name)))].slice(0, 5);
  const parts = [\`\${teachers.length ? \`Browse \${teachers.length} credential-verified yoga teacher\${teachers.length === 1 ? '' : 's'}\` : 'Find verified yoga teachers'}\${ctx.style ? \` for \${ctx.style.name}\` : ''} \${ctx.city ? \`in \${place}\` : 'across India'}.\`];
  if (prices.length) parts.push(\`Sessions start at \${money(Math.min(...prices))}.\`);
  if (styleNames.length && !ctx.style) parts.push(\`Learn \${styleNames.join(', ')} and more.\`);
  if (ctx.style && ctx.style.description) parts.push(ctx.style.description);
  parts.push('Real certificates, honest ratings and free slots this week.');
  return parts.join(' ');
}

`;
  s = s.slice(0, a) + summary + s.slice(b);
  s = s.replace('module.exports = { card, categoryRows, heroAvatars, stylePills, cityOptions, styleOptions, styleFilters, h1, intro, linkLists };',
    'module.exports = { card, categoryRows, heroAvatars, stylePills, cityOptions, styleOptions, styleFilters, h1, summary, linkLists };');
  // the hero headline keeps its original wording on every page
  const h1a = s.indexOf('// H1: "Find Your Yoga Teacher"');
  const h1b = s.indexOf('// plain-text summary');
  s = s.slice(0, h1a) + `// hero headline keeps its original wording on every page
function h1() {
  return 'Find Your<br><em>Yoga Teacher</em>';
}

` + s.slice(h1b);
  return s;
});

edit('views/jobsPage.js', (s) => {
  const a = s.indexOf('function intro(ctx, jobs) {');
  const b = s.indexOf('function linkLists(ctx, data) {');
  if (a < 0 || b < 0) throw new Error('jobsPage anchors');
  const summary = `// plain-text summary of a listing — used for the meta description only (never rendered on the page)
function summary(ctx, jobs) {
  const place = ctx.online ? 'online' : ctx.locality ? \`\${ctx.locality.name}, \${ctx.city.name}\` : ctx.city ? ctx.city.name : 'India';
  const open = jobs.filter((j) => j.status === 'open').length;
  return \`\${open} open yoga teaching requirement\${open === 1 ? '' : 's'} \${ctx.online ? 'you can teach online' : \`in \${place}\`}\${ctx.style ? \` for \${ctx.style.name}\` : ''}. Clients post style, schedule, location and budget — verified teachers apply directly.\`;
}

`;
  s = s.slice(0, a) + summary + s.slice(b);
  s = s.replace('module.exports = { card, categoryRows, cityOptions, styleFilters, heroSelectStyles, intro, linkLists, bandOf };',
    'module.exports = { card, categoryRows, cityOptions, styleFilters, heroSelectStyles, summary, linkLists, bandOf };');
  return s.replace("const { breadcrumbsHtml, clip } = require('./common');", "const { clip } = require('./common');");
});

// ---- routes: use the summaries, no intro/h1-place slots
edit('routes/pages.js', (s) => {
  s = must(s, "  const introHtml = teachersView.intro(ctx, cards);\n  const description = introHtml.replace(/<section[\\s\\S]*?<\\/nav>/, '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');")
    .replace("  const introHtml = teachersView.intro(ctx, cards);\n  const description = introHtml.replace(/<section[\\s\\S]*?<\\/nav>/, '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');", '  const description = teachersView.summary(ctx, cards);');
  s = must(s, "    intro: introHtml,\n    'style-filters': teachersView").replace("    intro: introHtml,\n    'style-filters': teachersView", "    'style-filters': teachersView");
  s = must(s, "  const introHtml = jobsView.intro(c, cards);\n  const description = introHtml.replace(/<section[\\s\\S]*?<\\/nav>/, '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');")
    .replace("  const introHtml = jobsView.intro(c, cards);\n  const description = introHtml.replace(/<section[\\s\\S]*?<\\/nav>/, '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');", '  const description = jobsView.summary(c, cards);');
  s = must(s, "    intro: introHtml,\n    count:").replace("    intro: introHtml,\n    count:", '    count:');
  const a = s.indexOf("    'h1-place':");
  const b = s.indexOf("    'trust-teachers':");
  if (a < 0 || b < 0) throw new Error('h1-place');
  s = s.slice(0, a) + s.slice(b);
  return s;
});

// ---- job detail: back to the original short breadcrumb (full trail stays in JSON-LD)
edit('views/jobDetail.js', (s) => {
  s = s.replace("const { breadcrumbsHtml, CHECK_SVG } = require('./common');", "const { CHECK_SVG } = require('./common');");
  s = must(s, "<div class=\"rd-breadcrumb\">${breadcrumbsHtml(crumbs).replace('<nav class=\"breadcrumbs\"', '<nav class=\"breadcrumbs breadcrumbs--dark\"')}</div>")
    .replace("<div class=\"rd-breadcrumb\">${breadcrumbsHtml(crumbs).replace('<nav class=\"breadcrumbs\"', '<nav class=\"breadcrumbs breadcrumbs--dark\"')}</div>",
      "<div class=\"rd-breadcrumb\"><a href=\"${URLS.jobs()}\">Job board</a><span aria-hidden=\"true\">/</span><span class=\"rd-crumb-title\">${esc(job.title)}</span></div>");
  return s;
});

console.log('done');
