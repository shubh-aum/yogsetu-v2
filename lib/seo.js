// Head-tag injection for every HTML page the server sends: <title>, meta
// description, canonical, robots, Open Graph / Twitter cards and JSON-LD.
const { esc, jsonForScript } = require('./site');

const DEFAULT_IMAGE = '/assets/images/yogsetubanner.png';

// remove whatever the template already declares so the server value wins
function stripExisting(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>\s*/gi, '');
}

function trimText(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${cut.slice(0, sp > max * 0.6 ? sp : max - 1).replace(/[.,;:\s]+$/, '')}…`;
}

function absolute(origin, url) {
  if (!url) return `${origin}${DEFAULT_IMAGE}`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

// seo: { title, description, path, robots, image, type, jsonld[] }
function headTags(seo, origin) {
  const title = trimText(seo.title, 70);
  const description = trimText(seo.description, 160);
  const canonical = seo.canonical || (seo.path ? `${origin}${seo.path}` : '');
  const image = absolute(origin, seo.image);
  const robots = seo.robots || 'index,follow,max-image-preview:large';
  const lines = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="robots" content="${esc(robots)}">`,
  ];
  if (canonical) lines.push(`<link rel="canonical" href="${esc(canonical)}">`);
  lines.push(
    '<meta property="og:site_name" content="YogSetu">',
    '<meta property="og:locale" content="en_IN">',
    `<meta property="og:type" content="${esc(seo.type || 'website')}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
  );
  if (canonical) lines.push(`<meta property="og:url" content="${esc(canonical)}">`);
  lines.push(
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    '<meta name="theme-color" content="#1A1A18">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
  );
  (seo.jsonld || []).filter(Boolean).forEach((obj) => {
    lines.push(`<script type="application/ld+json">${jsonForScript(obj)}</script>`);
  });
  return lines.join('\n');
}

function injectSeo(html, seo, origin) {
  const cleaned = stripExisting(html);
  const tags = headTags(seo, origin);
  if (/<meta\s+name=["']viewport["'][^>]*>/i.test(cleaned)) {
    return cleaned.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, (m) => `${m}\n${tags}`);
  }
  return cleaned.replace(/<head[^>]*>/i, (m) => `${m}\n${tags}`);
}

// ---- reusable structured data --------------------------------------------
function organizationJsonLd(origin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'YogSetu',
    url: origin,
    logo: `${origin}/favicon.svg`,
    parentOrganization: { '@type': 'Organization', name: 'YogKulam', url: 'https://www.yogkulam.com' },
    description: 'YogSetu connects people with credential-verified yoga teachers across India, and helps teachers find yoga jobs.',
  };
}

function websiteJsonLd(origin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'YogSetu',
    url: origin
  };
}

module.exports = { injectSeo, headTags, trimText, absolute, organizationJsonLd, websiteJsonLd, DEFAULT_IMAGE };
