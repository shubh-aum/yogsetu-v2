// Public HTML routes: clean static pages, the SEO-friendly teacher and job
// URLs, legacy redirects, robots.txt and sitemap.xml. Everything is rendered
// from MySQL on each request, so the pages always reflect the live data.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { esc, siteUrl, money, URLS } = require('../lib/site');
const { injectSeo, trimText, DEFAULT_IMAGE } = require('../lib/seo');
const { PAGES, LEGACY, PROTOTYPES, NOINDEX } = require('../lib/pages');
const geo = require('../services/geo');
const teacherService = require('../services/teachers');
const jobService = require('../services/jobs');
const { loadAboutContent, loadPageContent } = require('./content');
const { fillTemplate, breadcrumbsJsonLd, breadcrumbsHtml } = require('../views/common');
const teachersView = require('../views/teachersPage');
const profileView = require('../views/teacherProfile');
const jobsView = require('../views/jobsPage');
const jobView = require('../views/jobDetail');
const legalView = require('../views/legalPage');
const contactView = require('../views/contactPage');

const router = express.Router();
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const TEMPLATES = path.join(ROOT, 'views', 'pages');

// ---------------------------------------------------------------- file cache
const fileCache = new Map();
function readFile(full) {
  const mtime = fs.statSync(full).mtimeMs;
  const hit = fileCache.get(full);
  if (hit && hit.mtime === mtime) return hit.html;
  const html = fs.readFileSync(full, 'utf8');
  fileCache.set(full, { mtime, html });
  return html;
}

function sendHtml(req, res, html, seo, status = 200) {
  const origin = siteUrl(req);
  const jsonld = typeof seo.jsonld === 'function' ? seo.jsonld(origin) : seo.jsonld;
  res.status(status).type('html').send(injectSeo(html, { ...seo, jsonld }, origin));
}

function notFound(req, res) {
  const html = readFile(path.join(PUBLIC, '404.html'));
  sendHtml(req, res, html, { title: 'Page not found | YogSetu', description: 'The page you were looking for could not be found.', robots: NOINDEX }, 404);
}

const queryOf = (req) => {
  const i = req.originalUrl.indexOf('?');
  return i === -1 ? '' : req.originalUrl.slice(i);
};
const redirect301 = (res, to) => res.redirect(301, to);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------------------------------------------------- trailing slash + case
router.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const p = req.path;
  if (p.length > 1 && p.endsWith('/') && !p.startsWith('/api/')) return redirect301(res, p.replace(/\/+$/, '') + queryOf(req));
  if (/^\/(yoga-teachers|yoga-jobs)(\/|$)/i.test(p) && p !== p.toLowerCase()) return redirect301(res, p.toLowerCase() + queryOf(req));
  return next();
});

// prototypes in /public must never be indexed
router.use((req, res, next) => {
  if (PROTOTYPES.includes(req.path)) res.set('X-Robots-Tag', NOINDEX);
  next();
});

// ------------------------------------------------- admin-managed text pages
// Terms, Privacy, Refund and Contact are rendered from cms_content_blocks
// (falling back to the built-in copy), so admins can edit them without a deploy.
const MANAGED = { '/terms': 'terms', '/privacy': 'privacy', '/refund': 'refund', '/contact': 'contact' };
Object.entries(MANAGED).forEach(([route, slug]) => {
  router.get(route, wrap(async (req, res) => {
    const { content } = await loadPageContent(slug);
    const main = slug === 'contact' ? contactView.render(content) : legalView.render(slug, content);
    const html = fillTemplate(readFile(path.join(TEMPLATES, `${slug}.html`)), { main });
    const seo = {
      title: content.meta.title || PAGES[route].title,
      description: content.meta.description || PAGES[route].description,
      path: route,
      jsonld: (origin) => [{
        '@context': 'https://schema.org',
        '@type': slug === 'contact' ? 'ContactPage' : 'WebPage',
        name: content.hero.title,
        url: origin + route,
        description: content.meta.description || PAGES[route].description,
        isPartOf: { '@type': 'WebSite', name: 'YogSetu', url: origin },
      }],
    };
    sendHtml(req, res, html, seo);
  }));
});

// ------------------------------------------------------------ static pages
Object.entries(PAGES).forEach(([route, page]) => {
  if (MANAGED[route]) return;
  router.get(route, wrap(async (req, res) => {
    let { title, description } = page;
    if (page.dynamicMeta) {
      const { content } = await loadAboutContent();
      if (content.meta && content.meta.title) title = content.meta.title;
      if (content.meta && content.meta.description) description = content.meta.description;
    }
    if (page.robots) res.set('X-Robots-Tag', page.robots);
    sendHtml(req, res, readFile(path.join(PUBLIC, page.file)), { title, description, path: route === '/' ? '/' : route, robots: page.robots, jsonld: page.jsonld });
  }));
});

// ------------------------------------------------------------ legacy URLs
router.get('/teacher-profile.html', wrap(async (req, res) => {
  const { t, id } = req.query;
  let row;
  if (t) [[row]] = await db.query("SELECT t.user_id AS id FROM teachers t WHERE t.slug = ? AND t.verification_status = 'verified'", [String(t)]);
  else if (id) [[row]] = await db.query("SELECT t.user_id AS id FROM teachers t WHERE t.user_id = ? AND t.verification_status = 'verified'", [Number(id) || 0]);
  if (!row) return redirect301(res, '/yoga-teachers');
  const [card] = await teacherService.fetchTeacherCards({ ids: [row.id], limit: 1 });
  return redirect301(res, card ? card.url : '/yoga-teachers');
}));

router.get('/requirement-detail.html', wrap(async (req, res) => {
  const job = await jobService.findJobById(Number(req.query.id) || 0);
  return redirect301(res, job ? job.url : '/yoga-jobs');
}));

router.get(/^\/([a-z0-9-]+)\.html$/i, (req, res, next) => {
  const file = `/${req.params[0]}.html`;
  if (LEGACY[file]) return redirect301(res, LEGACY[file] + queryOf(req));
  const clean = `/${req.params[0]}`;
  if (PAGES[clean]) return redirect301(res, clean + queryOf(req));
  return next();
});

// ------------------------------------------------------------ JSON-LD builders
function itemList(name, items, origin) {
  return {
    '@context': 'https://schema.org', '@type': 'ItemList', name,
    itemListElement: items.slice(0, 50).map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: origin + it.url, name: it.name || it.title })),
  };
}

function teacherJsonLd(p, origin) {
  const url = origin + p.url;
  const image = p.photo ? (p.photo.startsWith('http') ? p.photo : origin + p.photo) : undefined;
  const person = {
    '@type': 'Person', '@id': `${url}#person`, name: p.name, url, image,
    jobTitle: 'Yoga teacher', description: p.tagline || undefined,
    knowsAbout: p.styles.map((s) => s.name),
    knowsLanguage: p.languages,
    address: p.cityName ? { '@type': 'PostalAddress', addressLocality: p.localityName ? `${p.localityName}, ${p.cityName}` : p.cityName, addressCountry: 'IN' } : undefined,
    hasCredential: p.certifications.map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c.title, recognizedBy: c.body ? { '@type': 'Organization', name: c.body } : undefined })),
  };
  const offers = [
    ...p.formats.map((f) => ({ '@type': 'Offer', name: `${f.title} (${f.kind === 'online' ? 'online' : 'in-studio'})`, price: f.price, priceCurrency: 'INR', url })),
    ...(!p.formats.length && p.price ? [{ '@type': 'Offer', name: 'Private session', price: p.price, priceCurrency: 'INR', url }] : []),
  ];
  const service = {
    '@type': 'Service', '@id': `${url}#service`, serviceType: 'Yoga classes', name: `Yoga classes with ${p.name}`,
    provider: { '@id': `${url}#person` },
    areaServed: p.cityName ? { '@type': 'City', name: p.cityName } : { '@type': 'Country', name: 'India' },
    offers: offers.length ? offers : undefined,
    aggregateRating: p.rating != null && p.ratingCount > 0
      ? { '@type': 'AggregateRating', ratingValue: p.rating.toFixed(1), reviewCount: p.ratingCount, bestRating: 5, worstRating: 1 } : undefined,
    review: p.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review', reviewBody: r.text, author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: r.stars, bestRating: 5 }, datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
    })),
  };
  return { '@context': 'https://schema.org', '@graph': [person, service] };
}

function jobJsonLd(j, origin) {
  if (j.status !== 'open') return null;
  const posted = new Date(j.createdAt);
  const until = new Date(posted.getTime() + 60 * 86400000);
  const salary = (j.budgetMin != null || j.budgetMax != null) ? {
    '@type': 'MonetaryAmount', currency: 'INR',
    value: { '@type': 'QuantitativeValue', ...(j.budgetMin != null ? { minValue: j.budgetMin } : {}), ...(j.budgetMax != null ? { maxValue: j.budgetMax } : {}), unitText: 'HOUR' },
  } : undefined;
  const base = {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: j.title, description: j.description || j.title, datePosted: posted.toISOString().slice(0, 10), validThrough: until.toISOString(),
    employmentType: 'CONTRACTOR', directApply: false,
    identifier: { '@type': 'PropertyValue', name: 'YogSetu requirement', value: String(j.id) },
    hiringOrganization: { '@type': 'Organization', name: 'Verified YogSetu client', sameAs: origin },
    baseSalary: salary,
    url: origin + j.url,
  };
  if (j.mode === 'online' || !j.cityName) {
    return { ...base, jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: 'India' } };
  }
  return {
    ...base,
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.localityName ? `${j.localityName}, ${j.cityName}` : j.cityName, addressCountry: 'IN' } },
  };
}

// ------------------------------------------------------------ teachers directory
async function teachersListing(req, res, ctx) {
  const origin = siteUrl(req);
  const [cards, cities, styles] = await Promise.all([
    teacherService.fetchTeacherCards({ cityId: ctx.city && ctx.city.id, localityId: ctx.locality && ctx.locality.id, styleId: ctx.style && ctx.style.id }),
    geo.getCitiesWithTeachers(), geo.getStyles(),
  ]);
  const localities = ctx.city ? await geo.getLocalities(ctx.city.id) : [];
  const present = new Set(cards.flatMap((t) => t.styles.map((s) => s.id)));
  const shownStyles = styles.filter((s) => present.has(s.id));

  const place = ctx.locality ? `${ctx.locality.name}, ${ctx.city.name}` : ctx.city ? ctx.city.name : '';
  let title;
  if (ctx.style) title = `${ctx.style.name} Teachers ${place ? `in ${place}` : 'Across India'} | YogSetu`;
  else if (ctx.locality) title = `Yoga Teachers in ${place} — Verified & Rated | YogSetu`;
  else if (ctx.city) title = `Verified Yoga Teachers in ${ctx.city.name} | YogSetu`;
  else title = 'Verified Yoga Teachers in India — Compare Profiles & Prices | YogSetu';

  const description = teachersView.summary(ctx, cards);

  let canonical;
  if (ctx.style && ctx.city) canonical = URLS.teachersStyle(ctx.city.slug, ctx.style.slug);
  else if (ctx.style) canonical = URLS.teachersStyle(null, ctx.style.slug);
  else if (ctx.locality) canonical = URLS.teachersLocality(ctx.city.slug, ctx.locality.slug);
  else if (ctx.city) canonical = URLS.teachersCity(ctx.city.slug);
  else canonical = URLS.teachers();

  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Yoga teachers', url: URLS.teachers() }];
  if (ctx.city) crumbs.push({ name: ctx.city.name, url: URLS.teachersCity(ctx.city.slug) });
  if (ctx.locality) crumbs.push({ name: ctx.locality.name, url: canonical });
  if (ctx.style) crumbs.push({ name: ctx.style.name, url: canonical });

  const html = fillTemplate(readFile(path.join(TEMPLATES, 'teachers.html')), {
    'city-options': teachersView.cityOptions(cities.filter((c) => c.teacherCount > 0 || (ctx.city && c.id === ctx.city.id)), ctx.city, '/yoga-teachers/'),
    'style-options': teachersView.styleOptions(shownStyles),
    h1: teachersView.h1(ctx),
    'hero-avatars': teachersView.heroAvatars(cards),
    'style-pills': teachersView.stylePills(shownStyles),
    'style-filters': teachersView.styleFilters(shownStyles),
    count: String(cards.length),
    grid: teachersView.categoryRows(cards),
    links: teachersView.linkLists(ctx, { cities, styles, localities }),
  });
  sendHtml(req, res, html, {
    title, description, path: canonical,
    robots: cards.length ? undefined : 'noindex,follow',
    image: cards[0] && cards[0].photo,
    jsonld: [breadcrumbsJsonLd(crumbs, origin), itemList(title.replace(' | YogSetu', ''), cards, origin)],
  });
}

async function styleFromQuery(req) {
  const slug = req.query.specialization;
  return slug ? geo.getStyleBySlug(String(slug).toLowerCase()) : null;
}

router.get('/yoga-teachers', wrap(async (req, res) => teachersListing(req, res, { style: await styleFromQuery(req) })));

async function teacherProfilePage(req, res, id) {
  const origin = siteUrl(req);
  const p = await teacherService.getTeacherProfile(id);
  if (!p) return notFound(req, res);
  if (req.path !== p.url) return redirect301(res, p.url + queryOf(req));

  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Yoga teachers', url: URLS.teachers() }];
  if (p.citySlug) crumbs.push({ name: p.cityName, url: URLS.teachersCity(p.citySlug) });
  crumbs.push({ name: p.name, url: p.url });

  const stylesText = p.styles.map((s) => s.name).slice(0, 2).join(' & ');
  const title = `${p.name} — ${stylesText ? `${stylesText} Teacher` : 'Yoga Teacher'}${p.cityName ? ` in ${p.cityName}` : ''} | YogSetu`;
  const bits = [
    `${p.name} is a credential-verified ${stylesText || 'yoga'} teacher${p.cityName ? ` in ${p.localityName ? `${p.localityName}, ` : ''}${p.cityName}` : ''} with ${p.years} years of experience.`,
    p.rating != null ? `Rated ${p.rating.toFixed(1)}/5 by ${p.ratingCount} students.` : '',
    p.price ? `Sessions from ${money(p.price)}.` : '',
    'See certifications, weekly availability and reviews.',
  ].filter(Boolean).join(' ');

  const html = fillTemplate(readFile(path.join(TEMPLATES, 'teacher-profile.html')), { main: profileView.render(p) });
  sendHtml(req, res, html, {
    title, description: bits, path: p.url, type: 'profile', image: p.photo,
    jsonld: [breadcrumbsJsonLd(crumbs, origin), teacherJsonLd(p, origin)],
  });
}

router.get('/yoga-teachers/:city', wrap(async (req, res) => {
  const city = await geo.getCityBySlug(req.params.city);
  if (!city) return notFound(req, res);
  const style = await styleFromQuery(req);
  return teachersListing(req, res, { city, style });
}));

router.get('/yoga-teachers/:city/:seg', wrap(async (req, res) => {
  const { city: citySlug, seg } = req.params;
  const teacher = await teacherService.getTeacherIdBySlug(seg);
  if (teacher) return teacherProfilePage(req, res, teacher.id);
  const city = await geo.getCityBySlug(citySlug);
  if (!city) return notFound(req, res);
  const style = await geo.getStyleBySlug(seg);
  if (style) return teachersListing(req, res, { city, style });
  const locality = await geo.getLocalityBySlug(city.id, seg);
  if (locality) return teachersListing(req, res, { city, locality });
  return notFound(req, res);
}));

// ------------------------------------------------------------ job board
async function jobsListing(req, res, ctx) {
  const origin = siteUrl(req);
  const styleQ = ctx.style || (await styleFromQuery(req));
  const c = { ...ctx, style: styleQ };
  const [cards, cities, styles, [[stat]], [[rate]]] = await Promise.all([
    jobService.fetchJobCards({ cityId: c.city && c.city.id, localityId: c.locality && c.locality.id, styleId: c.style && c.style.id, online: c.online }),
    geo.getCitiesWithJobs(), geo.getStyles(),
    db.query("SELECT COUNT(*) AS n FROM teachers WHERE verification_status = 'verified'"),
    db.query("SELECT ROUND(AVG(stars), 1) AS avg FROM ratings WHERE status = 'published'"),
  ]);
  const localities = c.city ? await geo.getLocalities(c.city.id) : [];
  const present = new Set(cards.map((j) => j.styleId));
  const shownStyles = styles.filter((s) => present.has(s.id));

  const place = c.online ? 'online' : c.locality ? `${c.locality.name}, ${c.city.name}` : c.city ? c.city.name : 'India';
  let title;
  if (c.style) title = `${c.style.name} Teaching Jobs ${c.online ? 'Online' : `in ${place}`} | YogSetu`;
  else if (c.online) title = 'Online Yoga Teaching Jobs — Apply Directly | YogSetu';
  else if (c.locality) title = `Yoga Jobs in ${place} — Teaching Requirements | YogSetu`;
  else if (c.city) title = `Yoga Teacher Jobs in ${c.city.name} — Open Requirements | YogSetu`;
  else title = 'Yoga Teaching Jobs in India — Open Client Requirements | YogSetu';

  const description = jobsView.summary(c, cards);

  let canonical;
  if (c.online) canonical = '/yoga-jobs/online';
  else if (c.locality) canonical = URLS.jobsLocality(c.city.slug, c.locality.slug);
  else if (c.city) canonical = URLS.jobsCity(c.city.slug);
  else canonical = URLS.jobs();
  if (c.style) canonical = URLS.jobsStyle(c.city ? c.city.slug : null, c.style.slug);
  if (c.style && c.city && !c.locality) canonical = URLS.jobsCity(c.city.slug) + `?specialization=${encodeURIComponent(c.style.slug)}`;

  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Yoga jobs', url: URLS.jobs() }];
  if (c.online) crumbs.push({ name: 'Online', url: '/yoga-jobs/online' });
  if (c.city) crumbs.push({ name: c.city.name, url: URLS.jobsCity(c.city.slug) });
  if (c.locality) crumbs.push({ name: c.locality.name, url: canonical });

  const html = fillTemplate(readFile(path.join(TEMPLATES, 'requirements.html')), {
    'city-options': jobsView.cityOptions(cities.filter((x) => x.jobCount > 0 || (c.city && x.id === c.city.id)), c.city, true, c.online),
    'style-options': jobsView.heroSelectStyles(shownStyles),
    'style-filters': jobsView.styleFilters(shownStyles),
    'trust-teachers': String(stat.n),
    'trust-rating': rate.avg != null ? Number(rate.avg).toFixed(1) : '4.8',
    count: String(cards.filter((j) => j.status === 'open').length),
    grid: jobsView.categoryRows(cards),
    links: jobsView.linkLists(c, { cities, styles, localities }),
  });
  sendHtml(req, res, html, {
    title, description, path: canonical,
    robots: cards.some((j) => j.status === 'open') ? undefined : 'noindex,follow',
    jsonld: [breadcrumbsJsonLd(crumbs, origin), itemList(title.replace(' | YogSetu', ''), cards, origin)],
  });
}

async function jobPage(req, res, job) {
  const origin = siteUrl(req);
  if (req.path !== job.url) return redirect301(res, job.url + queryOf(req));
  const detail = await jobService.getJobDetail(job);
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Yoga jobs', url: URLS.jobs() }];
  if (job.citySlug) crumbs.push({ name: job.cityName, url: URLS.jobsCity(job.citySlug) });
  else crumbs.push({ name: 'Online', url: '/yoga-jobs/online' });
  if (job.localitySlug) crumbs.push({ name: job.localityName, url: URLS.jobsLocality(job.citySlug, job.localitySlug) });
  crumbs.push({ name: job.title, url: job.url });

  const html = fillTemplate(readFile(path.join(TEMPLATES, 'requirement-detail.html')), {
    main: jobView.render(detail, crumbs.map((c, i) => (i === crumbs.length - 1 ? { name: c.name } : c))),
    'job-id': String(job.id),
  });
  const where = job.mode === 'online' ? 'online' : `in ${job.localityName ? `${job.localityName}, ` : ''}${job.cityName || 'India'}`;
  sendHtml(req, res, html, {
    title: `${job.title} ${job.mode === 'online' ? '(Online)' : `— ${job.localityName || job.cityName || 'India'}`} | YogSetu Jobs`,
    description: trimText(`${job.title} — ${job.styleName || 'yoga'} teacher needed ${where}. Budget: ${job.budgetText}.${job.schedule ? ` Schedule: ${job.schedule}.` : ''} ${job.description}`, 160),
    path: job.url, robots: job.status === 'open' ? undefined : 'noindex,follow',
    jsonld: [breadcrumbsJsonLd(crumbs, origin), jobJsonLd(job, origin)],
  });
}

router.get('/yoga-jobs', wrap(async (req, res) => jobsListing(req, res, {})));

router.get('/yoga-jobs/online', wrap(async (req, res) => jobsListing(req, res, { online: true })));

router.get('/yoga-jobs/online/:slug', wrap(async (req, res) => {
  const job = await jobService.findJob({ slug: req.params.slug, online: true });
  return job ? jobPage(req, res, job) : notFound(req, res);
}));

router.get('/yoga-jobs/:city', wrap(async (req, res) => {
  const city = await geo.getCityBySlug(req.params.city);
  return city ? jobsListing(req, res, { city }) : notFound(req, res);
}));

router.get('/yoga-jobs/:city/:seg', wrap(async (req, res) => {
  const city = await geo.getCityBySlug(req.params.city);
  if (!city) return notFound(req, res);
  const locality = await geo.getLocalityBySlug(city.id, req.params.seg);
  if (locality) return jobsListing(req, res, { city, locality });
  const job = await jobService.findJob({ cityId: city.id, slug: req.params.seg });
  return job ? jobPage(req, res, job) : notFound(req, res);
}));

router.get('/yoga-jobs/:city/:locality/:slug', wrap(async (req, res) => {
  const city = await geo.getCityBySlug(req.params.city);
  if (!city) return notFound(req, res);
  const locality = await geo.getLocalityBySlug(city.id, req.params.locality);
  if (!locality) return notFound(req, res);
  const job = await jobService.findJob({ cityId: city.id, localityId: locality.id, slug: req.params.slug });
  return job ? jobPage(req, res, job) : notFound(req, res);
}));

router.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));

// ------------------------------------------------------------ robots + sitemap
router.get('/robots.txt', (req, res) => {
  const origin = siteUrl(req);
  res.type('text/plain').send([
    'User-agent: *',
    'Disallow: /api/',
    'Disallow: /admin-dashboard',
    'Disallow: /teacher-dashboard',
    'Disallow: /client-dashboard',
    'Disallow: /post-requirement',
    'Disallow: /yogsetu-page.html',
    'Disallow: /yogsetu-mono-theme.html',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'));
});

router.get('/sitemap.xml', wrap(async (req, res) => {
  const origin = siteUrl(req);
  const urls = [];
  const add = (loc, { priority, lastmod, changefreq } = {}) => urls.push({ loc: origin + loc, priority, lastmod, changefreq });
  ['/', '/about', '/teacher-benefits', '/contact', '/privacy', '/terms', '/refund'].forEach((p) => add(p, { priority: p === '/' ? '1.0' : '0.5', changefreq: 'monthly' }));
  add('/yoga-teachers', { priority: '0.9', changefreq: 'daily' });
  add('/yoga-jobs', { priority: '0.9', changefreq: 'daily' });

  const cards = await teacherService.fetchTeacherCards({ limit: 500 });
  const cityIds = new Set();
  const seenStyleCity = new Set();
  cards.forEach((t) => {
    if (t.citySlug) cityIds.add(t.citySlug);
    if (t.citySlug && t.localitySlug) seenStyleCity.add(`L|${t.citySlug}|${t.localitySlug}`);
    t.styles.forEach((s) => { if (t.citySlug) seenStyleCity.add(`S|${t.citySlug}|${s.slug}`); });
    add(t.url, { priority: '0.8', changefreq: 'weekly' });
  });
  cityIds.forEach((c) => add(URLS.teachersCity(c), { priority: '0.8', changefreq: 'daily' }));
  seenStyleCity.forEach((k) => {
    const [kind, city, slug] = k.split('|');
    add(kind === 'L' ? URLS.teachersLocality(city, slug) : URLS.teachersStyle(city, slug), { priority: '0.7', changefreq: 'weekly' });
  });

  const jobs = await jobService.fetchJobCards({ statuses: ['open'], limit: 500 });
  const jobCities = new Set();
  const jobLocalities = new Set();
  let anyOnline = false;
  jobs.forEach((j) => {
    if (j.citySlug) jobCities.add(j.citySlug); else anyOnline = true;
    if (j.citySlug && j.localitySlug) jobLocalities.add(`${j.citySlug}|${j.localitySlug}`);
    add(j.url, { priority: '0.7', lastmod: new Date(j.createdAt).toISOString().slice(0, 10), changefreq: 'weekly' });
  });
  if (anyOnline) add('/yoga-jobs/online', { priority: '0.6', changefreq: 'daily' });
  jobCities.forEach((c) => add(URLS.jobsCity(c), { priority: '0.7', changefreq: 'daily' }));
  jobLocalities.forEach((k) => { const [c, l] = k.split('|'); add(URLS.jobsLocality(c, l), { priority: '0.6', changefreq: 'daily' }); });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}${u.priority ? `<priority>${u.priority}</priority>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
}));

module.exports = router;
module.exports.notFound = notFound;
void DEFAULT_IMAGE; void breadcrumbsHtml;
