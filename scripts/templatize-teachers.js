// One-off: turns views/pages/teachers.html into a server-rendered template by
// replacing the hard-coded demo teachers/filters with <!--@marker--> slots.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'views', 'pages', 'teachers.html');
let html = fs.readFileSync(file, 'utf8');

function between(startNeedle, endNeedle, replacement, { keepStart = true } = {}) {
  const a = html.indexOf(startNeedle);
  if (a === -1) throw new Error('start not found: ' + startNeedle);
  const from = a + (keepStart ? startNeedle.length : 0);
  const b = html.indexOf(endNeedle, from);
  if (b === -1) throw new Error('end not found: ' + endNeedle);
  html = html.slice(0, from) + replacement + html.slice(b);
}

// header search panel selects
between('<select id="heroCity">', '</select>', '\n          <option value="">Any city</option>\n          <!--@city-options-->\n        ');
between('<select id="heroStyle">', '</select>', '\n          <option value="">Any style</option>\n          <!--@style-options-->\n        ');

// hero title + featured avatars
between('<h1 class="thero-title">', '</h1>', '<!--@h1-->');
between('<div class="thero-avatar-rail" id="heroAvatarRail">', '      </div>\n      <button type="button" class="thero-avatar-next"', '\n<!--@hero-avatars-->\n');

// style strip
between('<div class="style-strip">', '  </div>\n</section>\n\n<!-- ============ 3. TRUST STRIP', '\n<!--@style-pills-->\n');

// trust strip -> add intro + breadcrumbs after it
html = html.replace('<div class="listing-layout">', '<!--@intro-->\n\n<div class="listing-layout">');

// filters
between('<select id="filterCity">', '</select>', '<option value="" data-url="/yoga-teachers">All cities</option><!--@city-options-->');
between('<h4>Yoga style</h4>', '    </div>\n\n    <div class="filter-group">\n      <h4>Certification</h4>', '\n<!--@style-filters-->\n');
html = html.replace('<label class="filter-opt"><input type="checkbox" class="cert-filter" value="YTTAI"> YTTAI</label>',
  '<label class="filter-opt"><input type="checkbox" class="cert-filter" value="YTTAI"> YTTAI</label>\n      <label class="filter-opt"><input type="checkbox" class="cert-filter" value="PYC"> PYC</label>');

// results
html = html.replace('<strong id="resultCount">7</strong> verified teachers found', '<strong id="resultCount"><!--@count--></strong> verified teachers found');
between('<div class="category-rows" id="teacherGrid">', '    <div class="empty-state" id="emptyState">', '\n<!--@grid-->\n    </div>\n\n');

// crawlable link lists before the cross-sell band
html = html.replace('<!-- ============ 6. CROSS-SELL BAND ============ -->', '<!--@links-->\n\n<!-- ============ 6. CROSS-SELL BAND ============ -->');

// <head>: SEO tags are injected by the server
html = html.replace(/<title>[\s\S]*?<\/title>\n/, '');
html = html.replace(/<meta name="description"[^>]*>\n/, '');

fs.writeFileSync(file, html);
console.log('teachers.html templatized —', html.split('\n').length, 'lines');
