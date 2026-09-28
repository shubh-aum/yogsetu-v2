const fs = require('fs');
const f = require('path').join(__dirname, '..', 'public/assets/css/legal.css');
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a); s = s.replace(a, b); };
rep('.lg-hero{\n  position:relative;', '.page-hero.lg-hero{\n  position:relative;');
rep('.lg-wrap{max-width:1240px;margin:0 auto;padding:0 clamp(20px,4vw,64px) clamp(56px,9vh,96px);}',
    '.lg-wrap{max-width:calc(1240px + 2 * clamp(20px,4vw,64px));margin:0 auto;padding:0 clamp(20px,4vw,64px) clamp(56px,9vh,96px);}');
rep('.ct-wrap{max-width:1240px;margin:0 auto;padding:0 clamp(20px,4vw,64px) clamp(56px,9vh,96px);}',
    '.ct-wrap{max-width:calc(1240px + 2 * clamp(20px,4vw,64px));margin:0 auto;padding:0 clamp(20px,4vw,64px) clamp(56px,9vh,96px);}');
rep('.lg-sec h2{\n  display:flex;', '.lg-sec h2{\n  max-width:none;display:flex;');
rep('.ct-info{padding-top:4px;}', '.ct-info{padding-top:80px;}');
rep('.ct-info h2{margin:0 0 14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(237,231,216,.75);font-weight:500;}',
    '.ct-info h2{max-width:none;margin:0 0 14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);font-weight:500;}');
rep('@media (max-width:1024px){ .ct-info h2{color:var(--ink-faint);} }', '@media (max-width:1024px){ .ct-info{padding-top:4px;} }');
fs.writeFileSync(f, s);
console.log('ok');
