// One-off: admin moderation of public teacher-profile comments and Q&A.
const fs = require('fs');
const root = (p) => require('path').join(__dirname, '..', p);

// ---------------------------------------------------------------- API
let api = fs.readFileSync(root('routes/admin.js'), 'utf8');
const anchor = '// ---- About page (one structured JSON document in cms_content_blocks) ----';
if (!api.includes(anchor)) throw new Error('admin.js anchor');
api = api.replace(anchor, () => `// ---- public profile comments / Q&A moderation ----

// GET /api/admin/teacher-comments?status=published|hidden
router.get('/teacher-comments', async (req, res, next) => {
  try {
    const { status } = req.query;
    const [rows] = await db.query(
      \`SELECT c.id, c.author_name, c.body, c.status, c.created_at, t.full_name AS teacher_name, t.slug AS teacher_slug
         FROM teacher_comments c JOIN teachers t ON t.user_id = c.teacher_user_id
        \${status ? 'WHERE c.status = ?' : ''} ORDER BY c.created_at DESC LIMIT 200\`,
      status ? [status] : []
    );
    res.json({ comments: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/teacher-comments/:id  { status: 'published' | 'hidden' }
router.patch('/teacher-comments/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['published', 'hidden'].includes(status)) return res.status(400).json({ error: 'status must be published or hidden.' });
    const [r] = await db.query('UPDATE teacher_comments SET status = ? WHERE id = ?', [status, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Comment not found.' });
    logAudit(req.session.user.id, \`Set a profile comment to \${status}\`, 'teacher_comment', req.params.id);
    res.json({ message: 'Updated.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/teacher-questions
router.get('/teacher-questions', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      \`SELECT q.id, q.question, q.answer, q.status, q.asked_at, t.full_name AS teacher_name, cl.full_name AS asker_name
         FROM teacher_questions q JOIN teachers t ON t.user_id = q.teacher_user_id
         LEFT JOIN clients cl ON cl.user_id = q.asker_user_id
        ORDER BY q.asked_at DESC LIMIT 200\`
    );
    res.json({ questions: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/teacher-questions/:id  { status: 'published' | 'hidden' }
router.patch('/teacher-questions/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['published', 'hidden'].includes(status)) return res.status(400).json({ error: 'status must be published or hidden.' });
    const [r] = await db.query('UPDATE teacher_questions SET status = ? WHERE id = ? AND answer IS NOT NULL', [status, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Answered question not found.' });
    logAudit(req.session.user.id, \`Set a profile question to \${status}\`, 'teacher_question', req.params.id);
    res.json({ message: 'Updated.' });
  } catch (err) {
    next(err);
  }
});

${anchor}`);
fs.writeFileSync(root('routes/admin.js'), api);

// ---------------------------------------------------------------- dashboard UI
let s = fs.readFileSync(root('public/admin-dashboard.html'), 'utf8');
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error('admin html anchor: ' + a.slice(0, 60)); s = s.replace(a, () => b); };

rep('<button class="wsn-nav-item" data-section="about-page">',
  '<button class="wsn-nav-item" data-section="profile-content"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="lbl">Profile comments &amp; Q&amp;A</span></button>\n      <button class="wsn-nav-item" data-section="about-page">');

rep('<section data-section-panel="about-page" hidden>',
  `<section data-section-panel="profile-content" hidden>
  <div class="dcard">
    <div class="dcard-head"><h2>Comments on teacher profiles</h2><p>Public comments appear immediately; hide spam or abuse here.</p></div>
    <div class="dtable-wrap"><table class="dtable"><thead><tr><th>Teacher</th><th>Author</th><th>Comment</th><th>Posted</th><th>Status</th><th></th></tr></thead><tbody id="pcCommentsBody"></tbody></table></div>
  </div>
  <div class="dcard">
    <div class="dcard-head"><h2>Questions &amp; answers</h2><p>Answered questions are public. Unanswered ones are visible only to the teacher.</p></div>
    <div class="dtable-wrap"><table class="dtable"><thead><tr><th>Teacher</th><th>Asked by</th><th>Question</th><th>Answer</th><th>Status</th><th></th></tr></thead><tbody id="pcQuestionsBody"></tbody></table></div>
  </div>
</section>

<section data-section-panel="about-page" hidden>`);

rep("    'about-page':      ['About Page',", "    'profile-content': ['Profile Comments & Q&A', 'Moderate what visitors post on public teacher profiles'],\n    'about-page':      ['About Page',");
rep("'about-page':'about page',", "'about-page':'about page', 'profile-content':'profile comments',");

rep("  window.__wsn = { api: api, toast: toast }; // used by assets/js/admin-about.js",
`  window.__wsn = { api: api, toast: toast }; // used by assets/js/admin-about.js

  // ---- profile comments + Q&A moderation ----
  async function loadProfileContent(){
    try {
      const [c, q] = await Promise.all([api('/api/admin/teacher-comments'), api('/api/admin/teacher-questions')]);
      document.getElementById('pcCommentsBody').innerHTML = c.comments.length ? c.comments.map(function(x){
        const hidden = x.status === 'hidden';
        return '<tr data-row><td class="name">' + esc(x.teacher_name) + '</td><td>' + esc(x.author_name) + '</td><td>' + esc(x.body) + '</td><td>' + timeAgo(x.created_at) + '</td><td><span class="status-pill ' + (hidden ? 'declined' : 'active') + '">' + x.status + '</span></td><td class="row-actions"><button class="btn-xs ghost" data-pc-comment="' + x.id + '" data-pc-to="' + (hidden ? 'published' : 'hidden') + '">' + (hidden ? 'Restore' : 'Hide') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="6" class="tl-empty">No comments yet.</td></tr>';
      document.getElementById('pcQuestionsBody').innerHTML = q.questions.length ? q.questions.map(function(x){
        const hidden = x.status === 'hidden';
        return '<tr data-row><td class="name">' + esc(x.teacher_name) + '</td><td>' + esc(x.asker_name || 'Visitor') + '</td><td>' + esc(x.question) + '</td><td>' + (x.answer ? esc(x.answer) : '<em>Not answered yet</em>') + '</td><td><span class="status-pill ' + (x.status === 'published' ? 'active' : x.status === 'hidden' ? 'declined' : 'pending') + '">' + x.status + '</span></td><td class="row-actions">' + (x.answer ? '<button class="btn-xs ghost" data-pc-question="' + x.id + '" data-pc-to="' + (hidden ? 'published' : 'hidden') + '">' + (hidden ? 'Restore' : 'Hide') + '</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="tl-empty">No questions yet.</td></tr>';
      document.querySelectorAll('[data-pc-comment],[data-pc-question]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          const isComment = btn.hasAttribute('data-pc-comment');
          const id = btn.getAttribute(isComment ? 'data-pc-comment' : 'data-pc-question');
          try { await api('/api/admin/teacher-' + (isComment ? 'comments' : 'questions') + '/' + id, { method: 'PATCH', body: JSON.stringify({ status: btn.getAttribute('data-pc-to') }) }); toast('Updated.'); loadProfileContent(); }
          catch(e){ toast(e.message, true); }
        });
      });
    } catch(e){ toast(e.message, true); }
  }
  document.addEventListener('wsn:section', function(ev){ if(ev.detail === 'profile-content') loadProfileContent(); });`);

fs.writeFileSync(root('public/admin-dashboard.html'), s);
console.log('admin moderation patched');
