/* ============================================================
   YogSetu — about.js
   Renders the About page from admin-managed content. Source order:
   1. GET /api/content/about   (live, edited in Admin → About page)
   2. assets/data/about-default.json   (fallback, e.g. static hosting)
   Every value is inserted with textContent / setAttribute — never innerHTML —
   so nothing typed into the admin editor can inject markup. Motion, 3D and
   the gallery live in about-fx.js / about-hero3d.js / about-gallery.js.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('aboutRoot');
  if (!root) return;

  // ---------- tiny DOM helpers ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (function add(kids) {
      kids.forEach(function (kid) {
        if (kid == null || kid === false) return;
        if (Array.isArray(kid)) add(kid);
        else el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
      });
    })(Array.prototype.slice.call(arguments, 2));
    return el;
  }

  // "Plain *highlighted* text" -> text nodes with <em> around the starred part.
  function rich(text) {
    var frag = document.createDocumentFragment();
    String(text || '').split(/\*([^*]+)\*/).forEach(function (part, i) {
      if (!part) return;
      frag.appendChild(i % 2 ? h('em', { text: part }) : document.createTextNode(part));
    });
    return frag;
  }
  function paras(text, cls) {
    return String(text || '').split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return h('p', { class: cls, text: p }); });
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    return /^(javascript|data|vbscript):/i.test(u) ? '' : u;
  }
  function has(s) { return typeof s === 'string' && s.trim() !== ''; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function reveal(el, kind, i) {
    el.setAttribute('data-reveal', kind || '');
    if (i) el.style.setProperty('--i', i);
    return el;
  }

  function img(image, cls, eager) {
    if (!image || !has(image.url)) return null;
    return h('img', {
      class: cls, src: safeUrl(image.url), alt: image.alt || '',
      loading: eager ? 'eager' : 'lazy', decoding: 'async', draggable: 'false'
    });
  }

  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function cta(c, cls) {
    if (!c || !has(c.label)) return null;
    var arrow = h('span', { class: 'ab-btn-ico', 'aria-hidden': 'true' });
    arrow.innerHTML = ARROW; // constant markup, no user data
    return h('a', { href: safeUrl(c.url) || '#', class: 'ab-btn ' + cls }, h('span', { text: c.label }), arrow);
  }

  // ---------- numbered section header ----------
  var sectionNo = 0;
  function head(label, title, right, id) {
    sectionNo++;
    return reveal(h('header', { class: 'ab-head' },
      h('div', { class: 'ab-head-l' },
        h('div', { class: 'ab-idx' },
          h('span', { class: 'n', text: pad2(sectionNo) }),
          h('span', { class: 'rule', 'aria-hidden': 'true' }),
          has(label) && h('span', { class: 'lbl', text: label })),
        has(title) && h('h2', { class: 'ab-h2', id: id || null }, rich(title))),
      right ? h('div', { class: 'ab-head-r' }, right) : null), 'up');
  }
  var ctx = { h: h, rich: rich, head: head, has: has, safeUrl: safeUrl };

  // ---------- 0. hero ----------
  function heroSection(c) {
    var d = c.hero || {};
    var stats = ((c.backed || {}).stats || []).filter(function (s) { return has(s.number); }).slice(0, 2);
    var btns = [cta(d.primary_cta, 'ab-btn-primary'), cta(d.secondary_cta, 'ab-btn-ghost')].filter(Boolean);
    var photo = img(d.image, '', true);
    return h('section', { class: 'ab-hero', id: 'ab-top' },
      h('canvas', { class: 'ab-hero-canvas', 'aria-hidden': 'true' }),
      h('div', { class: 'ab-hero-glow', 'aria-hidden': 'true' }),
      h('div', { class: 'ab-wrap ab-hero-grid' },
        h('div', { class: 'ab-hero-copy' },
          has(d.kicker) && reveal(h('div', { class: 'ab-idx on-dark' }, h('span', { class: 'rule', 'aria-hidden': 'true' }), h('span', { class: 'lbl', text: d.kicker })), 'up', 0),
          has(d.title) && reveal(h('h1', { class: 'ab-hero-title' }, rich(d.title)), 'up', 1),
          paras(d.description, 'ab-hero-desc').slice(0, 1).map(function (p) { return reveal(p, 'up', 2); }),
          btns.length && reveal(h('div', { class: 'ab-btn-row' }, btns), 'up', 3)),
        h('div', { class: 'ab-hero-stage' },
          photo && reveal(h('div', { class: 'ab-hero-photo ab-tilt', 'data-tilt': '7' }, photo), 'scale', 2),
          stats.map(function (s, i) {
            return reveal(h('div', { class: 'ab-chip ab-chip-' + (i ? 'b' : 'a'), 'aria-hidden': 'true' },
              h('span', { class: 'n', 'data-count': '', text: s.number }),
              has(s.label) && h('span', { class: 'k', text: s.label })), 'scale', 5 + i);
          }))),
      h('a', { class: 'ab-cue', href: '#ab-story', 'aria-label': 'Scroll to the next section' }, h('span', { class: 'ab-cue-line' }), h('span', { text: 'Scroll' })));
  }

  // ---------- marquee ----------
  function marqueeSection(c) {
    var b = c.backed || {};
    var parts = (b.badges || []).filter(has);
    (b.stats || []).forEach(function (s) { if (has(s.number)) parts.push(s.number + (has(s.label) ? ' ' + s.label : '')); });
    if (!parts.length) return null;
    while (parts.length < 8) parts = parts.concat(parts);
    function track() {
      return h('ul', { class: 'ab-marquee-track' }, parts.map(function (p) {
        return h('li', null, h('span', { class: 'dot' }), p);
      }));
    }
    return h('div', { class: 'ab-marquee', 'aria-hidden': 'true' }, h('div', { class: 'ab-marquee-inner' }, track(), track()));
  }

  // ---------- 1. story ----------
  function storySection(c) {
    var d = c.story || {};
    var boxes = (d.boxes || []).filter(function (b) { return has(b.title) || has(b.text); });
    var photo = img(d.image, '');
    var media = photo ? reveal(h('figure', { class: 'ab-story-media ab-tilt', 'data-tilt': '6' },
      h('span', { class: 'ab-layer ab-layer-back', 'aria-hidden': 'true' }),
      h('span', { class: 'ab-layer ab-layer-frame', 'aria-hidden': 'true' }),
      h('span', { class: 'ab-layer ab-layer-photo' }, photo),
      h('span', { class: 'ab-layer ab-layer-tag', 'aria-hidden': 'true' }, h('b', { text: 'सेतु' }), h('i', { text: 'Setu' }))), 'left') : null;
    return h('section', { class: 'ab-sec ab-story', id: 'ab-story', 'aria-labelledby': 'ab-story-title' },
      h('div', { class: 'ab-wrap' },
        head(d.eyebrow, d.title, has(d.lead) ? h('p', { class: 'ab-lead', text: d.lead }) : null, 'ab-story-title'),
        h('div', { class: 'ab-story-grid' + (media ? '' : ' no-media') },
          media,
          h('div', { class: 'ab-story-copy' },
            paras(d.body, 'ab-body').map(function (p) { return reveal(p, 'up'); }),
            boxes.length ? h('div', { class: 'ab-boxes' }, boxes.map(function (b, i) {
              return reveal(h('div', { class: 'ab-box ab-tilt ab-spot', 'data-tilt': '7' },
                h('span', { class: 'ab-box-n', text: pad2(i + 1), 'aria-hidden': 'true' }),
                h('h3', { text: b.title }),
                has(b.text) && h('p', { text: b.text })), 'up', i + 1);
            })) : null,
            has(d.closing) && reveal(h('p', { class: 'ab-statement', text: d.closing }), 'up', 3)))));
  }

  // ---------- 2. how it helps ----------
  function howSection(c) {
    var d = c.how || {};
    var tabs = (d.tabs || []).filter(function (t) { return has(t.label); });
    if (!tabs.length) return null;
    var thumb = h('span', { class: 'ab-seg-thumb', 'aria-hidden': 'true' });
    var seg = h('div', { class: 'ab-seg', role: 'tablist', 'aria-label': d.title || 'How YogSetu helps' }, thumb);
    var panels = [], buttons = [];

    function placeThumb() {
      var b = buttons.filter(function (x) { return x.getAttribute('aria-selected') === 'true'; })[0];
      if (!b || !b.offsetWidth) return;
      thumb.style.width = b.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + b.offsetLeft + 'px)';
    }
    function select(idx, focus) {
      buttons.forEach(function (b, i) {
        var on = i === idx;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      placeThumb();
      if (window.AboutFX) window.AboutFX.replay(panels[idx]);
      if (focus) buttons[idx].focus();
    }
    tabs.forEach(function (t, i) {
      var uid = 'ab-tab-' + i;
      var btn = h('button', { type: 'button', role: 'tab', id: uid, 'aria-controls': uid + '-panel', class: 'ab-seg-btn', text: t.label });
      btn.addEventListener('click', function () { select(i); });
      btn.addEventListener('keydown', function (e) {
        var n = tabs.length, next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % n;
        else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = n - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
      buttons.push(btn);
      seg.appendChild(btn);
      var steps = (t.steps || []).filter(function (s) { return has(s.title) || has(s.text); });
      panels.push(h('div', { class: 'ab-tabpanel', role: 'tabpanel', id: uid + '-panel', 'aria-labelledby': uid },
        h('ol', { class: 'ab-steps' }, steps.map(function (s, n) {
          return reveal(h('li', { class: 'ab-step ab-tilt ab-spot', 'data-tilt': '8' },
            h('span', { class: 'ab-step-n', text: pad2(n + 1), 'aria-hidden': 'true' }),
            h('h3', { text: s.title }),
            has(s.text) && h('p', { text: s.text })), 'up', n);
        }))));
    });
    // initial state without triggering the replay (the observer reveals on scroll)
    buttons.forEach(function (b, i) { b.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); b.tabIndex = i === 0 ? 0 : -1; panels[i].hidden = i !== 0; });
    var relayout = function () { placeThumb(); };
    window.addEventListener('resize', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    setTimeout(relayout, 60);

    return h('section', { class: 'ab-sec ab-how', 'aria-labelledby': 'ab-how-title' },
      h('div', { class: 'ab-wrap' }, head(d.eyebrow, d.title, seg, 'ab-how-title'), panels));
  }

  // ---------- 3. why (dark bento) ----------
  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';
  function whySection(c) {
    var d = c.why || {};
    var items = (d.items || []).filter(function (x) { return has(x.title) || has(x.text); });
    return h('section', { class: 'ab-sec ab-why ab-dark', 'aria-labelledby': 'ab-why-title' },
      h('div', { class: 'ab-wrap' },
        head(d.eyebrow, d.title, null, 'ab-why-title'),
        items.length ? h('ul', { class: 'ab-bento n' + Math.min(items.length, 6) }, items.map(function (it, i) {
          var tick = h('span', { class: 'ab-tick', 'aria-hidden': 'true' });
          tick.innerHTML = TICK; // constant markup
          return reveal(h('li', { class: 'ab-glass ab-tilt ab-spot b' + (i + 1), 'data-tilt': '6' },
            h('span', { class: 'ab-glass-n', text: pad2(i + 1), 'aria-hidden': 'true' }),
            tick, h('h3', { text: it.title }), has(it.text) && h('p', { text: it.text })), 'up', i);
        })) : null,
        has(d.disclaimer) && reveal(h('p', { class: 'ab-disclaimer', text: d.disclaimer }), 'up')));
  }

  // ---------- 4. mission / vision / values ----------
  function cubeOf(values) {
    var n = Math.min(values.length, 8);
    if (n < 3) return null;
    var apothem = 84;
    var faceW = Math.round(2 * apothem * Math.tan(Math.PI / n));
    var faces = values.slice(0, n).map(function (v, i) {
      var f = h('span', { class: 'ab-cube-face' }, h('b', { text: v.name }), has(v.meaning) && h('i', { text: v.meaning }));
      f.style.width = faceW + 'px';
      f.style.marginLeft = (-faceW / 2) + 'px';
      f.style.transform = 'rotateY(' + (i * 360 / n) + 'deg) translateZ(' + apothem + 'px)';
      return f;
    });
    var cube = h('div', { class: 'ab-cube', 'aria-hidden': 'true' }, h('div', { class: 'ab-cube-spin' }, faces));
    return h('div', { class: 'ab-cube-wrap', 'aria-hidden': 'true' }, cube);
  }
  function missionSection(c) {
    var d = c.mission || {};
    var values = (d.values || []).filter(function (v) { return has(v.name) || has(v.text); });
    function stmt(label, text, cls) {
      if (!has(text)) return null;
      return h('div', { class: 'ab-stmt ' + cls },
        reveal(h('div', { class: 'ab-stmt-label' }, h('span', { class: 'rule', 'aria-hidden': 'true' }), label), 'up'),
        h('p', { class: 'ab-stmt-text', 'data-scrub': '', text: text }));
    }
    return h('section', { class: 'ab-sec ab-mission', 'aria-label': d.eyebrow || 'Mission, vision and values' },
      h('div', { class: 'ab-wrap' },
        head(d.eyebrow, '', null),
        stmt(d.mission_title || 'Our Mission', d.mission_text, 'is-mission'),
        stmt(d.vision_title || 'Our Vision', d.vision_text, 'is-vision'),
        values.length ? h('div', { class: 'ab-values' },
          reveal(h('div', { class: 'ab-values-head' },
            has(d.values_title) && h('h3', { class: 'ab-values-title', text: d.values_title }),
            cubeOf(values)), 'up'),
          h('div', { class: 'ab-values-grid' }, values.map(function (v, i) {
            return reveal(h('div', { class: 'ab-value ab-tilt ab-spot', 'data-tilt': '9' },
              h('span', { class: 'ab-value-n', text: pad2(i + 1), 'aria-hidden': 'true' }),
              h('span', { class: 'ab-value-name', text: v.name }),
              has(v.meaning) && h('span', { class: 'ab-value-meaning', text: v.meaning }),
              has(v.text) && h('p', { text: v.text })), 'up', i);
          }))) : null));
  }

  // ---------- 5. backed by YogKulam ----------
  function backedSection(c) {
    var d = c.backed || {};
    var stats = (d.stats || []).filter(function (s) { return has(s.number); });
    var badges = (d.badges || []).filter(has);
    return h('section', { class: 'ab-sec ab-backed', 'aria-labelledby': 'ab-backed-title' },
      h('div', { class: 'ab-wrap' },
        head(d.eyebrow, d.title, null, 'ab-backed-title'),
        h('div', { class: 'ab-backed-grid' },
          h('div', { class: 'ab-backed-copy' },
            (d.paragraphs || []).filter(has).map(function (p, i) { return reveal(h('p', { class: 'ab-body ab-body-lg', text: p }), 'up', i); }),
            badges.length ? reveal(h('ul', { class: 'ab-badges', 'aria-label': 'Accreditations' },
              badges.map(function (b) { return h('li', { text: b }); })), 'up', 2) : null),
          stats.length ? h('div', { class: 'ab-stats' }, stats.map(function (s, i) {
            return reveal(h('div', { class: 'ab-stat ab-tilt ab-spot', 'data-tilt': '8' },
              h('span', { class: 'n', 'data-count': '', text: s.number }),
              has(s.label) && h('span', { class: 'k', text: s.label })), 'up', i);
          })) : null)));
  }

  function founderSection(f) {
    if (!f || !has(f.quote)) return null;
    var photo = img(f.image, '');
    return h('section', { class: 'ab-note', 'aria-label': f.eyebrow || 'A note from our founder' },
      h('div', { class: 'ab-wrap ab-note-grid' + (photo ? '' : ' no-photo') },
        h('div', { class: 'ab-note-copy' },
          has(f.eyebrow) && reveal(h('div', { class: 'ab-idx' }, h('span', { class: 'rule', 'aria-hidden': 'true' }), h('span', { class: 'lbl', text: f.eyebrow })), 'up'),
          reveal(h('span', { class: 'ab-qmark', 'aria-hidden': 'true', text: '“' }), 'scale'),
          reveal(h('blockquote', { class: 'ab-quote' }, paras(f.quote)), 'up', 1),
          reveal(h('div', { class: 'ab-note-by' },
            has(f.name) && h('span', { class: 'ab-note-name', text: f.name }),
            has(f.role) && h('span', { class: 'ab-note-role', text: f.role })), 'up', 2)),
        photo ? reveal(h('div', { class: 'ab-note-photo ab-tilt', 'data-tilt': '7' },
          h('span', { class: 'ab-note-disc', 'aria-hidden': 'true' }), photo), 'right') : null));
  }

  // ---------- 6. gallery ----------
  function gallerySection(c) {
    if (!window.AboutGallery) return null;
    return window.AboutGallery.build(c.gallery || {}, ctx);
  }

  // ---------- closing CTA ----------
  function ctaSection(c) {
    var d = c.cta || {};
    var btns = [cta(d.primary_cta, 'ab-btn-primary'), cta(d.secondary_cta, 'ab-btn-ghost')].filter(Boolean);
    var bg = img(d.image, 'ab-cta-img');
    if (bg) bg.setAttribute('alt', '');
    return h('section', { class: 'ab-cta', 'aria-labelledby': 'ab-cta-title' },
      bg && h('div', { class: 'ab-cta-bg', 'aria-hidden': 'true', 'data-parallax': '0.06' }, bg),
      h('div', { class: 'ab-cta-scrim', 'aria-hidden': 'true' }),
      h('div', { class: 'ab-wrap ab-cta-inner' },
        has(d.kicker) && reveal(h('div', { class: 'ab-idx on-dark' }, h('span', { class: 'rule', 'aria-hidden': 'true' }), h('span', { class: 'lbl', text: d.kicker })), 'up'),
        has(d.title) && reveal(h('h2', { id: 'ab-cta-title', class: 'ab-cta-title' }, rich(d.title)), 'up', 1),
        has(d.text) && reveal(h('p', { class: 'ab-cta-text', text: d.text }), 'up', 2),
        btns.length && reveal(h('div', { class: 'ab-btn-row' }, btns), 'up', 3)));
  }

  // ---------- render ----------
  function render(c) {
    if (c.meta) {
      if (has(c.meta.title)) document.title = c.meta.title;
      var md = document.querySelector('meta[name="description"]');
      if (md && has(c.meta.description)) md.setAttribute('content', c.meta.description);
    }
    sectionNo = 0;
    var sections = [
      heroSection(c), marqueeSection(c), storySection(c), howSection(c), whySection(c),
      missionSection(c), backedSection(c), founderSection((c.backed || {}).founder),
      gallerySection(c), ctaSection(c)
    ];
    root.textContent = '';
    root.removeAttribute('aria-busy');
    sections.forEach(function (s) { if (s) root.appendChild(s); });
    try { if (window.AboutFX) window.AboutFX.init(root); } catch (e) { root.classList.add('ab-nofx'); }
  }

  function getJson(url) {
    return fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  getJson('/api/content/about')
    .then(function (j) { return j.content; })
    .catch(function () { return getJson('assets/data/about-default.json'); })
    .then(render)
    .catch(function (e) {
      if (window.console) console.error(e);
      root.textContent = '';
      root.appendChild(h('p', { class: 'ab-error', text: 'This page could not be loaded right now. Please refresh in a moment.' }));
    });
})();
