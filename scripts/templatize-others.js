// One-off: templatize requirements.html, requirement-detail.html and teacher-profile.html.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'views', 'pages');

function load(name) { return fs.readFileSync(path.join(dir, name), 'utf8'); }
function save(name, html) { fs.writeFileSync(path.join(dir, name), html); }
function between(html, startNeedle, endNeedle, replacement) {
  const a = html.indexOf(startNeedle);
  if (a === -1) throw new Error('start not found: ' + startNeedle);
  const from = a + startNeedle.length;
  const b = html.indexOf(endNeedle, from);
  if (b === -1) throw new Error('end not found: ' + endNeedle);
  return html.slice(0, from) + replacement + html.slice(b);
}
function stripHeadSeo(html) {
  return html.replace(/<title>[\s\S]*?<\/title>\n/, '').replace(/<meta name="description"[^>]*>\n/, '');
}

// ------------------------------------------------------------ requirements.html
let r = load('requirements.html');
r = between(r, '<select id="heroCity">', '</select>', '\n          <option value="">Any city</option>\n          <!--@city-options-->\n        ');
r = between(r, '<select id="heroStyle">', '</select>', '\n          <option value="">Any style</option>\n          <!--@style-options-->\n        ');
r = between(r, '<select id="filterCity">', '</select>', '<option value="" data-url="/yoga-jobs">All cities</option><!--@city-options-->');
r = between(r, '<h4>Style needed</h4>', '    </div>\n\n    <div class="filter-group">\n      <h4>City</h4>', '\n<!--@style-filters-->\n');
r = r.replace('<strong id="resultCount">5</strong> requirements found', '<strong id="resultCount"><!--@count--></strong> requirements found');
r = between(r, '<div class="category-rows" id="reqGrid">', '    <div class="empty-state" id="emptyState">', '\n<!--@grid-->\n    </div>\n\n');
r = r.replace('<div class="listing-layout">', '<!--@intro-->\n\n<div class="listing-layout">');
r = r.replace('<!-- ============ CROSS-SELL ============ -->', '<!--@links-->\n\n<!-- ============ CROSS-SELL ============ -->');
r = r.replace('Trusted by 480+ teachers', 'Trusted by <!--@trust-teachers-->+ teachers');
r = r.replace('4.8/5 across matched requirements', '<!--@trust-rating-->/5 across matched requirements');
r = r.replace('<h1>\n          Find Your Next', '<h1>\n          Find Your Next');
r = r.replace('<span class="accent">Apply Directly, Today.</span>', '<span class="accent">Apply Directly, Today.</span><!--@h1-place-->');
// remove the fake pagination
r = r.replace(/\n    <nav class="pagination"[\s\S]*?<\/nav>\n/, '\n');
save('requirements.html', stripHeadSeo(r));

// ------------------------------------------------------------ requirement-detail.html
let d = load('requirement-detail.html');
d = between(d, '<main>', '</main>', '\n<!--@main-->\n');
d = d.replace(/<div class="rd-sticky-cta" id="rdStickyCta"[\s\S]*?<\/div>\n\n<footer/, `<div class="rd-sticky-cta" id="rdStickyCta" aria-hidden="true">
  <a href="/yoga-jobs" class="btn btn-secondary" tabindex="-1">
    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>
    All requirements
  </a>
  <a href="/signup?role=teacher" class="btn btn-primary" tabindex="-1" data-apply="<!--@job-id-->">
    Apply to this requirement
    <span class="arrow" aria-hidden="true">&rarr;</span>
  </a>
</div>

<footer`);
save('requirement-detail.html', stripHeadSeo(d));

// ------------------------------------------------------------ teacher-profile.html
let t = load('teacher-profile.html');
t = between(t, '<main>', '</main>', '\n<!--@main-->\n');
save('teacher-profile.html', stripHeadSeo(t));
console.log('templates updated');
