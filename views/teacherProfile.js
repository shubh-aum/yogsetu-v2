// <main> of a teacher profile page, rendered from the database. The markup mirrors
// the original static profile so teacher-profile.css and its inline scripts keep working.
const { esc, money, timeAgo, avatarColor, shortName } = require('../lib/site');
const { STAR_SVG, CHECK_SVG, stars, clip } = require('./common');

const COLORS = ['var(--marigold)', 'var(--pine)', 'var(--sage)', 'var(--marigold-deep)'];
const colorFor = (s) => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const paras = (text) => String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

function statBlock(icon, index, value, label) {
  return `
      <div class="glass-stat tp-tilt" style="--i:${index}">
        <span class="ico" aria-hidden="true">${icon}</span>
        <span class="n">${value}</span><span class="k mono">${label}</span>
      </div>`;
}
const count = (n, { suffix = '', decimals = 0 } = {}) =>
  `<span class="count" data-target="${n}"${suffix ? ` data-suffix="${suffix}"` : ''}${decimals ? ` data-decimals="${decimals}"` : ''}>0</span>`;

function thumb(t) {
  return `
          <a class="tp-hero-thumb" href="${esc(t.url)}">
            ${t.photo ? `<img src="${esc(t.photo)}" alt="" loading="lazy" onerror="this.closest('.tp-hero-thumb').classList.add('missing')">` : ''}
            <span class="fallback" aria-hidden="true">${esc(t.initials)}</span>
            <span class="nm">${esc(t.name.split(' ')[0])}</span>
          </a>`;
}

function relatedCard(t) {
  return `
    <article class="tcard tp-tilt" data-tid="${esc(t.slug)}">
      <a href="${esc(t.url)}" class="shot${t.photo ? '' : ' missing'}">
        ${t.photo ? `<img src="${esc(t.photo)}" alt="${esc(t.name)}" loading="lazy" onerror="this.closest('.shot').classList.add('missing')">` : ''}
        <span class="fallback" aria-hidden="true">${esc(t.initials)}</span>
        ${t.rating != null ? `<span class="rating">${STAR_SVG}${t.rating.toFixed(1)} <span class="count">(${t.ratingCount})</span></span>` : ''}
        <span class="vbadge">${CHECK_SVG}Verified</span>
      </a>
      <div class="info">
        <h3><a href="${esc(t.url)}">${esc(t.name)}</a></h3>
        <p class="meta">${esc([t.headline, t.cityName].filter(Boolean).join(' · '))}</p>
        <div class="tags">${t.tags.slice(0, 3).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      </div>
    </article>`;
}

function formatCards(p, first) {
  const cards = [];
  const cheapest = Math.min(...[...p.formats.map((f) => f.price), p.price].filter((x) => x));
  p.formats.forEach((f) => {
    const tag = f.kind === 'online' ? '1:1 &middot; Online' : '1:1 &middot; In-studio';
    cards.push(`
              <div class="tp-format-card${f.popular ? ' is-popular' : ''} tp-tilt">
                <span class="tp-format-tag">${tag}</span>
                <h3>${esc(f.title)}</h3>
                <div class="price">${money(f.price)}<span> / session</span></div>
                <p>${esc(f.description || '')}</p>
                <a href="/signup?role=client" data-connect="${p.id}" class="btn ${f.popular ? 'btn-primary' : 'btn-secondary'}">${f.popular ? 'Send connection request' : 'Ask about this'}</a>
              </div>`);
  });
  if (!p.formats.length && p.price) {
    cards.push(`
              <div class="tp-format-card is-popular tp-tilt">
                <span class="tp-format-tag">1:1</span>
                <h3>Private session</h3>
                <div class="price">${money(p.price)}<span> / session</span></div>
                <p>One-on-one with ${esc(first)}, scheduled around your week.</p>
                <a href="/signup?role=client" data-connect="${p.id}" class="btn btn-primary">Send connection request</a>
              </div>`);
  }
  p.packages.forEach((k) => {
    const base = p.formats.length ? Math.max(...p.formats.map((f) => f.price)) : p.price;
    const save = base ? base * k.sessions - k.total : 0;
    cards.push(`
              <div class="tp-format-card tp-tilt">
                <span class="tp-format-tag">Package</span>
                <h3>${k.sessions}-session pack</h3>
                <div class="price">${money(k.total)}<span> / ${k.sessions} sessions</span></div>
                <p>${save > 0 ? `Save ${money(save)} versus booking one at a time` : 'Best value for a regular practice'}${p.mode === 'hybrid' ? ' &mdash; mix of online and in-studio, your choice.' : '.'}</p>
                <a href="/signup?role=client" data-connect="${p.id}" class="btn btn-secondary">Ask about this</a>
              </div>`);
  });
  void cheapest;
  return cards.join('');
}

function render(p) {
  const first = p.name.split(' ')[0];
  const place = [p.cityName, 'India'].filter(Boolean).join(', ');
  const heroTags = [...p.tags.slice(0, 3), 'Verified teacher'];
  const reviewsWord = p.ratingCount === 1 ? 'review' : 'reviews';
  const firstCert = p.certifications.find((c) => c.number);
  const bioParas = paras(p.bio);
  const aboutTags = [...p.tags, ...p.languages];
  const price = p.price || (p.formats[0] && p.formats[0].price);

  // ---------- stats ----------
  const st = p.stats;
  const statsHtml = [
    statBlock('<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>', 0,
      p.rating != null ? count(p.rating, { decimals: 1 }) : '&mdash;', 'Average rating'),
    statBlock('<svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"/></svg>', 1,
      st.students ? count(st.students) : '&mdash;', 'Students connected'),
    statBlock('<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>', 2,
      st.acceptance != null ? count(st.acceptance, { suffix: '%' }) : '&mdash;', 'Request acceptance'),
    statBlock('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>', 3,
      st.responseHours != null ? count(st.responseHours, { suffix: 'h' }) : '&mdash;', 'Avg. response time'),
  ].join('');

  // ---------- availability meter ----------
  const meter = p.weekly.map((d) => `
      <div class="tp-meter-day">
        <span class="tp-meter-label">${d.label}</span>
        <div class="tp-meter-bar">${d.segs.map((s) => `<span class="tp-meter-seg is-${s.state}" title="${esc(s.time)} — ${s.state === 'open' ? 'open' : s.state === 'taken' ? 'booked' : 'no slot'}"></span>`).join('')}</div>
        <span class="tp-meter-count">${d.none ? '&mdash;' : `${d.open} open`}</span>
      </div>`).join('');

  // ---------- reviews ----------
  const reviewItem = (r, hidden) => `
              <div class="tp-lap-item"${hidden ? ' aria-hidden="true"' : ''}>
                <span class="tp-lap-avatar" style="background:${colorFor(r.name)}">${esc(r.initial)}</span>
                <div class="tp-lap-body">
                  <div class="tp-lap-top"><span class="nm">${esc(r.author)}</span><span class="stars">${stars(r.stars)}</span></div>
                  <p>${esc(clip(r.text, 200))}</p>
                </div>
              </div>`;
  const feed = p.reviews.slice(0, 6);
  const reviewsBlock = p.ratingCount ? `
  <div class="tp-rating-summary">
    <div class="tp-rating-big">
      <span class="n">${p.rating.toFixed(1)}</span>
      <span class="stars">${stars(p.rating)}</span>
      <span class="count">${p.ratingCount} ${reviewsWord}</span>
    </div>
    <div class="tp-rating-bars">${p.ratingDistribution.map((d) => `
      <div class="tp-rating-bar"><span>${d.star} star${d.star === 1 ? '' : 's'}</span><span class="track"><span class="fill" style="width:${d.pct}%;"></span></span><span>${d.pct}%</span></div>`).join('')}
    </div>
  </div>
${feed.length ? `
  <div class="tp-laptop-stage">
    <span class="tp-laptop-glow" aria-hidden="true"></span>
    <div class="tp-laptop">
      <div class="tp-laptop-screen">
        <span class="tp-laptop-cam" aria-hidden="true"></span>
        <div class="tp-laptop-display">
          <div class="tp-lap-feed" id="tpLapFeed">
            <div class="tp-lap-track" id="tpLapTrack">${feed.map((r) => reviewItem(r, false)).join('')}${feed.map((r) => reviewItem(r, true)).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="tp-laptop-base" aria-hidden="true"></div>
    </div>
  </div>` : ''}` : `
  <p class="sub">${esc(first)} hasn't received any reviews yet. Reviews appear here once students who have connected through YogSetu rate their sessions.</p>`;

  // ---------- comments ----------
  const commentItem = (c) => `
      <div class="tp-feed-item">
        <span class="tp-feed-avatar" style="background:${colorFor(c.name)}">${esc(String(c.name).trim().charAt(0).toUpperCase() || '?')}</span>
        <div class="tp-feed-body">
          <div class="tp-feed-top"><span class="tp-feed-name">${esc(c.name)}</span><span class="tp-feed-time">${esc(timeAgo(c.createdAt))}</span></div>
          <p>${esc(c.body)}</p>
        </div>
      </div>`;

  // ---------- Q&A ----------
  const qa = p.questions.map((q) => `
    <div class="chat-row q is-in"><div class="bubble q-bubble">${esc(q.question)}</div></div>
    <div class="chat-row a is-in">
      <span class="chat-avatar" aria-hidden="true">${esc(p.initials)}</span>
      <div class="bubble a-bubble is-typed"><p class="a-text">${esc(q.answer)}</p></div>
    </div>`).join('\n');

  // ---------- proof strip ----------
  const quote = p.reviews[0];
  const proofAvatars = p.recentClients.map((c, i) => `<span class="client-avatar" style="background:${avatarColor(c.id + i)}">${esc(c.initial)}</span>`).join('');

  return `
<!-- ============ 1. HERO ============ -->
<section class="tp-hero" id="tpHero">
  <div class="tp-hero-bg" aria-hidden="true"></div>

  <div class="tp-hero-inner">
    <div class="tp-hero-content">
      <div class="tp-hero-tags mono">
        ${heroTags.map((t) => `<span>${esc(t)}</span>`).join('<span class="sep" aria-hidden="true">|</span>')}
      </div>
      <h1 class="tp-hero-title">${esc(p.name)}</h1>
      <div class="tp-hero-meta">
        <span><strong>${p.years} yrs</strong> experience</span>
        <span class="dot" aria-hidden="true"></span>
        <span>${esc(p.localityName ? `${p.localityName}, ${place}` : place)}</span>
        ${p.rating != null ? `<span class="dot" aria-hidden="true"></span>
        <span>&#9733; ${p.rating.toFixed(1)} (${p.ratingCount} ${reviewsWord})</span>` : ''}
      </div>
      <p class="tp-hero-desc">${esc(p.tagline || clip(p.bio, 260))}</p>

      <div class="tp-hero-cta">
        <a href="/signup?role=client" data-connect="${p.id}" class="btn btn-primary">
          Send connection request
          <span class="arrow" aria-hidden="true">&rarr;</span>
        </a>
        <a href="#about" id="tpViewCertsLink" class="btn btn-secondary tp-hero-btn-light">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>
          View certifications
        </a>
        ${price ? `<span class="tp-hero-price">${money(price)}<span>/session</span></span>` : ''}
      </div>
      <p class="tp-hero-note">Your first connection on YogSetu is free &mdash; contact details are shared only once ${esc(first)} approves.</p>
${p.related.length ? `
      <div class="tp-hero-rail">
        <div class="tp-hero-rail-head">
          <span class="mono">More ${esc(p.primaryStyle ? p.primaryStyle.name.toLowerCase() : 'yoga')} teachers</span>
          <div class="tp-hero-rail-nav">
            <button type="button" class="tp-hero-rail-prev" aria-label="Previous"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
            <button type="button" class="tp-hero-rail-next" aria-label="Next"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
          </div>
        </div>
        <div class="tp-hero-rail-track" id="tpHeroRail">${p.related.map(thumb).join('')}
        </div>
      </div>` : ''}
    </div>

    <div class="tp-hero-figure" id="tpHeroFigure">
      <div class="tp-hero-photo${p.photo ? '' : ' missing'}">
        ${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" onerror="this.closest('.tp-hero-photo').classList.add('missing')">` : `<span class="fallback" aria-hidden="true" style="display:grid;place-items:center;height:100%;font-size:72px;font-family:'Fraunces',serif;color:#fff;">${esc(p.initials)}</span>`}
      </div>
      <div class="tp-hero-float-badge">
        <svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>
        <div><strong>Verified</strong><span>${firstCert ? `Cert. No. ${esc(firstCert.number)}` : 'Credentials checked'}</span></div>
      </div>
      ${p.rating != null ? `<div class="tp-hero-float-rating">
        <span class="stars">${stars(p.rating)}</span>
        <strong>${p.rating.toFixed(1)}</strong><span>${p.ratingCount} ${reviewsWord}</span>
      </div>` : ''}
    </div>
  </div>
</section>

<!-- ============ 2. WHY HIRE ============ -->
<section class="tp-section tp-why-band" id="why" aria-labelledby="why-title">
  <div class="sec-head">
    <div class="sec-kicker mono"><span class="num">01</span><span class="rule" aria-hidden="true"></span><span>Why ${esc(first)}</span></div>
    <h2 id="why-title">The numbers, not just the pitch</h2>
    <p class="sub">Every figure below comes from YogSetu's own records &mdash; not self-reported.</p>
  </div>

  <div class="glass-panel tp-stat-panel" id="tpStatPanel">
    <div class="glass-lead">
      <span class="badge" aria-hidden="true">${CHECK_SVG}</span>
      Credential-verified${st.students ? ` &middot; trusted by <strong>${st.students} student${st.students === 1 ? '' : 's'}</strong> so far` : ''}
    </div>
    <div class="glass-stats">${statsHtml}
    </div>
  </div>

  <p class="proof-note">Figures reflect connections made through YogSetu, updated as ${esc(first)} connects with more students.</p>
</section>

<!-- ============ 3. ABOUT ============ -->
<section class="tp-about-dark" id="about" aria-labelledby="about-title">
  <div class="tp-about-inner">

    <div class="sec-kicker mono tp-about-kicker">
      <span class="num">02</span><span class="rule" aria-hidden="true"></span><span>About</span>
    </div>

    <h2 id="about-title" class="tp-about-giant">
      About
      <span class="tp-about-spark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 2l1.8 6.6L20 10.5l-6.2 1.9L12 19l-1.8-6.6L4 10.5l6.2-1.9z"/></svg>
      </span>
      ${esc(first)}
    </h2>

    <div class="tp-about-divider" aria-hidden="true"></div>

    <div class="tp-about-split">
      <div class="tp-about-photo tp-tilt${p.photo ? '' : ' missing'}">
        ${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy" onerror="this.closest('.tp-about-photo').classList.add('missing')">` : ''}
      </div>
      <div class="tp-about-copy">
        ${(bioParas.length ? bioParas : [p.tagline || '']).map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
        <div class="tags tp-about-tags">${aboutTags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
      </div>
    </div>

    <button type="button" class="tp-about-more-btn" id="tpAboutMoreBtn" aria-expanded="false" aria-controls="tpAboutMore">
      <span class="tp-about-more-label">See certifications &amp; pricing</span>
      <span class="tp-about-more-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      </span>
    </button>

    <div class="tp-about-more" id="tpAboutMore">
      <div class="tp-about-more-clip">
        <div class="tp-about-more-panel">
${p.certifications.length ? `
          <div class="tp-about-more-block">
            <div class="tp-about-more-head">
              <span class="tp-about-more-kicker mono">03 &middot; Certifications</span>
              <h3>Verified with the issuing body</h3>
            </div>
            <div class="cert-list">${p.certifications.map((c) => `
              <div class="cert-item tp-tilt">
                <span class="ico">${CHECK_SVG}</span>
                <div><h4>${esc(c.title)}</h4><p>${esc(c.body || 'Issuing body')} &middot; Verified with issuer${c.number ? ` &middot; ${esc(c.number)}` : ''}</p></div>
              </div>`).join('')}
            </div>
            <p style="margin-top:16px;font-size:12.5px;color:var(--ink-faint);">Re-checked annually. Badge expires and is re-verified every 12 months.</p>
          </div>` : ''}

          <div class="tp-about-more-block">
            <div class="tp-about-more-head">
              <span class="tp-about-more-kicker mono">04 &middot; Formats &amp; pricing</span>
              <h3>Pick what fits your week</h3>
            </div>
            <div class="tp-format-grid">${formatCards(p, first)}
            </div>
            <div class="tp-trial-banner">
              <p><strong>First session, no risk.</strong> Your first connection on YogSetu is free &mdash; no platform fee to say hello and ask questions before booking.</p>
              <a href="/signup?role=client" data-connect="${p.id}" class="btn btn-secondary">Start a conversation</a>
            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
</section>

<!-- ============ 4. AVAILABILITY ============ -->
<section class="tp-avail-dark" aria-labelledby="avail-title">
  <div class="tp-section">
    <div class="sec-head">
      <div class="sec-kicker mono"><span class="num">03</span><span class="rule" aria-hidden="true"></span><span>Availability</span></div>
      <h2 id="avail-title">Free slots this week</h2>
      <p class="sub">Set by ${esc(first)}, shown in your local time${st.responseHours != null ? ` &middot; usually responds within ${st.responseHours}h` : ''}${st.acceptance != null ? ` &middot; ${st.acceptance}% acceptance rate` : ''}.</p>
    </div>

    <div class="tp-meter-row" aria-label="Weekly availability meter">${meter}
    </div>

    <div class="tp-avail-legend tp-avail-legend-dark">
      <span><i class="is-open" aria-hidden="true"></i>Open</span>
      <span><i class="is-taken" aria-hidden="true"></i>Booked</span>
      <span><i class="is-empty" aria-hidden="true"></i>No slot</span>
    </div>
  </div>
</section>
${(p.monthStudents || quote) ? `
<!-- ============ 5. SOCIAL PROOF STRIP ============ -->
<section class="tp-proof">
  <div class="tp-section" style="padding-top:clamp(32px,5vh,52px);padding-bottom:clamp(32px,5vh,52px);">
    <div class="tp-proof-inner">
      ${p.monthStudents ? `<div class="tp-proof-clients">
        <span class="client-avatars">${proofAvatars}</span>
        <span class="client-count">${p.monthStudents} student${p.monthStudents === 1 ? '' : 's'} connected this month</span>
      </div>` : ''}
      ${quote ? `<div class="tp-proof-quote">
        <span class="review-stars">${stars(quote.stars)}</span>
        <p>&ldquo;${esc(clip(quote.text, 170))}&rdquo;</p>
        <span>&mdash; ${esc(quote.author)}, verified client</span>
      </div>` : ''}
    </div>
  </div>
</section>` : ''}

<!-- ============ 6. REVIEWS + COMMENTS ============ -->
<section class="tp-section" id="reviews" aria-labelledby="reviews-title">
  <div class="sec-head">
    <div class="sec-kicker mono"><span class="num">04</span><span class="rule" aria-hidden="true"></span><span>Reviews</span></div>
    <h2 id="reviews-title">What students say</h2>
  </div>
${reviewsBlock}

  <div class="tp-comments-block">
    <h3>Comments</h3>
    <p class="sub">Public comments from anyone who's visited this page &mdash; not verified like reviews, just a place to say hello.</p>

    <form class="tp-comment-form" id="tpCommentForm" data-teacher-id="${p.id}">
      <input type="text" id="tpCommentName" name="name" placeholder="Your name" maxlength="40" required aria-label="Your name">
      <textarea id="tpCommentText" name="body" placeholder="Leave a comment&hellip;" maxlength="240" rows="2" required aria-label="Your comment"></textarea>
      <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0;">
      <button type="submit" class="btn btn-primary">Post comment</button>
      <p class="tp-comment-msg" id="tpCommentMsg" role="status" aria-live="polite" hidden></p>
    </form>

    <div class="tp-feed" id="tpCommentFeed">${p.comments.map(commentItem).join('')}
    </div>
  </div>
</section>

<!-- ============ 7. Q&A ============ -->
<section class="tp-section" id="qa" aria-labelledby="qa-title">
  <div class="sec-head">
    <div class="sec-kicker mono"><span class="num">05</span><span class="rule" aria-hidden="true"></span><span>Questions</span></div>
    <h2 id="qa-title">Ask before you connect</h2>
    <p class="sub">Questions here are visible to other visitors too &mdash; so you're not the only one who gets the answer.</p>
  </div>

  <form class="tp-ask-box" id="tpAskForm" data-teacher-id="${p.id}" action="/signup" method="get">
    <input type="hidden" name="role" value="client">
    <input type="text" name="q" placeholder="Ask ${esc(first)} a quick question&hellip;" aria-label="Ask a question" maxlength="300">
    <button type="submit" class="btn btn-primary">Ask</button>
  </form>
  <p class="tp-comment-msg" id="tpAskMsg" role="status" aria-live="polite" hidden></p>
${qa ? `
  <div class="tp-qa-thread chat-thread">
${qa}
  </div>` : ''}
</section>
${p.related.length ? `
<!-- ============ 8. RELATED TEACHERS ============ -->
<section class="tp-section tp-related" id="related" aria-labelledby="related-title">
  <div class="sec-head">
    <div class="sec-kicker mono"><span class="num">06</span><span class="rule" aria-hidden="true"></span><span>More like this</span></div>
    <h2 id="related-title">Other ${esc(p.primaryStyle ? p.primaryStyle.name.toLowerCase() : 'yoga')} teachers</h2>
  </div>
  <div class="rail">${p.related.slice(0, 6).map(relatedCard).join('')}
  </div>
</section>` : ''}
`;
}

module.exports = { render };
void shortName;
