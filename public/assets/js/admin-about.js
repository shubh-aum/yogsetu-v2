/* ============================================================
   YogSetu — admin-about.js
   Schema-driven editor for the About page (admin-dashboard.html →
   "About page"). The whole page is one JSON document; SCHEMA below
   describes every editable field, and the form is generated from it, so a
   new field only needs (1) a key in assets/data/about-default.json and
   (2) a line here. Loaded lazily the first time the panel is opened.
   Depends on window.__wsn = { api, toast } exposed by the dashboard.
   ============================================================ */
(function () {
  'use strict';

  var host = document.getElementById('aboutEditor');
  if (!host) return;

  var HL = 'Wrap words in *asterisks* to highlight them in colour.';

  // ---------- schema ----------
  // t: text | textarea | cta | image | group | list | strings
  var SCHEMA = [
    { key: 'meta', title: 'Page title & search description', fields: [
      { k: 'title', t: 'text', label: 'Browser tab title' },
      { k: 'description', t: 'textarea', rows: 2, label: 'Search-engine description' }
    ] },
    { key: 'hero', title: '1 · Hero', fields: [
      { k: 'kicker', t: 'text', label: 'Small label above the title' },
      { k: 'title', t: 'text', label: 'Title', hint: HL },
      { k: 'description', t: 'textarea', rows: 4, label: 'Intro paragraph' },
      { k: 'primary_cta', t: 'cta', label: 'Primary button' },
      { k: 'secondary_cta', t: 'cta', label: 'Secondary button' },
      { k: 'image', t: 'image', label: 'Photo' }
    ] },
    { key: 'story', title: '2 · Our story', fields: [
      { k: 'eyebrow', t: 'text', label: 'Small label' },
      { k: 'title', t: 'text', label: 'Heading', hint: HL },
      { k: 'lead', t: 'text', label: 'Bold lead line' },
      { k: 'body', t: 'textarea', rows: 4, label: 'Paragraph', hint: 'Leave a blank line between paragraphs.' },
      { k: 'boxes', t: 'list', label: 'Highlight boxes', itemLabel: 'Box', summary: 'title', item: [
        { k: 'title', t: 'text', label: 'Box heading' },
        { k: 'text', t: 'textarea', rows: 3, label: 'Box text' }
      ] },
      { k: 'closing', t: 'text', label: 'Closing line' },
      { k: 'image', t: 'image', label: 'Photo' }
    ] },
    { key: 'how', title: '3 · How YogSetu helps (tabs)', fields: [
      { k: 'eyebrow', t: 'text', label: 'Small label' },
      { k: 'title', t: 'text', label: 'Heading', hint: HL },
      { k: 'tabs', t: 'list', label: 'Tabs', itemLabel: 'Tab', summary: 'label', item: [
        { k: 'label', t: 'text', label: 'Tab name' },
        { k: 'steps', t: 'list', label: 'Steps', itemLabel: 'Step', summary: 'title', item: [
          { k: 'title', t: 'text', label: 'Step title' },
          { k: 'text', t: 'textarea', rows: 2, label: 'Step text' }
        ] }
      ] }
    ] },
    { key: 'why', title: '4 · Why YogSetu', fields: [
      { k: 'eyebrow', t: 'text', label: 'Small label' },
      { k: 'title', t: 'text', label: 'Heading', hint: HL },
      { k: 'items', t: 'list', label: 'Benefits', itemLabel: 'Benefit', summary: 'title', item: [
        { k: 'title', t: 'text', label: 'Title' },
        { k: 'text', t: 'text', label: 'Description' }
      ] },
      { k: 'disclaimer', t: 'textarea', rows: 2, label: 'Small-print disclaimer' }
    ] },
    { key: 'mission', title: '5 · Mission, vision & values', fields: [
      { k: 'eyebrow', t: 'text', label: 'Small label' },
      { k: 'mission_title', t: 'text', label: 'Mission label' },
      { k: 'mission_text', t: 'textarea', rows: 3, label: 'Mission' },
      { k: 'vision_title', t: 'text', label: 'Vision label' },
      { k: 'vision_text', t: 'textarea', rows: 3, label: 'Vision' },
      { k: 'values_title', t: 'text', label: 'Values heading' },
      { k: 'values', t: 'list', label: 'Value cards', itemLabel: 'Value', summary: 'name', item: [
        { k: 'name', t: 'text', label: 'Name (e.g. Shuddhata)' },
        { k: 'meaning', t: 'text', label: 'Meaning (e.g. Integrity)' },
        { k: 'text', t: 'textarea', rows: 2, label: 'Description' }
      ] }
    ] },
    { key: 'backed', title: '6 · Backed by YogKulam & founder note', fields: [
      { k: 'eyebrow', t: 'text', label: 'Small label' },
      { k: 'title', t: 'text', label: 'Heading', hint: HL },
      { k: 'paragraphs', t: 'strings', label: 'Paragraphs', textarea: true, addLabel: 'Add paragraph' },
      { k: 'stats', t: 'list', label: 'Numbers', itemLabel: 'Number', summary: 'number', item: [
        { k: 'number', t: 'text', label: 'Big number / text (e.g. 40,000+)' },
        { k: 'label', t: 'text', label: 'Caption' }
      ] },
      { k: 'badges', t: 'strings', label: 'Accreditation badges', addLabel: 'Add badge' },
      { k: 'founder', t: 'group', label: 'Founder note', fields: [
        { k: 'eyebrow', t: 'text', label: 'Small label' },
        { k: 'quote', t: 'textarea', rows: 9, label: 'Quote', hint: 'Leave a blank line between paragraphs. Quote marks are added automatically.' },
        { k: 'name', t: 'text', label: 'Name' },
        { k: 'role', t: 'text', label: 'Role' },
        { k: 'image', t: 'image', label: 'Photo' }
      ] }
    ] },
    { key: 'gallery', title: '7 · Gallery', fields: [
      { k: 'eyebrow', t: 'text', label: 'Small label' },
      { k: 'title', t: 'text', label: 'Heading', hint: HL },
      { k: 'subtitle', t: 'text', label: 'Subtitle' },
      { k: 'images', t: 'list', label: 'Photos', itemLabel: 'Photo', summary: 'caption', item: [
        { t: 'image', self: true, label: 'Photo' },
        { k: 'caption', t: 'text', label: 'Caption (shown under the photo and in the enlarged view)' }
      ] }
    ] },
    { key: 'cta', title: '8 · Closing call-to-action', fields: [
      { k: 'kicker', t: 'text', label: 'Small label' },
      { k: 'title', t: 'text', label: 'Heading', hint: HL },
      { k: 'text', t: 'textarea', rows: 2, label: 'Text' },
      { k: 'primary_cta', t: 'cta', label: 'Primary button' },
      { k: 'secondary_cta', t: 'cta', label: 'Secondary button' },
      { k: 'image', t: 'image', label: 'Background photo' }
    ] }
  ];

  // ---------- helpers ----------
  var state = null;
  var dirty = false;
  var statusEl = document.getElementById('aeStatus');
  var saveBtn = document.getElementById('aeSave');
  var uid = 0;

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
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toast(msg, isError) { if (window.__wsn) window.__wsn.toast(msg, isError); }

  function setDirty(v) {
    dirty = v;
    statusEl.textContent = v ? 'Unsaved changes' : statusEl.getAttribute('data-saved') || '';
    statusEl.classList.toggle('is-dirty', v);
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // An empty value of the shape a field list describes (for "Add" buttons).
  function blankOf(fields) {
    var o = {};
    fields.forEach(function (f) {
      if (f.self) { o.url = ''; o.alt = ''; return; }
      if (f.t === 'cta') o[f.k] = { label: '', url: '' };
      else if (f.t === 'image') o[f.k] = { url: '', alt: '' };
      else if (f.t === 'list' || f.t === 'strings') o[f.k] = [];
      else if (f.t === 'group') o[f.k] = blankOf(f.fields);
      else o[f.k] = '';
    });
    return o;
  }

  // ---------- field renderers ----------
  function inputRow(f, obj, key) {
    var id = 'ae-' + (++uid);
    var el = f.t === 'textarea'
      ? h('textarea', { id: id, rows: f.rows || 3 })
      : h('input', { id: id, type: 'text', autocomplete: 'off' });
    el.value = obj[key] || '';
    el.addEventListener('input', function () { obj[key] = el.value; setDirty(true); });
    return h('div', { class: 'field ae-field' },
      h('label', { for: id, text: f.label }), el, f.hint ? h('small', { class: 'ae-hint', text: f.hint }) : null);
  }

  function ctaRow(f, obj) {
    var c = obj[f.k];
    var l = h('input', { type: 'text', placeholder: 'Button text', 'aria-label': f.label + ' text' });
    var u = h('input', { type: 'text', placeholder: 'Link, e.g. teachers.html', 'aria-label': f.label + ' link' });
    l.value = c.label || ''; u.value = c.url || '';
    l.addEventListener('input', function () { c.label = l.value; setDirty(true); });
    u.addEventListener('input', function () { c.url = u.value; setDirty(true); });
    return h('div', { class: 'field ae-field' }, h('label', { text: f.label }),
      h('div', { class: 'ae-pair' }, l, u),
      h('small', { class: 'ae-hint', text: 'Leave the text empty to hide this button.' }));
  }

  function imageRow(f, obj) {
    var img = f.self ? obj : obj[f.k];
    var preview = h('img', { class: 'ae-img-preview', alt: '' });
    var noimg = h('span', { class: 'ae-img-empty', text: 'No image' });
    var urlIn = h('input', { type: 'text', placeholder: 'https://… or upload', 'aria-label': f.label + ' URL' });
    var altIn = h('input', { type: 'text', placeholder: 'Describe the photo (for accessibility)', 'aria-label': f.label + ' description' });
    var file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', class: 'ae-file', tabindex: '-1', 'aria-hidden': 'true' });
    var msg = h('small', { class: 'ae-hint' });
    var upBtn = h('button', { type: 'button', class: 'btn-xs ghost', text: 'Upload image' });
    var clearBtn = h('button', { type: 'button', class: 'btn-xs ghost', text: 'Remove' });

    function refresh() {
      urlIn.value = img.url || ''; altIn.value = img.alt || '';
      var has = !!(img.url && img.url.trim());
      if (has) preview.src = img.url;
      preview.hidden = !has; noimg.hidden = has; clearBtn.hidden = !has;
    }
    preview.addEventListener('error', function () { msg.textContent = 'This image could not be loaded — check the link.'; });
    preview.addEventListener('load', function () { msg.textContent = ''; });
    urlIn.addEventListener('input', function () { img.url = urlIn.value.trim(); setDirty(true); refresh(); });
    altIn.addEventListener('input', function () { img.alt = altIn.value; setDirty(true); });
    clearBtn.addEventListener('click', function () { img.url = ''; setDirty(true); refresh(); });
    upBtn.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f0 = file.files[0]; file.value = '';
      if (!f0) return;
      if (f0.size > 8 * 1024 * 1024) { msg.textContent = 'Image is larger than 8 MB.'; return; }
      var fd = new FormData(); fd.append('image', f0);
      upBtn.disabled = true; msg.textContent = 'Uploading…';
      window.__wsn.api('/api/admin/uploads/image', { method: 'POST', body: fd })
        .then(function (r) { img.url = r.url; setDirty(true); msg.textContent = ''; refresh(); })
        .catch(function (e) { msg.textContent = e.message; })
        .then(function () { upBtn.disabled = false; });
    });
    refresh();
    return h('div', { class: 'field ae-field' }, h('label', { text: f.label }),
      h('div', { class: 'ae-img' },
        h('div', { class: 'ae-img-box' }, preview, noimg),
        h('div', { class: 'ae-img-form' }, urlIn, altIn,
          h('div', { class: 'ae-img-actions' }, upBtn, clearBtn, file), msg)));
  }

  function stringsRow(f, obj) {
    var list = obj[f.k];
    var wrap = h('div', { class: 'ae-strings' });
    function draw() {
      wrap.textContent = '';
      list.forEach(function (val, i) {
        var input = f.textarea ? h('textarea', { rows: 3 }) : h('input', { type: 'text' });
        input.value = val;
        input.setAttribute('aria-label', f.label + ' ' + (i + 1));
        input.addEventListener('input', function () { list[i] = input.value; setDirty(true); });
        var del = h('button', { type: 'button', class: 'ae-icon-btn', title: 'Remove', 'aria-label': 'Remove ' + (i + 1), text: '×' });
        del.addEventListener('click', function () { list.splice(i, 1); setDirty(true); draw(); });
        wrap.appendChild(h('div', { class: 'ae-string-row' }, input, del));
      });
      var add = h('button', { type: 'button', class: 'btn-xs ghost', text: '+ ' + (f.addLabel || 'Add') });
      add.addEventListener('click', function () { list.push(''); setDirty(true); draw(); });
      wrap.appendChild(add);
    }
    draw();
    return h('div', { class: 'field ae-field' }, h('label', { text: f.label }), wrap);
  }

  function listRow(f, obj) {
    var list = obj[f.k];
    var wrap = h('div', { class: 'ae-list' });
    function draw() {
      wrap.textContent = '';
      list.forEach(function (item, i) {
        var sum = f.summary && item[f.summary] ? ' — ' + String(item[f.summary]).slice(0, 48) : '';
        var up = h('button', { type: 'button', class: 'ae-icon-btn', title: 'Move up', 'aria-label': 'Move up', text: '↑' });
        var down = h('button', { type: 'button', class: 'ae-icon-btn', title: 'Move down', 'aria-label': 'Move down', text: '↓' });
        var del = h('button', { type: 'button', class: 'ae-icon-btn danger', title: 'Remove', 'aria-label': 'Remove', text: '×' });
        up.disabled = i === 0; down.disabled = i === list.length - 1;
        up.addEventListener('click', function () { list.splice(i - 1, 0, list.splice(i, 1)[0]); setDirty(true); draw(); });
        down.addEventListener('click', function () { list.splice(i + 1, 0, list.splice(i, 1)[0]); setDirty(true); draw(); });
        del.addEventListener('click', function () {
          if (window.confirm('Remove this ' + (f.itemLabel || 'item').toLowerCase() + '?')) { list.splice(i, 1); setDirty(true); draw(); }
        });
        wrap.appendChild(h('div', { class: 'ae-item' },
          h('div', { class: 'ae-item-head' },
            h('strong', { text: (f.itemLabel || 'Item') + ' ' + (i + 1) + sum }),
            h('span', { class: 'ae-item-actions' }, up, down, del)),
          h('div', { class: 'ae-item-body' }, renderFields(f.item, item))));
      });
      var add = h('button', { type: 'button', class: 'btn-xs ghost', text: '+ Add ' + (f.itemLabel || 'item').toLowerCase() });
      add.addEventListener('click', function () { list.push(blankOf(f.item)); setDirty(true); draw(); });
      wrap.appendChild(add);
    }
    draw();
    return h('div', { class: 'ae-listwrap' }, h('div', { class: 'ae-listlabel', text: f.label }), wrap);
  }

  function renderFields(fields, obj) {
    return fields.map(function (f) {
      if (f.t === 'text' || f.t === 'textarea') return inputRow(f, obj, f.k);
      if (f.t === 'cta') return ctaRow(f, obj);
      if (f.t === 'image') return imageRow(f, obj);
      if (f.t === 'strings') return stringsRow(f, obj);
      if (f.t === 'list') return listRow(f, obj);
      if (f.t === 'group') return h('fieldset', { class: 'ae-group' }, h('legend', { text: f.label }), renderFields(f.fields, obj[f.k]));
      return null;
    });
  }

  function renderAll() {
    host.textContent = '';
    SCHEMA.forEach(function (sec, i) {
      var d = h('details', { class: 'ae-sec' }, h('summary', { text: sec.title }),
        h('div', { class: 'ae-sec-body' }, renderFields(sec.fields, state[sec.key])));
      if (i === 0 || i === 1) d.open = true;
      host.appendChild(d);
    });
  }

  // ---------- load / save / reset ----------
  var loaded = false;
  function load() {
    host.textContent = 'Loading…';
    return window.__wsn.api('/api/admin/content/about').then(function (r) {
      state = clone(r.content);
      loaded = true;
      statusEl.setAttribute('data-saved', r.updated_at ? 'Last saved ' + new Date(r.updated_at).toLocaleString() : 'Showing the default content');
      setDirty(false);
      renderAll();
    }).catch(function (e) { host.textContent = ''; host.appendChild(h('p', { class: 'ae-error', text: e.message })); });
  }

  saveBtn.addEventListener('click', function () {
    if (!state) return;
    saveBtn.disabled = true;
    window.__wsn.api('/api/admin/content/about', { method: 'PUT', body: JSON.stringify({ content: state }) })
      .then(function (r) {
        state = clone(r.content);
        statusEl.setAttribute('data-saved', 'Saved ' + new Date().toLocaleTimeString());
        setDirty(false); renderAll(); toast('About page saved — it is live now.');
      })
      .catch(function (e) { toast(e.message, true); })
      .then(function () { saveBtn.disabled = false; });
  });

  document.getElementById('aeReset').addEventListener('click', function () {
    if (!state || !window.confirm('Replace everything in this form with the original content? Nothing changes on the live page until you press Save.')) return;
    fetch('assets/data/about-default.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) { state = d; setDirty(true); renderAll(); toast('Original content loaded — press Save to publish it.'); })
      .catch(function () { toast('Could not load the original content.', true); });
  });

  document.addEventListener('wsn:section', function (e) {
    if (e.detail === 'about-page' && !loaded) load();
  });
})();
