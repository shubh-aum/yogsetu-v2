// One-off: swap the teacher-benefits "01 The reality" diptych for the 3D VS face-off.
const fs = require('fs');
const root = require('path').join(__dirname, '..');
const rd = (p) => fs.readFileSync(require('path').join(root, p), 'utf8');

const f = 'public/teacher-benefits.html';
const L = rd(f).split('\n');
if (!L[122].includes('swipe-hint') || !L[124].includes('diptych') || !L[192].includes('</div>')) throw new Error('anchors moved');
L.splice(122, 71, ...rd('_rv.html').trimEnd().split('\n'));
let s = L.join('\n');
const marker = "<script>\n(function(){\n  var track = document.getElementById('tbJobsTrack');";
if (!s.includes(marker)) throw new Error('js marker');
s = s.replace(marker, rd('_rvjs.html') + marker);
fs.writeFileSync(require('path').join(root, f), s);

fs.appendFileSync(require('path').join(root, 'public/assets/css/teacher-benefits.css'), rd('_rv.css'));
['_rv.html', '_rvjs.html', '_rv.css'].forEach((x) => fs.unlinkSync(require('path').join(root, x)));
console.log('applied');
