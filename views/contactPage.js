// <main> of the Contact page, rendered from the admin-managed content.
const { esc } = require('../lib/site');
const { ICONS } = require('../utils/pageContent');

const ICON_SVG = {
  email: '<path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M3 5a2 2 0 0 1 2-2h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5z"/>',
  pin: '<path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
};

function render(c) {
  const f = c.form;
  const topics = f.topics.filter(Boolean);
  const info = c.info.filter((i) => i.title || i.text);
  return `
<section class="page-hero ph-pine lg-hero ct-hero">
  <div class="ph-inner">
    <div class="kicker mono"><span class="rule" aria-hidden="true"></span><span>${esc(c.hero.kicker)}</span></div>
    <h1 class="ph-title">${esc(c.hero.title)}</h1>
    ${c.hero.lede ? `<p class="ph-lede">${esc(c.hero.lede)}</p>` : ''}
  </div>
</section>

<div class="ct-wrap">
  <div class="ct-grid">
    <section class="ct-card" aria-labelledby="ctFormTitle">
      <div id="ctForm">
        <h2 id="ctFormTitle">${esc(f.title)}</h2>
        ${f.subtitle ? `<p class="ct-sub">${esc(f.subtitle)}</p>` : ''}
        <form id="contactForm" novalidate>
          <div class="ct-row">
            <div class="ct-field"><label for="c-name">Your name</label><input type="text" id="c-name" name="name" autocomplete="name" maxlength="100" required></div>
            <div class="ct-field"><label for="c-email">Email</label><input type="email" id="c-email" name="email" autocomplete="email" maxlength="200" required></div>
          </div>
          <div class="ct-field">
            <label for="c-topic">Topic</label>
            <select id="c-topic" name="topic">${(topics.length ? topics : ['General question']).map((t) => `<option>${esc(t)}</option>`).join('')}</select>
          </div>
          <div class="ct-field">
            <label for="c-msg">Message</label>
            <textarea id="c-msg" name="message" rows="6" maxlength="3000" placeholder="${esc(f.placeholder)}" required></textarea>
          </div>
          <div class="ct-hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
          <p class="ct-error" id="ctError" role="alert" hidden></p>
          <button type="submit" class="btn btn-primary ct-submit">${esc(f.submit_label)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        </form>
      </div>
      <div class="ct-success" id="ctSuccess" hidden>
        <span class="ct-success-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg></span>
        <h2>${esc(f.success_title)}</h2>
        <p>${esc(f.success_text)}</p>
      </div>
    </section>
${info.length ? `
    <aside class="ct-info" aria-label="Contact details">
      ${c.info_title ? `<h2 class="mono">${esc(c.info_title)}</h2>` : ''}
      <ul>
        ${info.map((i) => `<li>
          <span class="ct-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON_SVG[ICONS.includes(i.icon) ? i.icon : 'email']}</svg></span>
          <div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>
        </li>`).join('\n        ')}
      </ul>
    </aside>` : ''}
  </div>
</div>
`;
}

module.exports = { render };
