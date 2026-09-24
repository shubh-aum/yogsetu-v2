/* ============================================================
   YogSetu — about-gallery.js
   The About-page gallery: a 3D coverflow you can scroll (touch, trackpad,
   mouse-drag, arrow buttons, keyboard), and a lightbox that flies the photo
   out of its frame in 3D, tilts with the pointer, and zooms (wheel, pinch,
   double-click, buttons) with drag-to-pan.
   Exposes window.AboutGallery.build(data, ctx) -> <section>.
   ctx = { h, rich, head, has, safeUrl } supplied by about.js.
   ============================================================ */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  // ------------------------------------------------------------
  // Lightbox (created once, on first open)
  // ------------------------------------------------------------
  var lb = null;
  function buildLightbox(ctx) {
    var h = ctx.h;
    var img = h('img', { alt: '', draggable: 'false' });
    var card = h('div', { class: 'ab-lb-card' }, img);
    var stage = h('div', { class: 'ab-lb-stage' }, card);
    var cap = h('p', { class: 'ab-lb-cap' });
    var count = h('span', { class: 'ab-lb-count' });
    var zoomLbl = h('span', { class: 'ab-lb-zoomlbl', 'aria-live': 'off', text: '100%' });
    function btn(cls, label, glyph) { return h('button', { type: 'button', class: 'ab-lb-btn ' + cls, 'aria-label': label, title: label, text: glyph }); }
    var close = btn('ab-lb-close', 'Close', '×');
    var prev = btn('ab-lb-prev', 'Previous photo', '‹');
    var next = btn('ab-lb-next', 'Next photo', '›');
    var zin = btn('ab-lb-z', 'Zoom in', '+');
    var zout = btn('ab-lb-z', 'Zoom out', '−');
    var zreset = btn('ab-lb-z ab-lb-reset', 'Reset zoom', '↺');
    var bar = h('div', { class: 'ab-lb-bar' },
      h('div', { class: 'ab-lb-meta' }, count, cap),
      h('div', { class: 'ab-lb-tools', role: 'group', 'aria-label': 'Zoom' }, zout, zoomLbl, zin, zreset));
    var el = h('div', { class: 'ab-lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Photo viewer', hidden: true },
      stage, close, prev, next, bar);
    document.body.appendChild(el);

    var S = { items: [], i: 0, frames: [], scale: 1, tx: 0, ty: 0, rx: 0, ry: 0, busy: false, onIndex: null };
    var pointers = {};              // active pointers for pan / pinch
    var pinch0 = null, panStart = null, moved = 0, swipe0 = null;

    function apply() {
      card.style.transform = 'translate3d(' + S.tx + 'px,' + S.ty + 'px,0) scale(' + S.scale + ') rotateX(' + S.rx + 'deg) rotateY(' + S.ry + 'deg)';
      zoomLbl.textContent = Math.round(S.scale * 100) + '%';
      el.classList.toggle('is-zoomed', S.scale > 1.001);
      zout.disabled = S.scale <= 1.001;
      zin.disabled = S.scale >= 5;
    }
    function clampPan() {
      if (S.scale <= 1.001) { S.tx = 0; S.ty = 0; return; }
      var w = card.offsetWidth * S.scale, hgt = card.offsetHeight * S.scale;
      var mx = Math.max(0, (w - stage.clientWidth) / 2 + 40), my = Math.max(0, (hgt - stage.clientHeight) / 2 + 40);
      S.tx = clamp(S.tx, -mx, mx); S.ty = clamp(S.ty, -my, my);
    }
    function zoomTo(next, cx, cy) {
      next = clamp(next, 1, 5);
      var r = stage.getBoundingClientRect();
      var px = (cx == null ? r.left + r.width / 2 : cx) - (r.left + r.width / 2);
      var py = (cy == null ? r.top + r.height / 2 : cy) - (r.top + r.height / 2);
      var k = next / S.scale;
      S.tx = px - (px - S.tx) * k; S.ty = py - (py - S.ty) * k; S.scale = next;
      S.rx = 0; S.ry = 0;
      clampPan(); apply();
    }
    function resetView() { S.scale = 1; S.tx = S.ty = S.rx = S.ry = 0; apply(); }

    function paint() {
      var it = S.items[S.i];
      img.src = ctx.safeUrl(it.url);
      img.alt = it.alt || '';
      cap.textContent = it.caption || '';
      cap.hidden = !ctx.has(it.caption);
      count.textContent = pad2(S.i + 1) + ' / ' + pad2(S.items.length);
      var multi = S.items.length > 1;
      prev.hidden = next.hidden = !multi;
      resetView();
    }

    function decoded() {
      return (img.decode ? img.decode() : Promise.resolve()).catch(function () {});
    }

    function open(items, i, frames, fromRect) {
      S.items = items; S.i = i; S.frames = frames;
      [el, card].forEach(function (n) { n.getAnimations().forEach(function (a) { a.cancel(); }); });
      el.hidden = false;
      document.documentElement.classList.add('ab-lb-open');
      card.style.opacity = '0';
      paint();
      close.focus({ preventScroll: true });
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 1 : 320, easing: 'ease-out' });
      decoded().then(function () {
        card.style.opacity = '';
        if (reduce || !fromRect) return;
        var to = card.getBoundingClientRect();
        var dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2);
        var dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
        card.animate([
          { transform: 'translate3d(' + dx + 'px,' + dy + 'px,-240px) scale(' + (fromRect.width / to.width) + ') rotateY(-24deg)', opacity: 0.35 },
          { transform: 'translate3d(0,0,0) scale(1) rotateY(0deg)', opacity: 1 }
        ], { duration: 680, easing: 'cubic-bezier(.16,.84,.24,1)' });
      });
    }

    function closeLb() {
      if (el.hidden || S.closing) return;
      S.closing = true;
      var fr = S.frames[S.i];
      var finish = function () {
        [el, card].forEach(function (n) { n.getAnimations().forEach(function (a) { a.cancel(); }); });
        el.hidden = true;
        S.closing = false;
        document.documentElement.classList.remove('ab-lb-open');
        if (fr && fr.parentNode && fr.parentNode.focus) fr.parentNode.focus({ preventScroll: true });
      };
      if (S.onIndex) S.onIndex(S.i);      // bring that photo to the centre of the gallery first
      if (reduce) return finish();
      // wait a frame so the coverflow has re-laid-out before we measure its frame
      requestAnimationFrame(function () {
        var rect = fr && fr.getBoundingClientRect();
        var visible = rect && rect.width && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-in', fill: 'forwards' }).onfinish = finish;
        if (visible && S.scale <= 1.001) {
          var from = card.getBoundingClientRect();
          var dx = rect.left + rect.width / 2 - (from.left + from.width / 2);
          var dy = rect.top + rect.height / 2 - (from.top + from.height / 2);
          card.animate([
            { transform: 'translate3d(0,0,0) scale(1) rotateY(0deg)' },
            { transform: 'translate3d(' + dx + 'px,' + dy + 'px,-200px) scale(' + (rect.width / from.width) + ') rotateY(20deg)', opacity: 0.2 }
          ], { duration: 320, easing: 'ease-in', fill: 'forwards' });
        }
      });
    }

    function go(dir) {
      if (S.busy || S.items.length < 2) return;
      S.busy = true;
      var n = S.items.length;
      var out = function () {
        S.i = (S.i + dir + n) % n;
        if (S.onIndex) S.onIndex(S.i);
        paint();
        card.style.opacity = '0';
        return decoded().then(function () {
          card.style.opacity = '';
          if (reduce) return;
          return card.animate([
            { transform: 'translate3d(' + (dir * 90) + 'px,0,-160px) rotateY(' + (dir * -26) + 'deg)', opacity: 0 },
            { transform: 'translate3d(0,0,0) rotateY(0deg)', opacity: 1 }
          ], { duration: 420, easing: 'cubic-bezier(.16,.84,.24,1)' }).finished.catch(function () {});
        });
      };
      var done = function () { S.busy = false; };
      if (reduce) { out().then(done); return; }
      card.animate([
        { transform: card.style.transform || 'none', opacity: 1 },
        { transform: 'translate3d(' + (dir * -90) + 'px,0,-160px) rotateY(' + (dir * 26) + 'deg)', opacity: 0 }
      ], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished.then(function () {
        return out();
      }).then(function () {
        [].forEach.call(card.getAnimations(), function (a) { a.cancel(); });
        done();
      }, done);
    }

    // ---- interactions ----
    close.addEventListener('click', closeLb);
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    zin.addEventListener('click', function () { zoomTo(S.scale * 1.5); });
    zout.addEventListener('click', function () { zoomTo(S.scale / 1.5); });
    zreset.addEventListener('click', resetView);
    // pointer capture retargets click to the stage, so remember what the press *started* on
    el.addEventListener('click', function () { if (S.downOnBackdrop && moved < 6 && S.scale <= 1.001) closeLb(); });

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomTo(S.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY);
    }, { passive: false });
    // double-click / double-tap zoom, detected from pointer events (the native dblclick is
    // unreliable with pointer capture and touch-action:none)
    var lastTap = null;
    function tapZoom(e) {
      var now = Date.now();
      if (lastTap && now - lastTap.t < 340 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        zoomTo(S.scale > 1.001 ? 1 : 2.6, e.clientX, e.clientY);
        lastTap = null;
      } else {
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    }

    stage.addEventListener('pointerdown', function (e) {
      S.downOnBackdrop = e.target === stage;
      if (e.pointerType === 'mouse') stage.setPointerCapture(e.pointerId); // touch is captured implicitly
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      moved = 0;
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), s: S.scale };
        swipe0 = null;
      } else {
        panStart = { x: e.clientX, y: e.clientY, tx: S.tx, ty: S.ty };
        swipe0 = { x: e.clientX, t: Date.now() };
      }
      card.classList.add('is-drag');
    });
    stage.addEventListener('pointermove', function (e) {
      var p = pointers[e.pointerId];
      if (!p) {
        // hover tilt (mouse only, when not zoomed)
        if (e.pointerType === 'mouse' && S.scale <= 1.001 && !reduce) {
          var r = stage.getBoundingClientRect();
          S.ry = ((e.clientX - r.left) / r.width - 0.5) * 12;
          S.rx = (0.5 - (e.clientY - r.top) / r.height) * 8;
          apply();
        }
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      var ids = Object.keys(pointers);
      if (ids.length === 2 && pinch0) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        zoomTo(pinch0.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
        moved = 99;
      } else if (panStart) {
        var dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        if (S.scale > 1.001) { S.tx = panStart.tx + dx; S.ty = panStart.ty + dy; clampPan(); apply(); }
      }
    });
    function endPointer(e) {
      var wasSingle = Object.keys(pointers).length === 1 && !pinch0;
      if (e.type === 'pointerup' && wasSingle && moved < 6 && !S.downOnBackdrop) tapZoom(e);
      delete pointers[e.pointerId];
      pinch0 = null;
      if (!Object.keys(pointers).length) {
        card.classList.remove('is-drag');
        if (swipe0 && S.scale <= 1.001 && e.pointerType !== 'mouse') {
          var dx = e.clientX - swipe0.x;
          if (Math.abs(dx) > 60 && Date.now() - swipe0.t < 700) go(dx < 0 ? 1 : -1);
        }
        panStart = swipe0 = null;
      }
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse' && S.scale <= 1.001) { S.rx = 0; S.ry = 0; apply(); }
    });

    document.addEventListener('keydown', function (e) {
      if (el.hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === '+' || e.key === '=') zoomTo(S.scale * 1.4);
      else if (e.key === '-' || e.key === '_') zoomTo(S.scale / 1.4);
      else if (e.key === '0') resetView();
      else if (e.key === 'Tab') {
        var f = [close, prev, next, zout, zin, zreset].filter(function (b) { return !b.hidden && !b.disabled; });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    apply();
    return { open: open, setIndexCallback: function (fn) { S.onIndex = fn; } };
  }

  // ------------------------------------------------------------
  // Coverflow section
  // ------------------------------------------------------------
  function build(d, ctx) {
    var h = ctx.h;
    var items = (d.images || []).filter(function (g) { return ctx.has(g.url); });
    if (!items.length) return null;

    var els = [];
    var track = h('div', { class: 'ab-cf-track', tabindex: '0', role: 'group', 'aria-roledescription': 'carousel', 'aria-label': 'Photo gallery — scroll sideways or use the arrow keys' });
    items.forEach(function (g, i) {
      var im = h('img', { src: ctx.safeUrl(g.url), alt: g.alt || '', loading: i < 3 ? 'eager' : 'lazy', decoding: 'async', draggable: 'false' });
      var frame = h('span', { class: 'ab-cf-frame' }, im, h('span', { class: 'ab-cf-sheen', 'aria-hidden': 'true' }));
      var b = h('button', { type: 'button', class: 'ab-cf-btn', 'aria-label': 'View ' + (g.caption || g.alt || 'photo ' + (i + 1)) + ' larger (' + (i + 1) + ' of ' + items.length + ')' }, frame);
      var fig = h('figure', { class: 'ab-cf-item', 'aria-roledescription': 'slide', 'aria-label': (i + 1) + ' of ' + items.length }, b);
      im.addEventListener('load', function () { layout(); });
      els.push({ fig: fig, btn: b, frame: frame, img: im });
      track.appendChild(fig);
    });

    var count = h('span', { class: 'ab-cf-count' });
    var cap = h('p', { class: 'ab-cf-cap', 'aria-live': 'polite' });
    var prev = h('button', { type: 'button', class: 'ab-cf-arrow', 'aria-label': 'Previous photo', text: '←' });
    var next = h('button', { type: 'button', class: 'ab-cf-arrow', 'aria-label': 'Next photo', text: '→' });
    var fill = h('span', { class: 'ab-cf-fill' });
    var bar = h('div', { class: 'ab-cf-bar' },
      h('div', { class: 'ab-cf-bar-l' }, count, cap),
      h('div', { class: 'ab-cf-bar-r' }, prev, next),
      h('div', { class: 'ab-cf-progress', 'aria-hidden': 'true' }, fill));
    var hint = h('p', { class: 'ab-cf-hint', 'aria-hidden': 'true' }, h('span', { class: 'ab-cf-hint-dot' }), 'Drag or scroll sideways · click a photo to zoom');

    var right = ctx.has(d.subtitle) ? h('p', { class: 'ab-sub', text: d.subtitle }) : null;
    var sec = h('section', { class: 'ab-sec ab-gal', 'aria-labelledby': 'ab-gal-title' },
      h('div', { class: 'ab-wrap' }, ctx.head(d.eyebrow, d.title, right, 'ab-gal-title')),
      h('div', { class: 'ab-cf' }, track, h('div', { class: 'ab-cf-floor', 'aria-hidden': 'true' })),
      h('div', { class: 'ab-wrap' }, bar, hint));

    var active = -1, raf = 0;

    function layout() {
      if (!els.length) return;
      var first = els[0].fig.offsetWidth, last = els[els.length - 1].fig.offsetWidth;
      track.style.setProperty('--pad-l', Math.max(16, (track.clientWidth - first) / 2) + 'px');
      track.style.setProperty('--pad-r', Math.max(16, (track.clientWidth - last) / 2) + 'px');
      update();
    }

    function setActive(i) {
      if (i === active) return;
      active = i;
      els.forEach(function (o, k) {
        o.fig.classList.toggle('is-active', k === i);
        o.btn.tabIndex = k === i ? 0 : -1;
        if (k === i) o.fig.setAttribute('aria-current', 'true'); else o.fig.removeAttribute('aria-current');
      });
      var g = items[i];
      count.textContent = pad2(i + 1) + ' / ' + pad2(items.length);
      cap.textContent = g.caption || g.alt || '';
      prev.disabled = i === 0;
      next.disabled = i === items.length - 1;
    }

    function update() {
      raf = 0;
      var vc = track.clientWidth / 2;
      var best = 1e9, bi = 0;
      els.forEach(function (o, i) {
        var w = o.fig.offsetWidth;
        var d = (o.fig.offsetLeft + w / 2 - track.scrollLeft - vc) / (w * 0.72 + 24);
        var ad = Math.abs(d);
        if (ad < best) { best = ad; bi = i; }
        var rot = reduce ? 0 : -clamp(d, -1.7, 1.7) * 30;
        var z = reduce ? 0 : -Math.min(ad, 2.4) * 150;
        var s = 1 - Math.min(ad, 2.4) * 0.085;
        o.fig.style.transform = 'perspective(1500px) translate3d(0,0,' + z.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
        o.fig.style.opacity = String(clamp(1 - Math.max(0, ad - 0.6) * 0.34, 0.25, 1).toFixed(3));
        o.fig.style.zIndex = String(100 - Math.round(ad * 10));
        o.frame.style.setProperty('--sheen', clamp(d, -1, 1).toFixed(3));
      });
      setActive(bi);
      var max = track.scrollWidth - track.clientWidth;
      fill.style.transform = 'scaleX(' + (max > 0 ? clamp(track.scrollLeft / max, 0, 1) : 1).toFixed(4) + ')';
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(update); }

    function goTo(i, instant) {
      i = clamp(i, 0, els.length - 1);
      var f = els[i].fig;
      track.scrollTo({ left: f.offsetLeft + f.offsetWidth / 2 - track.clientWidth / 2, behavior: instant || reduce ? 'auto' : 'smooth' });
    }

    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', layout);
    prev.addEventListener('click', function () { goTo(active - 1); });
    next.addEventListener('click', function () { goTo(active + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
      else if (e.key === 'End') { e.preventDefault(); goTo(els.length - 1); }
    });

    // mouse drag-to-scroll (touch already scrolls natively)
    var drag = null;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: 0 };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      if (drag.moved > 6 && !track.classList.contains('is-drag')) track.classList.add('is-drag');
      if (track.classList.contains('is-drag')) track.scrollLeft = drag.left - dx;
    });
    function endDrag() {
      if (!drag) return;
      var wasDrag = track.classList.contains('is-drag');
      track.classList.remove('is-drag');
      track._justDragged = wasDrag;
      drag = null;
      if (wasDrag) { schedule(); goTo(active); setTimeout(function () { track._justDragged = false; }, 60); }
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    els.forEach(function (o, i) {
      o.btn.addEventListener('click', function () {
        if (track._justDragged) return;
        if (i !== active) { goTo(i); return; }
        lb = lb || buildLightbox(ctx);
        lb.setIndexCallback(function (idx) { goTo(idx, true); });
        lb.open(items, i, els.map(function (x) { return x.frame; }), o.frame.getBoundingClientRect());
      });
    });

    // start centred on the first photo once laid out
    requestAnimationFrame(function () { layout(); goTo(0, true); });
    return sec;
  }

  window.AboutGallery = { build: build };
})();
