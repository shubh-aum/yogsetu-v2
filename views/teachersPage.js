// Server-rendered pieces of the teachers directory (/yoga-teachers/...). The
// markup mirrors the original static page so teachers.css / teachers.js keep working.
const { esc, money, URLS } = require('../lib/site');
const { breadcrumbsHtml, STAR_SVG, CHECK_SVG, clip } = require('./common');

const STYLE_IMAGES = {
  'hatha-yoga': 'hatha.png', 'ashtanga-power-yoga': 'astanga.png', 'prenatal-yoga': 'prenatal.png',
  'therapeutic-yoga': 'therapy.png', meditation: 'meditation.png', 'yoga-of-education': 'education.png',
  'corporate-wellness': 'corporate.png', 'yoga-for-seniors': 'seniors.png',
};
const AVATAR_BG = ['#D97757', '#3A3935', '#8C887D', '#A65032', '#55534C'];

function card(t) {
  const certs = ['Verified', ...t.accreditations].join(',');
  const styleNames = t.styles.map((s) => s.name).join(',');
  const photo = t.photo
    ? `<img src="${esc(t.photo)}" alt="${esc(t.name)}, verified yoga teacher" loading="lazy" decoding="async" onerror="this.closest('.shot').classList.add('missing')">`
    : '';
  const rating = t.rating != null
    ? `<span class="rating">${STAR_SVG}${t.rating.toFixed(1)} <span class="count">(${t.ratingCount})</span></span>` : '';
  const avatars = t.recentClients.map((c, i) => `<span class="client-avatar" style="background:${AVATAR_BG[(c.id + i) % AVATAR_BG.length]}">${esc(c.initial)}</span>`).join('');
  const proof = (t.monthStudents || t.lastReview) ? `
              <div class="social-proof">
                ${t.monthStudents ? `<div class="recent-clients">
                  <span class="client-avatars">${avatars}</span>
                  <span class="client-count">${t.monthStudents} student${t.monthStudents === 1 ? '' : 's'} this month</span>
                </div>` : ''}
                ${t.lastReview ? `<div class="last-review">
                  <span class="review-stars">${'&#9733;'.repeat(t.lastReview.stars)}</span>
                  <p class="review-quote">&ldquo;${esc(clip(t.lastReview.text, 96))}&rdquo;</p>
                  <span class="review-author">&mdash; ${esc(t.lastReview.author)}</span>
                </div>` : ''}
              </div>` : '';
  return `
          <article class="tcard tcard--editorial" data-tid="${esc(t.slug)}" data-city="${esc(t.cityName || '')}" data-styles="${esc(styleNames)}" data-certs="${esc(certs)}" data-exp="${t.expBand}" data-years="${t.years}" data-mode="${esc(t.mode)}" data-price="${t.price || 0}" data-rating="${t.rating || 0}" data-avail-today="${t.availability.availToday ? 1 : 0}">
            <a href="${esc(t.url)}" class="shot${t.photo ? '' : ' missing'}" style="display:block;">
              ${photo}
              <span class="fallback" aria-hidden="true">${esc(t.initials)}</span>
              ${rating}
              <span class="vbadge">${CHECK_SVG}Verified</span>
            </a>
            <div class="info">
              ${t.photo ? `<span class="teacher-badge"><img src="${esc(t.photo)}" alt=""></span>` : ''}
              <h3><a href="${esc(t.url)}">${esc(t.name)}</a></h3>
              <p class="meta">${esc(t.metaLine)}</p>
              <div class="tags">${t.tags.slice(0, 4).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
              ${t.price ? `<div class="price-line">${money(t.price)} <span>/ session</span></div>` : ''}
              <div class="availability${t.availability.isSoon ? ' is-soon' : ''}"><span class="dot"></span>${esc(t.availability.text)}</div>
${proof}
              <div class="cta-row">
                <a class="btn btn-secondary" href="${esc(t.url)}">View profile</a>
                <a class="btn btn-primary" href="/login?role=client">Request info</a>
              </div>
            </div>
          </article>`;
}

// one row per primary specialty, alternating photo side; sliders only where >1 teacher
function categoryRows(teachers) {
  const groups = new Map();
  teachers.forEach((t) => {
    const key = t.primaryStyle ? t.primaryStyle.id : 0;
    if (!groups.has(key)) groups.set(key, { style: t.primaryStyle, list: [] });
    groups.get(key).list.push(t);
  });
  const rows = [...groups.values()].sort((a, b) => (a.style ? a.style.id : 999) - (b.style ? b.style.id : 999));
  return rows.map((g, i) => {
    const name = g.style ? g.style.name : 'Yoga teachers';
    const many = g.list.length > 1;
    return `
      <section class="category-row ${i % 2 ? 'is-right' : 'is-left'}${many ? ' has-slider' : ''}" data-category="${esc(name)}">
        <div class="category-row-head">
          <h3>${g.style ? `<a href="${esc(URLS.teachersStyle(null, g.style.slug))}" style="color:inherit;text-decoration:none;">${esc(name)}</a>` : esc(name)}</h3>
        </div>
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

function heroAvatars(teachers) {
  return teachers.slice(0, 10).map((t) => `        <a class="hero-avatar" href="${esc(t.url)}">
          <span class="hero-avatar-photo${t.photo ? '' : ' missing'}">${t.photo ? `<img src="${esc(t.photo)}" alt="" loading="lazy" onerror="this.closest('.hero-avatar-photo').classList.add('missing')">` : ''}<span class="fallback" aria-hidden="true">${esc(t.initials)}</span></span>
          <span class="hero-avatar-cap">${esc(t.name.split(' ')[0])}</span>
        </a>`).join('\n');
}

function stylePills(styles) {
  return styles.filter((s) => STYLE_IMAGES[s.slug]).map((s) => `    <button type="button" class="style-pill" data-style="${esc(s.name)}">
      <span class="thumb"><img src="/assets/images/${STYLE_IMAGES[s.slug]}" alt="" loading="lazy"></span>
      <span>${esc(s.name)}</span>
    </button>`).join('\n');
}

function cityOptions(cities, current, prefix) {
  return cities.map((c) => `<option value="${esc(c.name)}" data-url="${esc(prefix + c.slug)}"${current && current.id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
}

function styleOptions(styles) {
  return styles.map((s) => `<option>${esc(s.name)}</option>`).join('');
}

function styleFilters(styles) {
  return `${styles.map((s) => `      <label class="filter-opt"><input type="checkbox" class="style-filter" value="${esc(s.name)}"> ${esc(s.name)}</label>`).join('\n')}\n`;
}

// hero headline keeps its original wording on every page
function h1() {
  return 'Find Your<br><em>Yoga Teacher</em>';
}

// plain-text summary of a listing — used for the meta description only (never rendered on the page)
function summary(ctx, teachers) {
  const place = ctx.locality ? `${ctx.locality.name}, ${ctx.city.name}` : ctx.city ? ctx.city.name : 'India';
  const prices = teachers.map((t) => t.price).filter(Boolean);
  const styleNames = [...new Set(teachers.flatMap((t) => t.styles.map((s) => s.name)))].slice(0, 5);
  const parts = [`${teachers.length ? `Browse ${teachers.length} credential-verified yoga teacher${teachers.length === 1 ? '' : 's'}` : 'Find verified yoga teachers'}${ctx.style ? ` for ${ctx.style.name}` : ''} ${ctx.city ? `in ${place}` : 'across India'}.`];
  if (prices.length) parts.push(`Sessions start at ${money(Math.min(...prices))}.`);
  if (styleNames.length && !ctx.style) parts.push(`Learn ${styleNames.join(', ')} and more.`);
  if (ctx.style && ctx.style.description) parts.push(ctx.style.description);
  parts.push('Real certificates, honest ratings and free slots this week.');
  return parts.join(' ');
}

// internal links for crawlers (and humans): cities, localities, specialties
function linkLists(ctx, data) {
  const cityLinks = data.cities.filter((c) => c.teacherCount > 0).map((c) => `<li><a href="${esc(URLS.teachersCity(c.slug))}">Yoga teachers in ${esc(c.name)} <span>${c.teacherCount}</span></a></li>`).join('');
  const locLinks = (data.localities || []).filter((l) => l.teacherCount > 0).map((l) => `<li><a href="${esc(URLS.teachersLocality(ctx.city.slug, l.slug))}">${esc(l.name)} <span>${l.teacherCount}</span></a></li>`).join('');
  const styleLinks = data.styles.map((s) => `<li><a href="${esc(URLS.teachersStyle(ctx.city ? ctx.city.slug : null, s.slug))}">${esc(s.name)}</a></li>`).join('');
  return `<section class="seo-links" aria-label="More ways to find a yoga teacher">
  <div class="seo-links-inner">
    <div><h2>Browse by city</h2><ul>${cityLinks}</ul></div>
    ${locLinks ? `<div><h2>Localities in ${esc(ctx.city.name)}</h2><ul>${locLinks}</ul></div>` : ''}
    <div><h2>Browse by specialty${ctx.city ? ` in ${esc(ctx.city.name)}` : ''}</h2><ul>${styleLinks}</ul></div>
    <div><h2>Yoga jobs</h2><ul><li><a href="${URLS.jobs()}">All yoga teaching jobs</a></li>${ctx.city ? `<li><a href="${esc(URLS.jobsCity(ctx.city.slug))}">Yoga jobs in ${esc(ctx.city.name)}</a></li>` : ''}</ul></div>
  </div>
</section>`;
}

module.exports = { card, categoryRows, heroAvatars, stylePills, cityOptions, styleOptions, styleFilters, h1, summary, linkLists };
