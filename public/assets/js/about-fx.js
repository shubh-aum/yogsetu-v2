/* ============================================================
   YogSetu — about-fx.js
   Motion layer for the About page. Everything here is progressive
   enhancement: without JS (or with reduced motion) the content is simply
   visible and static. Exposes window.AboutFX.
     init(root)   — wire up reveal, tilt, counters, scrubbed text, parallax, hero 3D
     replay(el)   — re-run the reveal animation for elements inside `el` (tab switches)
   ============================================================ */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finePointer = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // ---------- scroll reveal ----------
  var revealIO = null;
  function reveal(root) {
    var els = [].slice.call(root.querySelectorAll('[data-reveal]'));
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-in'); });
      return;
    }
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (e) { revealIO.observe(e); });
  }

  function replay(container) {
    if (!container) return;
    [].slice.call(container.querySelectorAll('[data-reveal]')).forEach(function (e) {
      e.classList.remove('is-in');
      void e.offsetWidth;
      if (reduce) e.classList.add('is-in'); else requestAnimationFrame(function () { e.classList.add('is-in'); });
    });
  }

  // ---------- 3D pointer tilt (+ cursor spotlight) ----------
  function tilt(root) {
    if (!finePointer || reduce) return;
    [].slice.call(root.querySelectorAll('.ab-tilt')).forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 8;
      var raf = 0, ev = null;
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        ev = e;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect();
          var px = (ev.clientX - r.left) / r.width;
          var py = (ev.clientY - r.top) / r.height;
          el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          el.classList.add('is-hot');
        });
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        el.classList.remove('is-hot');
      });
    });
  }

  // ---------- count-up numbers ----------
  function counters(root) {
    var els = [].slice.call(root.querySelectorAll('[data-count]'));
    if (!els.length) return;
    function run(el) {
      var text = el.textContent;
      var m = text.match(/(\d[\d,]*)/);
      if (!m) return;
      var target = parseInt(m[1].replace(/,/g, ''), 10);
      var pre = text.slice(0, m.index), post = text.slice(m.index + m[1].length);
      var withCommas = m[1].indexOf(',') !== -1;
      var t0 = null, dur = 1500;
      function fmt(v) { return withCommas ? Math.round(v).toLocaleString('en-US') : String(Math.round(v)); }
      function step(ts) {
        if (t0 === null) t0 = ts;
        var k = clamp((ts - t0) / dur, 0, 1);
        el.textContent = pre + fmt(target * (1 - Math.pow(1 - k, 4))) + post;
        if (k < 1) requestAnimationFrame(step); else el.textContent = text;
      }
      requestAnimationFrame(step);
    }
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    els.forEach(function (e) { io.observe(e); });
  }

  // ---------- scroll-scrubbed text + parallax ----------
  var scrubEls = [];
  var parEls = [];
  function prepScrub(root) {
    [].slice.call(root.querySelectorAll('[data-scrub]')).forEach(function (el) {
      var words = el.textContent.split(/\s+/).filter(Boolean);
      el.textContent = '';
      var spans = words.map(function (w, i) {
        var s = document.createElement('span');
        s.className = 'ab-w';
        s.textContent = w;
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        return s;
      });
      if (reduce) spans.forEach(function (s) { s.classList.add('on'); });
      else scrubEls.push({ el: el, spans: spans });
    });
    if (!reduce) {
      [].slice.call(root.querySelectorAll('[data-parallax]')).forEach(function (el) {
        parEls.push({ el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.08 });
      });
    }
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var vh = window.innerHeight;
      scrubEls.forEach(function (o) {
        var r = o.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3), 0, 1);
        var lit = Math.round(p * 1.08 * o.spans.length);
        o.spans.forEach(function (s, i) { s.classList.toggle('on', i < lit); });
      });
      parEls.forEach(function (o) {
        var r = o.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = (r.top + r.height / 2 - vh / 2) * -o.speed;
        o.el.style.translate = '0 ' + off.toFixed(1) + 'px';
      });
    });
  }

  // ---------- hero WebGL ----------
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  function hero3d(root) {
    var canvas = root.querySelector('.ab-hero-canvas');
    var stage = root.querySelector('.ab-hero-stage');
    var hero = root.querySelector('.ab-hero');
    if (!canvas || !stage || !hero || !hasWebGL()) return;
    var conn = navigator.connection;
    if (conn && conn.saveData) return;
    import('./about-hero3d.js').then(function (mod) {
      var api = mod.initHero3D(canvas, stage, { still: reduce });
      if (!api) return;
      canvas.classList.add('is-ready');
      if (reduce) return;
      var visible = true;
      function sync() { api.setActive(visible && !document.hidden); }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
      }
      document.addEventListener('visibilitychange', sync);
      sync();
    }).catch(function () { /* the CSS backdrop is the fallback */ });
  }

  function init(root) {
    root.classList.add('ab-js');
    prepScrub(root);
    reveal(root);
    tilt(root);
    counters(root);
    hero3d(root);
    if (scrubEls.length || parEls.length) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }
  }

  window.AboutFX = { init: init, replay: replay, reduce: reduce };
})();
