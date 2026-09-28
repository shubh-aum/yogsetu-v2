// wrap each list item's text in one span (flex gap was splitting bold + plain runs) and clear the VS medallion
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'public/teacher-benefits.html');
let s = fs.readFileSync(f, 'utf8');
let n = 0;
s = s.replace(/(<span class="rv-ic" aria-hidden="true"><svg [^>]*>.*?<\/svg><\/span>)(.*?)<\/li>/g, (m, ic, txt) => { n++; return `${ic}<span>${txt}</span></li>`; });
fs.writeFileSync(f, s);
console.log('wrapped', n);

const c = path.join(__dirname, '..', 'public/assets/css/teacher-benefits.css');
fs.appendFileSync(c, `
@media (min-width:861px){
  #tb-reality .rv-broker .rv-inner{padding-right:calc(clamp(24px,3vw,48px) + 46px);}
  #tb-reality .rv-direct .rv-inner{padding-left:calc(clamp(24px,3vw,48px) + 46px);}
}
`);
