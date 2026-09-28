// <main> of a job (requirement) detail page, rendered from the database.
const { esc, URLS } = require('../lib/site');
const { CHECK_SVG } = require('./common');
const { bandOf } = require('./jobsPage');

const STATUS_LABEL = { open: 'Open', matched: 'Matched', closed: 'Closed' };
const PIN_SVG = '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>';

const count = (n, suffix) => `<span class="count" data-target="${n}"${suffix ? ` data-suffix="${suffix}"` : ''}>0</span>`;

function timeLabel(t) {
  return t ? esc(t) : '&mdash;';
}

function render(job, crumbs) {
  const [key, icon] = bandOf(job.styleSlug);
  const cs = job.clientStats;
  const where = job.mode === 'online' ? 'Online' : (job.cityName ? `${job.cityName}` : 'Location flexible');
  const tagList = [...job.tags, 'Verified client'];
  const open = job.status === 'open';

  const similar = job.similar.slice(0, 4).map((s) => `
    <a class="rd-similar-card" href="${esc(s.url)}">
      <span class="tag">${esc(s.styleShort || 'Yoga')}</span>
      <h4>${esc(s.title)}</h4>
      <span class="meta">&#128205; ${esc(s.mode === 'online' ? 'Online' : s.cityName || 'Flexible')}${s.schedule ? ` &middot; ${esc(s.schedule)}` : ''}</span>
      <span class="price">${s.budgetMin != null || s.budgetMax != null ? `${esc(s.budgetShort.main)}<span style="font-size:11px;font-weight:400;color:var(--ink-faint);"> /session</span>` : esc(s.budgetShort.main)}</span>
    </a>`).join('');

  return `
<!-- ============ 1. HERO ============ -->
<section class="rd-hero" id="rdHero">
  <div class="rd-hero-bg" aria-hidden="true"></div>

  <div class="rd-hero-inner">
    <div>
      <div class="rd-breadcrumb"><a href="${URLS.jobs()}">Job board</a><span aria-hidden="true">/</span><span class="rd-crumb-title">${esc(job.title)}</span></div>

      <div class="rd-tags mono">
        ${tagList.map((t) => `<span>${esc(t)}</span>`).join('<span class="sep" aria-hidden="true">|</span>')}
      </div>

      <h1 class="rd-title">${esc(job.title)}</h1>

      <div class="rd-meta">
        <span class="rd-status"><span class="status-pill ${esc(job.status)}">${esc(STATUS_LABEL[job.status] || job.status)}</span></span>
        <span>&#128205; ${esc(job.placeText)}</span>
        ${job.schedule ? `<span>&#128337; ${esc(job.schedule)}</span>` : ''}
        <span>${esc(job.postedText)}</span>
      </div>

      <p class="rd-desc">${esc(job.description)}</p>

      <div class="rd-cta">
        ${open ? `<a href="/signup?role=teacher" class="btn btn-primary" id="rdApplyBtn" data-apply="${job.id}">
          Apply to this requirement
          <span class="arrow" aria-hidden="true">&rarr;</span>
        </a>` : `<span class="btn btn-secondary" id="rdApplyBtn" aria-disabled="true">This requirement is ${esc(job.status)}</span>`}
        <a href="${URLS.jobs()}" class="btn btn-secondary">Browse more jobs</a>
      </div>
      <p class="rd-apply-msg" id="rdApplyMsg" role="status" aria-live="polite" hidden></p>
    </div>

    <div class="rd-hero-figure">
      <div class="rd-hero-icon rd-icon--${key}">
        <svg viewBox="0 0 24 24">${icon}</svg>
      </div>
      <div class="rd-float-badge">
        <svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>
        <div><strong>Verified client</strong><span>OTP checked</span></div>
      </div>
      <div class="rd-float-price">
        <strong>${esc(job.budgetShort.main)}</strong>
        ${job.budgetShort.unit ? `<span>${esc(job.budgetShort.unit)}</span>` : ''}
      </div>
    </div>
  </div>
</section>

<!-- ============ 2. STAT BANNER ============ -->
<section class="rd-stats-band">
  <div class="glass-panel is-in rd-stats" id="rdStatPanel">
    <div class="glass-lead">
      <span class="badge" aria-hidden="true">${CHECK_SVG}</span>
      Verified &middot; reviewed before it went live
    </div>
    <div class="glass-stats">
      <div class="glass-stat" style="--i:0">
        <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M9 9h.01M9 15h6M9 12h6"/></svg></span>
        <span class="n">&#10003;</span><span class="k mono">OTP verified</span>
      </div>
      <div class="glass-stat" style="--i:1">
        <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/></svg></span>
        <span class="n">${count(job.applicants)}</span><span class="k mono">Teachers applied</span>
      </div>
      <div class="glass-stat" style="--i:2">
        <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
        <span class="n">${cs.responseHours != null ? count(cs.responseHours, 'h') : '&mdash;'}</span><span class="k mono">Usual response time</span>
      </div>
      <div class="glass-stat" style="--i:3">
        <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></span>
        <span class="n">${cs.replyRate != null ? count(cs.replyRate, '%') : '&mdash;'}</span><span class="k mono">Reply rate</span>
      </div>
    </div>
  </div>
</section>
${job.needs.length ? `
<!-- ============ 3. WHAT THEY'RE LOOKING FOR ============ -->
<section class="rd-section" aria-labelledby="rd-looking-title">
  <h2 id="rd-looking-title">What they're looking for</h2>
  <ul class="rd-checklist">${job.needs.map((n) => `
    <li>
      <span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></span>
      ${esc(n)}
    </li>`).join('')}
  </ul>
</section>` : ''}
${job.hasSchedule ? `
<!-- ============ 4. SCHEDULE NEEDED ============ -->
<section class="rd-schedule">
  <div class="rd-section" aria-labelledby="rd-schedule-title">
    <h2 id="rd-schedule-title">Schedule needed</h2>
    <p class="sub">Set by the client, shown in local time.</p>

    <div class="rd-meter-row" aria-label="Weekly schedule needed">${job.scheduleDays.map((d) => `
      <div class="rd-meter-day">
        <span class="rd-meter-label">${d.label}</span>
        <span class="rd-meter-slot${d.time ? ' is-needed' : ''}" title="${d.time ? esc(d.time) : 'No session'}"></span>
        <span class="rd-meter-time">${timeLabel(d.time)}</span>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

<!-- ============ 5. ABOUT THE CLIENT ============ -->
<section class="rd-section" aria-labelledby="rd-client-title">
  <h2 id="rd-client-title">About the client</h2>
  <ul class="rd-client-list">
    <li>
      <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M9 9h.01M9 15h6M9 12h6"/></svg></span>
      <div><h4>Identity verified by OTP</h4><p>Confirmed before this requirement could be posted.</p></div>
    </li>
    <li>
      <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/><path d="M8.2 11l2 2 4-4.2"/></svg></span>
      <div><h4>Requirement reviewed</h4><p>Checked by the YogSetu team for genuine intent before it went live.</p></div>
    </li>
    <li>
      <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${PIN_SVG}</svg></span>
      <div><h4>${job.mode === 'online' ? 'Wants classes online' : `Based in ${esc(job.localityName ? `${job.localityName}, ${where}` : where)}`}</h4><p>Full contact details are shared only after they approve your connection.</p></div>
    </li>
  </ul>
</section>
${similar ? `
<!-- ============ 6. SIMILAR REQUIREMENTS ============ -->
<section class="rd-section" aria-labelledby="rd-similar-title">
  <h2 id="rd-similar-title">Similar requirements</h2>
  <div class="rd-similar-rail">${similar}
  </div>
</section>` : ''}
`;
}

module.exports = { render };
