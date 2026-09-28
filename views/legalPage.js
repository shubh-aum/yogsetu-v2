// <main> of the Terms / Privacy / Refund pages, rendered from the admin-managed content.
const { esc } = require('../lib/site');
const { slugify } = require('../lib/slug');
const rich = require('../lib/richtext');

const TABS = [
  { slug: 'terms', url: '/terms', label: 'Terms & Conditions' },
  { slug: 'privacy', url: '/privacy', label: 'Privacy Policy' },
  { slug: 'refund', url: '/refund', label: 'Refund Policy' },
];

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const SHIELD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';

function render(slug, c) {
  const used = new Set();
  const sections = c.sections.filter((s) => s.heading || s.body).map((s, i) => {
    let id = slugify(s.heading) || `section-${i + 1}`;
    while (used.has(id)) id += '-x';
    used.add(id);
    return { id, num: String(i + 1).padStart(2, '0'), heading: s.heading, body: s.body };
  });
  const words = sections.reduce((n, s) => n + rich.plain(`${s.heading} ${s.body}`).split(' ').length, 0);
  const minutes = Math.max(1, Math.round(words / 200));
  const highlights = c.highlights.filter((h) => h.title);
  const co = c.callout;

  return `
<section class="page-hero ph-pine lg-hero">
  <div class="ph-inner">
    <div class="kicker mono"><span class="rule" aria-hidden="true"></span><span>${esc(c.hero.kicker)}</span></div>
    <h1 class="ph-title">${esc(c.hero.title)}</h1>
    ${c.hero.lede ? `<p class="ph-lede">${esc(c.hero.lede)}</p>` : ''}
    <div class="lg-meta">
      ${c.updated ? `<span class="lg-chip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Last updated ${esc(c.updated)}</span>` : ''}
      <span class="lg-chip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 10h16M4 15h10"/></svg>${minutes} min read</span>
    </div>
  </div>
</section>

<div class="lg-wrap">
  <nav class="lg-tabs" aria-label="Legal pages">
    ${TABS.map((t) => `<a href="${t.url}"${t.slug === slug ? ' class="is-active" aria-current="page"' : ''}>${esc(t.label)}</a>`).join('')}
  </nav>
${highlights.length ? `
  <ul class="lg-highlights">
    ${highlights.map((h) => `<li>
      <span class="lg-hi-ico">${SHIELD}</span>
      <div><strong>${esc(h.title)}</strong>${h.text ? `<span>${esc(h.text)}</span>` : ''}</div>
    </li>`).join('\n    ')}
  </ul>` : ''}

  <div class="lg-layout">
    <aside class="lg-toc" aria-label="On this page">
      <h2 class="mono">On this page</h2>
      <ol>
        ${sections.map((s) => `<li><a href="#${s.id}"><span>${s.num}</span>${esc(s.heading)}</a></li>`).join('\n        ')}
      </ol>
    </aside>

    <article class="lg-body prose">
      ${sections.map((s) => `<section class="lg-sec" id="${s.id}">
        <h2><span class="lg-num mono">${s.num}</span>${esc(s.heading)}</h2>
        ${rich.render(s.body)}
      </section>`).join('\n      ')}
    </article>
  </div>
${co.title ? `
  <aside class="lg-callout">
    <div>
      <h2>${esc(co.title)}</h2>
      ${co.text ? `<p>${esc(co.text)}</p>` : ''}
    </div>
    ${co.label && co.url ? `<a class="btn btn-primary" href="${esc(co.url)}">${esc(co.label)}${ARROW}</a>` : ''}
  </aside>` : ''}
</div>
`;
}

module.exports = { render };
