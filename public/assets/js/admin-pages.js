/* ============================================================
   YogSetu — admin-pages.js
   Schema-driven editor for the Terms, Privacy, Refund and Contact pages
   (admin-dashboard.html → "Site pages"). One JSON document per page; SCHEMAS
   below describes every editable field and the form is generated from it.
   Loaded with the dashboard; fetches lazily when the panel is first opened.
   Depends on window.__wsn = { api, toast } exposed by the dashboard, and on
   the .ae-* styles from admin-about.css.
   ============================================================ */
(function () {
  'use strict';

  var host = document.getElementById('pgEditor');
  if (!host) return;

  var RICH = 'Blank line = new paragraph. Start lines with "- " for a bullet list. **bold**, [link text](https://…) and e-mail addresses work too.';
  var ICONS = [
    { v: 'email', l: 'Envelope (email)' }, { v: 'phone', l: 'Phone' }, { v: 'pin', l: 'Map pin' },
    { v: 'clock', l: 'Clock' }, { v: 'chat', l: 'Chat bubble' }, { v: 'shield', l: 'Shield' }
  ];

  var META = { key: 'meta', title: 'Search & sharing', open: false, fields: [
    { k: 'title', t: 'text', label: 'Browser tab / search-result title' },
    { k: 'description', t: 'textarea', rows: 2, label: 'Search-engine description', hint: 'Around 150 characters works best.' }
  ] };

  var LEGAL = [
    META,
    { key: '', title: 'Page header', open: true, fields: [
      { k: 'hero_kicker', path: ['hero', 'kicker'], t: 'text', label: 'Small label above the title' },
      { k: 'hero_title', path: ['hero', 'title'], t: 'text', label: 'Title' },
      { k: 'hero_lede', path: ['hero', 'lede'], t: 'textarea', rows: 3, label: 'Intro sentence' },
      { k: 'updated', t: 'text', label: '“Last updated” date', hint: 'Shown as “Last updated …” — e.g. September 2026. Change it whenever you edit the policy.' }
    ] },
    { key: 'highlights', title: 'Key points (cards under the header)', open: false, list: { k: 'highlights', label: 'Key points', itemLabel: 'Key point', summary: 'title', item: [
      { k: 'title', t: 'text', label: 'Short headline' },
      { k: 'text', t: 'text', label: 'One line of detail' }
    ] } },
    { key: 'sections', title: 'Policy sections', open: true, list: { k: 'sections', label: 'Sections (they also build the “On this page” index)', itemLabel: 'Section', summary: 'heading', item: [
      { k: 'heading', t: 'text', label: 'Section heading' },
      { k: 'body', t: 'textarea', rows: 8, label: 'Text', hint: RICH }
    ] } },
    { key: 'callout', title: 'Closing call-out (coloured card at the bottom)', open: false, fields: [
      { k: 'title', t: 'text', label: 'Heading', hint: 'Leave the heading empty to hide the whole card.' },
      { k: 'text', t: 'textarea', rows: 2, label: 'Text' },
      { k: 'label', t: 'text', label: 'Button text' },
      { k: 'url', t: 'text', label: 'Button link', hint: 'e.g. /contact or https://…' }
    ] }
  ];

  var SCHEMAS = {
    terms: { label: 'Terms & Conditions', url: '/terms', sections: LEGAL },
    privacy: { label: 'Privacy Policy', url: '/privacy', sections: LEGAL },
    refund: { label: 'Refund Policy', url: '/refund', sections: LEGAL },
    contact: { label: 'Contact', url: '/contact', sections: [
      META,
      { key: 'hero', title: 'Page header', open: true, fields: [
        { k: 'kicker', t: 'text', label: 'Small label above the title' },
        { k: 'title', t: 'text', label: 'Title' },
        { k: 'lede', t: 'textarea', rows: 3, label: 'Intro sentence' }
      ] },
      { key: 'form', title: 'Contact form', open: true, fields: [
        { k: 'title', t: 'text', label: 'Form heading' },
        { k: 'subtitle', t: 'text', label: 'Line under the heading' },
        { k: 'topics', t: 'strings', label: 'Topics in the drop-down', addLabel: 'Add topic' },
        { k: 'placeholder', t: 'text', label: 'Message box hint' },
        { k: 'submit_label', t: 'text', label: 'Send button text' },
        { k: 'success_title', t: 'text', label: 'Thank-you heading (after sending)' },
        { k: 'success_text', t: 'textarea', rows: 2, label: 'Thank-you text' }
      ] },
      { key: '', title: 'Contact details (cards on the right)', open: true, fields: [
        { k: 'info_title', t: 'text', label: 'Small heading above the cards' }
      ], list: { k: 'info', label: 'Cards', itemLabel: 'Card', summary: 'title', item: [
        { k: 'icon', t: 'select', options: ICONS, label: 'Icon' },
        { k: 'title', t: 'text', label: 'Label (e.g. Email)' },
        { k: 'text', t: 'text', label: 'Value (e.g. hello@yogsetu.com)' }
      ] } }
    ] }
  };

  // ---------- helpers ----------
  var current = 'terms';
  var state = null;
  var dirty = false;
  var loadedAt = {};
  var statusEl = document.getElementById('pgStatus');
  var saveBtn = document.getElementById('pgSave');
  var resetBtn = document.getElementById('pgReset');
  var viewLink = document.getElementById('pgView');
  var tabsEl = document.getElementById('pgTabs');
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

  function blankOf(fields) {
    var o = {};
    fields.forEach(function (f) { o[f.k] = f.t === 'select' ? f.options[0].v : ''; });
    return o;
  }

  // read / write a field, following f.path (e.g. ['hero','title']) when set
  function getVal(obj, f) {
    if (!f.path) return obj[f.k];
    return f.path.reduce(function (o, k) { return o ? o[k] : undefined; }, obj);
  }
  function setVal(obj, f, v) {
    if (!f.path) { obj[f.k] = v; return; }
    var o = obj;
    for (var i = 0; i < f.path.length - 1; i++) o = o[f.path[i]];
    o[f.path[f.path.length - 1]] = v;
  }

  // ---------- field renderers ----------
  function inputRow(f, obj) {
    var id = 'pg-' + (++uid);
    var el = f.t === 'textarea'
      ? h('textarea', { id: id, rows: f.rows || 3 })
      : h('input', { id: id, type: 'text', autocomplete: 'off' });
    el.value = getVal(obj, f) || '';
    el.addEventListener('input', function () { setVal(obj, f, el.value); setDirty(true); });
    return h('div', { class: 'field ae-field' },
      h('label', { for: id, text: f.label }), el, f.hint ? h('small', { class: 'ae-hint', text: f.hint }) : null);
  }

  function selectRow(f, obj) {
    var id = 'pg-' + (++uid);
    var el = h('select', { id: id }, f.options.map(function (o) { return h('option', { value: o.v, text: o.l }); }));
    el.value = obj[f.k] || f.options[0].v;
    obj[f.k] = el.value;
    el.addEventListener('change', function () { obj[f.k] = el.value; setDirty(true); });
    return h('div', { class: 'field ae-field' }, h('label', { for: id, text: f.label }), el);
  }

  function stringsRow(f, obj) {
    var list = obj[f.k];
    var wrap = h('div', { class: 'ae-strings' });
    function draw() {
      wrap.textContent = '';
      list.forEach(function (val, i) {
        var input = h('input', { type: 'text' });
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
      if (f.t === 'text' || f.t === 'textarea') return inputRow(f, obj);
      if (f.t === 'select') return selectRow(f, obj);
      if (f.t === 'strings') return stringsRow(f, obj);
      return null;
    });
  }

  function renderAll() {
    host.textContent = '';
    SCHEMAS[current].sections.forEach(function (sec) {
      var target = sec.key ? state[sec.key] : state;
      var body = [];
      if (sec.fields) body = body.concat(renderFields(sec.fields, target));
      if (sec.list) body.push(listRow(sec.list, state));
      var d = h('details', { class: 'ae-sec' }, h('summary', { text: sec.title }), h('div', { class: 'ae-sec-body' }, body));
      if (sec.open) d.open = true;
      host.appendChild(d);
    });
  }

  // ---------- load / save / reset ----------
  function endpoint() { return '/api/admin/content/pages/' + current; }

  function markSaved(r, prefix) {
    loadedAt[current] = true;
    statusEl.setAttribute('data-saved', prefix || (r.updated_at ? 'Last saved ' + new Date(r.updated_at).toLocaleString() : 'Showing the original copy'));
    setDirty(false);
  }

  function load() {
    host.textContent = 'Loading…';
    viewLink.setAttribute('href', SCHEMAS[current].url);
    return window.__wsn.api(endpoint()).then(function (r) {
      state = clone(r.content);
      markSaved(r);
      renderAll();
    }).catch(function (e) { host.textContent = ''; host.appendChild(h('p', { class: 'ae-error', text: e.message })); });
  }

  function selectTab(slug) {
    if (slug === current && state) return;
    if (dirty && !window.confirm('You have unsaved changes on this page. Switch anyway and discard them?')) return;
    current = slug;
    Array.prototype.forEach.call(tabsEl.querySelectorAll('button'), function (b) {
      var on = b.getAttribute('data-page') === slug;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    state = null;
    load();
  }

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-page]');
    if (b) selectTab(b.getAttribute('data-page'));
  });

  saveBtn.addEventListener('click', function () {
    if (!state) return;
    saveBtn.disabled = true;
    window.__wsn.api(endpoint(), { method: 'PUT', body: JSON.stringify({ content: state }) })
      .then(function (r) {
        state = clone(r.content);
        markSaved(r, 'Saved ' + new Date().toLocaleTimeString());
        renderAll();
        toast(SCHEMAS[current].label + ' saved — it is live now.');
      })
      .catch(function (e) { toast(e.message, true); })
      .then(function () { saveBtn.disabled = false; });
  });

  resetBtn.addEventListener('click', function () {
    if (!window.confirm('Discard every edit to the ' + SCHEMAS[current].label + ' page and go back to the original copy? This changes the live page immediately.')) return;
    window.__wsn.api(endpoint(), { method: 'DELETE' })
      .then(function (r) {
        state = clone(r.content);
        markSaved(r, 'Reset to the original copy');
        renderAll();
        toast('Original copy restored.');
      })
      .catch(function (e) { toast(e.message, true); });
  });

  document.addEventListener('wsn:section', function (e) {
    if (e.detail === 'site-pages' && !loadedAt[current]) load();
  });
})();
