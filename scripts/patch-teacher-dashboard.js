// One-off patch: teacher dashboard gets the fields that feed the public profile
// (headline, summary, locality, focus tags, languages, session formats) and a
// "Questions & Comments" tab. Safe to run once; throws if an anchor is missing.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'public', 'teacher-dashboard.html');
let s = fs.readFileSync(file, 'utf8');
const rep = (anchor, replacement) => {
  if (s.split(anchor).length !== 2) throw new Error('anchor missing or not unique: ' + anchor.slice(0, 70));
  s = s.replace(anchor, () => replacement);
};

// ---------------------------------------------------------------- markup
rep('<button class="dash-tab" data-section="wallet" aria-selected="false">My Wallet</button>',
  '<button class="dash-tab" data-section="engagement" aria-selected="false">Questions &amp; Comments <span class="count" id="tabEngagementCount">0</span></button>\n    <button class="dash-tab" data-section="wallet" aria-selected="false">My Wallet</button>');

rep('<input type="email" id="wEmail" disabled></div>',
  `<input type="email" id="wEmail" disabled></div>
            <div class="field"><label>Specialty headline</label><input type="text" id="wHeadline" maxlength="160" placeholder="e.g. Hatha &amp; Ashtanga"></div>
            <div class="field"><label>Profile summary</label><textarea id="wTagline" maxlength="500" placeholder="One short paragraph shown under your name on your public profile."></textarea></div>`);

rep('<div class="field"><label>Qualifications</label><textarea id="wQualifications"></textarea></div>',
  `<div class="field"><label>Qualifications</label><textarea id="wQualifications"></textarea></div>
        <div class="two-col">
          <div class="field"><label>Focus tags (comma separated)</label><input type="text" id="wFocusTags" placeholder="e.g. Hatha, Ashtanga, Beginners"></div>
          <div class="field"><label>Languages you teach in</label><input type="text" id="wLanguages" placeholder="e.g. English, Hindi"></div>
        </div>`);

rep('<div class="field"><label>Bio</label><textarea id="wBio"></textarea></div>',
  `<div class="field"><label>Locality / area</label><input type="text" id="wLocality" list="localityList" maxlength="100" placeholder="e.g. Gomti Nagar"><datalist id="localityList"></datalist>
          <p style="font-size:12px;color:var(--ink-faint);margin-top:6px;">Used for your local page, e.g. /yoga-teachers/<span id="cityHint">your-city</span>/<span id="localityHint">your-area</span>.</p></div>
        <div class="field"><label>Bio</label><textarea id="wBio" placeholder="Separate paragraphs with a blank line."></textarea></div>`);

rep('<div class="dcard-head" style="margin-top:6px;"><h2 style="font-size:15px;">Package pricing (optional)</h2></div>',
  `<div class="dcard-head" style="margin-top:6px;"><h2 style="font-size:15px;">Session formats on your public profile</h2><p>Leave a price empty to hide that format.</p></div>
        <div class="two-col">
          <div>
            <div class="field"><label>1:1 Online &mdash; price per session (&#8377;)</label><input type="number" id="wFmtOnlinePrice" min="0"></div>
            <div class="field"><label>Online description</label><textarea id="wFmtOnlineDesc" rows="2" maxlength="400" placeholder="e.g. One-on-one over video call, scheduled around your week."></textarea></div>
            <label class="tswitch"><input type="checkbox" id="wFmtOnlinePopular"><span class="track"></span><span class="lbl">Mark as most booked</span></label>
          </div>
          <div>
            <div class="field"><label>1:1 In-studio &mdash; price per session (&#8377;)</label><input type="number" id="wFmtOfflinePrice" min="0"></div>
            <div class="field"><label>In-studio description</label><textarea id="wFmtOfflineDesc" rows="2" maxlength="400" placeholder="e.g. In-person at my studio, props included."></textarea></div>
            <label class="tswitch"><input type="checkbox" id="wFmtOfflinePopular"><span class="track"></span><span class="lbl">Mark as most booked</span></label>
          </div>
        </div>
        <div class="dcard-head" style="margin-top:18px;"><h2 style="font-size:15px;">Package pricing (optional)</h2></div>`);

rep('<div class="dcard-head"><h2>Complete your public profile</h2>',
  '<div class="dcard-head"><h2>Complete your public profile</h2><a id="viewPublicLink" class="btn-xs ghost" href="#" target="_blank" rel="noopener" hidden>View public profile &nearr;</a>');

rep('<section class="dash-section" data-section-panel="wallet" hidden>',
  `<section class="dash-section" data-section-panel="engagement" hidden>
  <div class="dcard">
    <div class="dcard-head"><h2>Questions from students</h2><p>Answer a question to publish it on your public profile. Unanswered questions stay private.</p></div>
    <div id="questionsList"><p class="empty-note">Loading&hellip;</p></div>
  </div>
  <div class="dcard">
    <div class="dcard-head"><h2>Comments on your profile</h2><p>Public comments from visitors. Hide anything that is spam or off-topic.</p></div>
    <div id="commentsList"><p class="empty-note">Loading&hellip;</p></div>
  </div>
</section>

<section class="dash-section" data-section-panel="wallet" hidden>`);

// ---------------------------------------------------------------- scripts
rep("    ratings:  ['Ratings', 'What students are saying'],",
  "    ratings:  ['Ratings', 'What students are saying'],\n    engagement: ['Questions & Comments', 'What visitors are asking and saying on your public profile'],");

rep("    dashSub.textContent = titles[name][1];\n    closeProfileMenu();",
  "    dashSub.textContent = titles[name][1];\n    if(name === 'engagement') loadEngagement();\n    closeProfileMenu();");

// populate the new fields
rep("    setVal('wPerSession', t.per_session_price != null ? Number(t.per_session_price) : '');",
  `    setVal('wHeadline', t.headline || '');
    setVal('wTagline', t.tagline || '');
    setVal('wLocality', t.locality || '');
    const tagsOf = function(kind){ return (DATA.full.tags || []).filter(function(x){ return x.kind === kind; }).map(function(x){ return x.label; }).join(', '); };
    setVal('wFocusTags', tagsOf('focus'));
    setVal('wLanguages', tagsOf('language'));
    ['online','offline'].forEach(function(kind){
      const f = (DATA.full.formats || []).find(function(x){ return x.kind === kind; });
      const cap = kind === 'online' ? 'Online' : 'Offline';
      setVal('wFmt' + cap + 'Price', f ? Number(f.price) : '');
      setVal('wFmt' + cap + 'Desc', f && f.description ? f.description : '');
      const pop = document.getElementById('wFmt' + cap + 'Popular'); if(pop) pop.checked = !!(f && f.is_popular);
    });
    const pub = document.getElementById('viewPublicLink');
    if(pub){ if(t.public_url){ pub.href = t.public_url; pub.hidden = false; } else { pub.hidden = true; } }
    const ch = document.getElementById('cityHint'); if(ch) ch.textContent = (t.city || 'your-city').toLowerCase().replace(/[^a-z0-9]+/g,'-');
    loadLocalities(t.city);
    setVal('wPerSession', t.per_session_price != null ? Number(t.per_session_price) : '');`);

// save the new fields together with the core profile
rep("        per_session_price: document.getElementById('wPerSession').value || null,\n        trial_price: document.getElementById('wTrialPrice').value || null\n      };\n      try {\n        await api('/api/teachers/me/update', { method: 'PUT', body: JSON.stringify(payload) });",
  `        per_session_price: document.getElementById('wPerSession').value || null,
        trial_price: document.getElementById('wTrialPrice').value || null,
        headline: document.getElementById('wHeadline').value.trim(),
        tagline: document.getElementById('wTagline').value.trim(),
        locality: document.getElementById('wLocality').value.trim()
      };
      const splitList = function(id){ return document.getElementById(id).value.split(',').map(function(x){ return x.trim(); }).filter(Boolean); };
      const fmt = function(cap){
        const price = document.getElementById('wFmt' + cap + 'Price').value;
        return price ? { price: Number(price), description: document.getElementById('wFmt' + cap + 'Desc').value.trim(), is_popular: document.getElementById('wFmt' + cap + 'Popular').checked } : null;
      };
      try {
        await api('/api/teachers/me/update', { method: 'PUT', body: JSON.stringify(payload) });
        await api('/api/teachers/me/tags', { method: 'PUT', body: JSON.stringify({ focus: splitList('wFocusTags'), languages: splitList('wLanguages') }) });
        await api('/api/teachers/me/formats', { method: 'PUT', body: JSON.stringify({ online: fmt('Online'), offline: fmt('Offline') }) });
        DATA.full = await api('/api/teachers/me/full');
        const pub = document.getElementById('viewPublicLink');
        if(pub && DATA.full.teacher.public_url){ pub.href = DATA.full.teacher.public_url; pub.hidden = false; }`);
rep("        Object.assign(DATA.full.teacher, payload);\n        if(note){ note.hidden = false;", "        if(note){ note.hidden = false;");

// new helpers: localities datalist + engagement tab
rep("  // ---- wizard: save core profile fields ----",
  `  // ---- locality suggestions for the city typed above ----
  async function loadLocalities(city){
    const list = document.getElementById('localityList');
    if(!list || !city) return;
    try {
      const r = await api('/api/lookups/localities?city=' + encodeURIComponent(city));
      list.innerHTML = (r.localities || []).map(function(l){ return '<option value="' + esc(l.name) + '"></option>'; }).join('');
    } catch(e){ /* suggestions are optional */ }
  }
  const cityInput = document.getElementById('wCity');
  if(cityInput){
    cityInput.addEventListener('change', function(){
      loadLocalities(cityInput.value.trim());
      const ch = document.getElementById('cityHint'); if(ch) ch.textContent = (cityInput.value || 'your-city').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-');
    });
  }
  const localityInput = document.getElementById('wLocality');
  if(localityInput){
    localityInput.addEventListener('input', function(){
      const lh = document.getElementById('localityHint'); if(lh) lh.textContent = (localityInput.value || 'your-area').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-');
    });
  }

  // ---- questions & comments from the public profile ----
  async function loadEngagement(){
    try {
      const r = await api('/api/teachers/me/engagement');
      const unanswered = (r.questions || []).filter(function(q){ return !q.answer; }).length;
      setText('tabEngagementCount', String(unanswered));
      const qBox = document.getElementById('questionsList');
      qBox.innerHTML = (r.questions || []).length ? r.questions.map(function(q){
        const answered = !!q.answer;
        return '<div class="list-row" data-qid="' + q.id + '"><div class="body">' +
          '<div class="top-line"><h4>' + esc(q.question) + '</h4><span class="status-pill ' + (answered ? (q.status === 'hidden' ? 'declined' : 'approved') : 'pending') + '">' + (answered ? (q.status === 'hidden' ? 'hidden' : 'published') : 'needs answer') + '</span><span class="time">' + esc(q.asker_name || 'Student') + ' &middot; ' + timeAgo(q.asked_at) + '</span></div>' +
          (answered ? '<p>' + esc(q.answer) + '</p><div class="actions"><button class="btn-xs ghost" data-q-toggle="' + (q.status === 'hidden' ? 'published' : 'hidden') + '">' + (q.status === 'hidden' ? 'Show on profile' : 'Hide from profile') + '</button></div>'
            : '<div class="field" style="margin-top:8px;"><textarea rows="2" maxlength="1200" placeholder="Write your answer&hellip;" data-q-answer></textarea></div><div class="actions"><button class="btn-xs dark" data-q-publish>Publish answer</button></div>') +
          '</div></div>';
      }).join('') : '<p class="empty-note">No questions yet. When a student asks something on your profile, it shows up here.</p>';
      qBox.querySelectorAll('[data-q-publish]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          const row = btn.closest('[data-qid]');
          const answer = row.querySelector('[data-q-answer]').value.trim();
          try { await api('/api/teachers/me/questions/' + row.getAttribute('data-qid') + '/answer', { method: 'POST', body: JSON.stringify({ answer: answer }) }); toast('Answer published on your profile.'); loadEngagement(); }
          catch(e){ toast(e.message, true); }
        });
      });
      qBox.querySelectorAll('[data-q-toggle]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          const row = btn.closest('[data-qid]');
          try { await api('/api/teachers/me/questions/' + row.getAttribute('data-qid'), { method: 'PATCH', body: JSON.stringify({ status: btn.getAttribute('data-q-toggle') }) }); loadEngagement(); }
          catch(e){ toast(e.message, true); }
        });
      });
      const cBox = document.getElementById('commentsList');
      cBox.innerHTML = (r.comments || []).length ? r.comments.map(function(c){
        const hidden = c.status === 'hidden';
        return '<div class="list-row" data-cid="' + c.id + '"><span class="avatar">' + esc(initials(c.author_name)) + '</span><div class="body">' +
          '<div class="top-line"><h4>' + esc(c.author_name) + '</h4><span class="status-pill ' + (hidden ? 'declined' : 'approved') + '">' + (hidden ? 'hidden' : 'visible') + '</span><span class="time">' + timeAgo(c.created_at) + '</span></div>' +
          '<p>' + esc(c.body) + '</p><div class="actions"><button class="btn-xs ghost" data-c-toggle="' + (hidden ? 'published' : 'hidden') + '">' + (hidden ? 'Restore' : 'Hide') + '</button></div></div></div>';
      }).join('') : '<p class="empty-note">No comments yet.</p>';
      cBox.querySelectorAll('[data-c-toggle]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          const row = btn.closest('[data-cid]');
          try { await api('/api/teachers/me/comments/' + row.getAttribute('data-cid'), { method: 'PATCH', body: JSON.stringify({ status: btn.getAttribute('data-c-toggle') }) }); loadEngagement(); }
          catch(e){ toast(e.message, true); }
        });
      });
    } catch(e){ toast('Could not load questions & comments — ' + e.message, true); }
  }

  // ---- wizard: save core profile fields ----`);

fs.writeFileSync(file, s);
console.log('teacher-dashboard.html patched');
