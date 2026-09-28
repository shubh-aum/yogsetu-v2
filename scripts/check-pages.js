// quick smoke check of the SEO pages against the running server
const urls = process.argv.slice(2);
(async () => {
  for (const u of urls) {
    const r = await fetch('http://localhost:3000' + u, { redirect: 'manual' });
    const h = await r.text();
    const desc = (h.match(/<meta name="description" content="([^"]{0,100})/) || [])[1];
    const links = h.indexOf('class="seo-links"');
    console.log(u, r.status, 'intro=' + h.includes('listing-intro'), 'linksAfterFooter=' + (links > h.indexOf('</footer>') && links > 0),
      'jsonld=' + (h.match(/application\/ld\+json/g) || []).length, 'canon=' + (h.match(/rel="canonical" href="([^"]+)"/) || [])[1], '\n   desc:', desc);
  }
})();
