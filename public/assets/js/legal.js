/* Terms / Privacy / Refund: highlight the current section in the index.
   Contact: submit the form to /api/contact and show the success card. */
(function () {
  'use strict';

  // ---------- "on this page" index ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.lg-toc a'));
  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (current) current.classList.remove('is-active');
        current = byId[e.target.id];
        if (current) current.classList.add('is-active');
      });
    }, { rootMargin: '-96px 0px -60% 0px', threshold: 0 });
    document.querySelectorAll('.lg-sec').forEach(function (s) { io.observe(s); });
  }

  // ---------- contact form ----------
  var form = document.getElementById('contactForm');
  if (!form) return;
  var errorEl = document.getElementById('ctError');
  var btn = form.querySelector('button[type="submit"]');

  function showError(msg, field) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    if (field) { field.classList.add('is-invalid'); field.focus(); }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    errorEl.hidden = true;
    var f = form.elements;
    var name = f.name.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
    if (name.length < 2) return showError('Please enter your name.', f.name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('Please enter a valid email address.', f.email);
    if (message.length < 10) return showError('Please write a few words about how we can help.', f.message);

    btn.disabled = true;
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, topic: f.topic.value, message: message, website: f.website.value })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, data: d }; });
    }).then(function (res) {
      if (!res.ok) { showError(res.data.error || 'Something went wrong — please try again.'); return; }
      document.getElementById('ctForm').hidden = true;
      var ok = document.getElementById('ctSuccess');
      ok.hidden = false;
      ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      showError('We could not reach the server. Please try again, or email us directly.');
    }).then(function () { btn.disabled = false; });
  });
})();
