// One-off: add "Site pages" + "Contact messages" to the admin dashboard.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const file = path.join(root, 'public/admin-dashboard.html');
let s = fs.readFileSync(file, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };

// ---- sidebar
rep(`<span class="lbl">About page</span></button>`,
  `<span class="lbl">About page</span></button>
      <button class="wsn-nav-item" data-section="site-pages"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg><span class="lbl">Legal &amp; contact pages</span></button>
      <button class="wsn-nav-item" data-section="contact-messages" data-badge-zero="true"><svg viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M3 7l9 6 9-6"/></svg><span class="lbl">Contact messages</span><span class="badge" id="tabContactCount">0</span></button>`);

// ---- panels (inserted before the post-for-client panel)
rep(`<section data-section-panel="post-for-client" hidden>`,
  `<section data-section-panel="site-pages" hidden>
  <div class="alert info"><div>Edit the text of the <a href="/terms" target="_blank" rel="noopener">Terms</a>, <a href="/privacy" target="_blank" rel="noopener">Privacy</a>, <a href="/refund" target="_blank" rel="noopener">Refund</a> and <a href="/contact" target="_blank" rel="noopener">Contact</a> pages. Each page has its own <strong>Save changes</strong> button and goes live immediately. Sections you add here also appear in the page&rsquo;s &ldquo;On this page&rdquo; index.</div></div>
  <div class="pg-tabs" id="pgTabs" role="tablist" aria-label="Page to edit">
    <button type="button" role="tab" class="is-active" aria-selected="true" data-page="terms">Terms &amp; Conditions</button>
    <button type="button" role="tab" aria-selected="false" data-page="privacy">Privacy Policy</button>
    <button type="button" role="tab" aria-selected="false" data-page="refund">Refund Policy</button>
    <button type="button" role="tab" aria-selected="false" data-page="contact">Contact page</button>
  </div>
  <div class="ae" id="pgEditor">Open this tab to load the page content&hellip;</div>
  <div class="ae-savebar">
    <span class="status" id="pgStatus" role="status" aria-live="polite"></span>
    <button type="button" class="btn-xs ghost" id="pgReset">Reset to original</button>
    <a class="btn-xs ghost ae-view" id="pgView" href="/terms" target="_blank" rel="noopener">View page &nearr;</a>
    <button type="button" class="btn-xs dark" id="pgSave">Save changes</button>
  </div>
</section>

<section data-section-panel="contact-messages" hidden>
  <div class="alert info">Messages sent through the <a href="/contact" target="_blank" rel="noopener">Contact page</a>. Reply from your own mailbox with the <strong>Reply</strong> button, then mark the message resolved.</div>
  <div class="dcard">
    <div class="dcard-head"><h2>Inbox</h2>
      <div class="cm-filters" id="cmFilters" role="group" aria-label="Filter messages">
        <button type="button" class="is-active" data-cm-filter="">All</button>
        <button type="button" data-cm-filter="new">New <span id="cmCountNew">0</span></button>
        <button type="button" data-cm-filter="read">Read <span id="cmCountRead">0</span></button>
        <button type="button" data-cm-filter="resolved">Resolved <span id="cmCountResolved">0</span></button>
      </div>
    </div>
    <div class="dtable-wrap"><table class="dtable"><thead><tr><th>Received</th><th>From</th><th>Topic</th><th>Message</th><th>Status</th><th></th></tr></thead><tbody id="cmBody"></tbody></table></div>
  </div>
</section>

<section data-section-panel="post-for-client" hidden>`);

// ---- titles / crumbs
rep(`    'post-for-client': ['Post for a Client', 'For phone, WhatsApp or walk-in leads'],`,
  `    'site-pages':      ['Legal & Contact Pages', 'Edit the Terms, Privacy, Refund and Contact pages'],
    'contact-messages': ['Contact Messages', 'Messages sent through the public contact form'],
    'post-for-client': ['Post for a Client', 'For phone, WhatsApp or walk-in leads'],`);
rep(`'about-page':'about page',`, `'about-page':'about page', 'site-pages':'legal pages', 'contact-messages':'contact messages',`);

// ---- contact inbox logic (after the profile-comments block)
rep(`  document.addEventListener('wsn:section', function(ev){ if(ev.detail === 'profile-content') loadProfileContent(); });`,
  `  document.addEventListener('wsn:section', function(ev){ if(ev.detail === 'profile-content') loadProfileContent(); });

  // ---- contact-form inbox ----
  let cmFilter = '';
  function setContactCounts(c){
    document.getElementById('cmCountNew').textContent = c.new;
    document.getElementById('cmCountRead').textContent = c.read;
    document.getElementById('cmCountResolved').textContent = c.resolved;
    const badge = document.getElementById('tabContactCount');
    badge.textContent = c.new;
    badge.hidden = !c.new;
  }
  async function loadContactMessages(){
    try {
      const r = await api('/api/admin/contact-messages' + (cmFilter ? '?status=' + cmFilter : ''));
      setContactCounts(r.counts);
      document.getElementById('cmBody').innerHTML = r.messages.length ? r.messages.map(function(m){
        const pill = m.status === 'new' ? 'pending' : m.status === 'resolved' ? 'active' : 'open';
        const subject = encodeURIComponent('Re: ' + m.topic + ' — YogSetu');
        return '<tr data-row><td>' + timeAgo(m.created_at) + '</td><td class="name">' + esc(m.name) + '<br><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></td><td>' + esc(m.topic) + '</td><td style="white-space:pre-wrap;max-width:420px;">' + esc(m.message) + '</td><td><span class="status-pill ' + pill + '">' + m.status + '</span></td><td class="row-actions">'
          + '<a class="btn-xs dark" href="mailto:' + esc(m.email) + '?subject=' + subject + '">Reply</a> '
          + (m.status !== 'read' ? '<button class="btn-xs ghost" data-cm="' + m.id + '" data-cm-to="read">Mark read</button> ' : '')
          + (m.status !== 'resolved' ? '<button class="btn-xs ghost" data-cm="' + m.id + '" data-cm-to="resolved">Resolve</button> ' : '')
          + '<button class="btn-xs ghost" data-cm-del="' + m.id + '">Delete</button></td></tr>';
      }).join('') : '<tr><td colspan="6" class="tl-empty">No messages here yet.</td></tr>';
      document.querySelectorAll('[data-cm]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          try { await api('/api/admin/contact-messages/' + btn.getAttribute('data-cm'), { method: 'PATCH', body: JSON.stringify({ status: btn.getAttribute('data-cm-to') }) }); loadContactMessages(); }
          catch(e){ toast(e.message, true); }
        });
      });
      document.querySelectorAll('[data-cm-del]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          if(!window.confirm('Delete this message permanently?')) return;
          try { await api('/api/admin/contact-messages/' + btn.getAttribute('data-cm-del'), { method: 'DELETE' }); toast('Message deleted.'); loadContactMessages(); }
          catch(e){ toast(e.message, true); }
        });
      });
    } catch(e){ toast(e.message, true); }
  }
  document.getElementById('cmFilters').addEventListener('click', function(e){
    const b = e.target.closest('[data-cm-filter]');
    if(!b) return;
    cmFilter = b.getAttribute('data-cm-filter');
    document.querySelectorAll('#cmFilters button').forEach(function(x){ x.classList.toggle('is-active', x === b); });
    loadContactMessages();
  });
  document.addEventListener('wsn:section', function(ev){ if(ev.detail === 'contact-messages') loadContactMessages(); });
  // keep the sidebar badge current without opening the tab
  api('/api/admin/contact-messages?status=new').then(function(r){ setContactCounts(r.counts); }).catch(function(){});`);

// ---- script
rep(`<script src="/assets/js/admin-about.js"></script>`, `<script src="/assets/js/admin-about.js"></script>\n<script src="/assets/js/admin-pages.js"></script>`);

fs.writeFileSync(file, s);
fs.appendFileSync(path.join(root, 'public/assets/css/admin-about.css'), `
/* ---- Legal & contact pages editor: page tabs ---- */
.pg-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:5px;background:var(--paper,#fff);border:1px solid var(--line,#E3E1DB);border-radius:14px;}
.pg-tabs button{flex:1 1 auto;padding:10px 16px;border:0;border-radius:10px;background:transparent;font:inherit;font-size:13.5px;font-weight:600;color:var(--ink-soft,#55524A);cursor:pointer;}
.pg-tabs button:hover{background:var(--sand,#FAFAF8);color:var(--ink,#1C1B18);}
.pg-tabs button.is-active{background:var(--pine-deep,#171614);color:#FFFDF7;}
.pg-tabs button:focus-visible{outline:3px solid var(--marigold,#D97757);outline-offset:1px;}

/* ---- Contact inbox filters ---- */
.cm-filters{display:flex;flex-wrap:wrap;gap:6px;}
.cm-filters button{padding:6px 12px;border:1px solid var(--line,#E3E1DB);border-radius:999px;background:var(--paper,#fff);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink-soft,#55524A);cursor:pointer;}
.cm-filters button span{margin-left:4px;color:var(--ink-faint,#8C887D);font-weight:500;}
.cm-filters button.is-active{background:var(--pine-deep,#171614);border-color:var(--pine-deep,#171614);color:#fff;}
.cm-filters button.is-active span{color:rgba(255,255,255,.7);}
`);
console.log('patched');
