// Tiny, safe formatter for admin-written page copy. Everything is HTML-escaped
// first; only a handful of constructs are turned back into markup:
//   blank line -> new paragraph        "- item" lines -> bullet list
//   "1. item" lines -> numbered list   "### text" -> small heading
//   **bold**   [label](https://…)   and bare e-mail addresses -> mailto links
const { esc } = require('./site');

const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:)/i;

function inline(raw) {
  // bare e-mail addresses become markdown links first (skip ones already inside a link)
  let s = String(raw).replace(/(^|[^\w/:.@\-[(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, '$1[$2](mailto:$2)');
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    const url = href.replace(/&amp;/g, '&');
    if (!SAFE_HREF.test(url)) return label;
    const ext = /^https?:\/\//i.test(url);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  return s;
}

function render(text) {
  const blocks = String(text || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-•*]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
    }
    if (/^###\s+/.test(block)) {
      const [head, ...rest] = lines;
      return `<h3>${inline(head.replace(/^###\s+/, ''))}</h3>${rest.length ? render(rest.join('\n')) : ''}`;
    }
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('\n');
}

const plain = (text) => String(text || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*#]/g, '').replace(/\s+/g, ' ').trim();

module.exports = { render, inline, plain };
