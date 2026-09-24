const fs = require('fs');
const path = require('path');

// The default About-page content lives in public/ so the static frontend can
// fall back to the very same file when the API is unreachable (static hosting).
const DEFAULTS_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'about-default.json');
const BLOCK_KEY = 'about_page';
const MAX_STRING = 5000;
const MAX_ITEMS = 40;
const MAX_JSON_BYTES = 60000; // cms_content_blocks.content is TEXT (64KB)

function getDefaults() {
  return JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf8'));
}

// `template` (the defaults) doubles as the schema: for a list, template[0] is
// the shape of one item. "fresh" means we are filling a list item the admin
// added or edited, so anything absent becomes empty instead of inheriting the
// default item's copy — while template[0] itself stays intact so nested lists
// (tab -> steps) keep their schema.
function blank(template) {
  if (Array.isArray(template)) return [];
  if (template && typeof template === 'object') {
    const out = {};
    Object.keys(template).forEach((k) => { out[k] = blank(template[k]); });
    return out;
  }
  return '';
}

// Fill anything missing from `saved` with defaults (e.g. a field added in a later release).
function merge(template, saved, fresh) {
  if (Array.isArray(template)) {
    if (!Array.isArray(saved)) return fresh ? [] : template;
    return saved.map((item) => merge(template[0], item, true));
  }
  if (template && typeof template === 'object') {
    const out = {};
    Object.keys(template).forEach((k) => {
      out[k] = merge(template[k], saved && typeof saved === 'object' ? saved[k] : undefined, fresh);
    });
    return out;
  }
  return typeof saved === 'string' ? saved : fresh ? '' : template;
}

function isSafeUrl(value) {
  return !/^\s*(javascript|data|vbscript):/i.test(value);
}

// Whitelist-copy `input` into the shape of `template`: unknown keys dropped,
// strings only, lists capped, dangerous URL schemes blanked. A key that is
// absent (undefined) keeps the template's value, so a partial save can't wipe
// sections it didn't send; an explicit empty string does clear a field.
function sanitize(template, input, key, fresh) {
  if (input === undefined) return fresh ? blank(template) : template;
  if (Array.isArray(template)) {
    if (!Array.isArray(input)) return [];
    return input.slice(0, MAX_ITEMS).map((item) => sanitize(template[0], item, undefined, true));
  }
  if (template && typeof template === 'object') {
    const out = {};
    Object.keys(template).forEach((k) => {
      out[k] = sanitize(template[k], input && typeof input === 'object' ? input[k] : undefined, k, fresh);
    });
    return out;
  }
  let s = typeof input === 'string' ? input : typeof input === 'number' ? String(input) : '';
  s = s.replace(/\r\n?/g, '\n').trim().slice(0, MAX_STRING);
  if (key === 'url' && !isSafeUrl(s)) s = '';
  return s;
}

module.exports = { BLOCK_KEY, MAX_JSON_BYTES, getDefaults, merge, sanitize };
