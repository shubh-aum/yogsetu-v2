// Server-rendered pieces of the job board (/yoga-jobs/...). Markup mirrors the
// original static requirements page so requirements.css / requirements.js keep working.
const { esc, URLS } = require('../lib/site');
const { clip } = require('./common');

const BAND = {
  'hatha-yoga': ['hatha', '<path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>'],
  'ashtanga-power-yoga': ['ashtanga', '<path d="M12 2v6"/><path d="M5 22c0-5 3-7 7-7s7 2 7 7"/><circle cx="12" cy="12" r="3"/>'],
  'prenatal-yoga': ['prenatal', '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'],
  'corporate-wellness': ['corporate', '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'],
  'therapeutic-yoga': ['therapeutic', '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>'],
};
const GENERIC_BAND = ['generic', '<path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>'];
const bandOf = (slug) => BAND[slug] || GENERIC_BAND;

const STATUS_LABEL = { open: 'Open', matched: 'Matched', closed: 'Closed' };

function card(j) {
  const [key, icon] = bandOf(j.styleSlug);
  const cardMode = j.mode === 'either' ? 'hybrid' : j.mode;
  const budgetVal = j.budgetMax || j.budgetMin || 0;
  return `
            <article class="req-card req-card--editorial" data-rid="${j.id}" data-status="${esc(j.status)}" data-city="${esc(j.dataCity)}" data-styles="${esc([j.styleName, ...(j.tags.slice(1))].filter(Boolean).join(','))}" data-mode="${esc(cardMode)}" data-budget="${budgetVal}" data-posted="${j.postedDays}">
              <div class="req-band req-band--${key}" aria-hidden="true">
                <svg viewBox="0 0 24 24">${icon}</svg>
                <span>${esc(j.styleShort || 'Yoga')}</span>
              </div>
              <div class="info">
                <div class="req-card-top">
                  <h3><a href="${esc(j.url)}">${esc(j.title)}</a></h3>
                  <span class="req-budget">${esc(j.budgetText)}</span>
                </div>
                <div class="req-meta">
                  <span>&#128205; ${esc(j.placeText)}</span>
                  ${j.schedule ? `<span>&#128337; ${esc(j.schedule)}</span>` : ''}
                  <span class="status-pill ${esc(j.status)}">${esc(STATUS_LABEL[j.status] || j.status)}</span>
                </div>
                <p class="desc">${esc(clip(j.description, 190))}</p>
                <div class="req-tags">${j.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
                <div class="req-foot">
                  <span class="posted">${esc(j.postedText)}${j.applicants ? ` &middot; ${j.applicants} applied` : ''}</span>
                  <a href="${esc(j.url)}" class="btn btn-secondary btn-small" style="border:1px solid var(--line);">View details &rarr;</a>
                </div>
              </div>
            </article>`;
}

function categoryRows(jobs) {
  const groups = new Map();
  jobs.forEach((j) => {
    const key = j.styleId || 0;
    if (!groups.has(key)) groups.set(key, { name: j.styleName || 'Other', short: j.styleShort || 'Other', list: [], id: j.styleId || 999 });
    groups.get(key).list.push(j);
  });
  const rows = [...groups.values()].sort((a, b) => a.id - b.id);
  return rows.map((g, i) => {
    const many = g.list.length > 1;
    return `
      <section class="category-row ${i % 2 ? 'is-right' : 'is-left'}" data-category="${esc(g.short)}">
        <div class="category-row-head"><h3>${esc(g.short)}</h3></div>
        <div class="category-slider-wrap">
          ${many ? `<button type="button" class="cat-prev" aria-label="Previous"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
          <button type="button" class="cat-next" aria-label="Next"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>` : ''}
          <div class="category-slider">${g.list.map(card).join('')}
          </div>
        </div>
      </section>
`;
  }).join('');
}

function cityOptions(cities, current, includeOnline, onlineActive) {
  const opts = cities.map((c) => `<option value="${esc(c.name)}" data-url="${esc(URLS.jobsCity(c.slug))}"${current && current.id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`);
  if (includeOnline) opts.unshift(`<option value="Online" data-url="/yoga-jobs/online"${onlineActive ? ' selected' : ''}>Online</option>`);
  return opts.join('');
}

function styleFilters(styles) {
  return styles.map((s) => `      <label class="filter-opt"><input type="checkbox" class="style-filter" value="${esc(s.name)}"> ${esc(s.name)}</label>`).join('\n');
}

function heroSelectStyles(styles) {
  return styles.map((s) => `<option>${esc(s.name)}</option>`).join('');
}

// plain-text summary of a listing — used for the meta description only (never rendered on the page)
function summary(ctx, jobs) {
  const place = ctx.online ? 'online' : ctx.locality ? `${ctx.locality.name}, ${ctx.city.name}` : ctx.city ? ctx.city.name : 'India';
  const open = jobs.filter((j) => j.status === 'open').length;
  return `${open} open yoga teaching requirement${open === 1 ? '' : 's'} ${ctx.online ? 'you can teach online' : `in ${place}`}${ctx.style ? ` for ${ctx.style.name}` : ''}. Clients post style, schedule, location and budget — verified teachers apply directly.`;
}

function linkLists(ctx, data) {
  const cityLinks = data.cities.filter((c) => c.jobCount > 0).map((c) => `<li><a href="${esc(URLS.jobsCity(c.slug))}">Yoga jobs in ${esc(c.name)} <span>${c.jobCount}</span></a></li>`).join('');
  const locLinks = (data.localities || []).filter((l) => l.jobCount > 0).map((l) => `<li><a href="${esc(URLS.jobsLocality(ctx.city.slug, l.slug))}">${esc(l.name)} <span>${l.jobCount}</span></a></li>`).join('');
  const styleLinks = data.styles.map((s) => `<li><a href="${esc(URLS.jobsStyle(ctx.city ? ctx.city.slug : null, s.slug))}">${esc(s.name)} jobs</a></li>`).join('');
  return `<section class="seo-links" aria-label="More ways to find yoga jobs">
  <div class="seo-links-inner">
    <div><h2>Yoga jobs by city</h2><ul><li><a href="/yoga-jobs/online">Online yoga jobs</a></li>${cityLinks}</ul></div>
    ${locLinks ? `<div><h2>Localities in ${esc(ctx.city.name)}</h2><ul>${locLinks}</ul></div>` : ''}
    <div><h2>Jobs by specialty</h2><ul>${styleLinks}</ul></div>
    <div><h2>Yoga teachers</h2><ul><li><a href="${URLS.teachers()}">Browse all yoga teachers</a></li>${ctx.city ? `<li><a href="${esc(URLS.teachersCity(ctx.city.slug))}">Yoga teachers in ${esc(ctx.city.name)}</a></li>` : ''}</ul></div>
  </div>
</section>`;
}

module.exports = { card, categoryRows, cityOptions, styleFilters, heroSelectStyles, summary, linkLists, bandOf };
