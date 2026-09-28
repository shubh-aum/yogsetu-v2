// Small building blocks shared by the server-rendered pages.
const { esc, jsonForScript } = require('../lib/site');

// <!--@name--> slots in a template are replaced by html[name].
function fillTemplate(template, slots) {
  return template.replace(/<!--@([a-z0-9-]+)-->/g, (all, name) => (Object.prototype.hasOwnProperty.call(slots, name) ? slots[name] : ''));
}

// crumbs: [{ name, url }] — the last one is the current page (no link)
function breadcrumbsHtml(crumbs) {
  const items = crumbs.map((c, i) => {
    const last = i === crumbs.length - 1;
    return last
      ? `<li aria-current="page">${esc(c.name)}</li>`
      : `<li><a href="${esc(c.url)}">${esc(c.name)}</a></li>`;
  });
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items.join('')}</ol></nav>`;
}

function breadcrumbsJsonLd(crumbs, origin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, ...(c.url ? { item: origin + c.url } : {}),
    })),
  };
}

const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';

const stars = (n) => '&#9733;'.repeat(Math.max(0, Math.min(5, Math.round(Number(n) || 0))));

// truncate at a word boundary
function clip(text, max) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${cut.slice(0, sp > max * 0.6 ? sp : max).replace(/[.,;:!\s]+$/, '')}…`;
}

module.exports = { fillTemplate, breadcrumbsHtml, breadcrumbsJsonLd, STAR_SVG, CHECK_SVG, stars, clip, esc, jsonForScript };
