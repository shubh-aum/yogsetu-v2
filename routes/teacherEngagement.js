// Visitor-facing and dashboard endpoints for the parts of a teacher profile that
// are not part of the core profile form: public comments, Q&A, specialty chips /
// languages and the 1:1 session formats. Mounted at /api/teachers *before* the
// main teachers router so /me/* routes win over /:id.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const ipHash = (req) => crypto.createHash('sha1').update(String(req.ip || '') + (process.env.SESSION_SECRET || '')).digest('hex');
const cleanList = (list) => [...new Set((Array.isArray(list) ? list : []).map((x) => String(x || '').trim().slice(0, 40)).filter(Boolean))].slice(0, 12);

// ---------------------------------------------------------------- tags
// PUT /api/teachers/me/tags — replace the full set: { focus: [...], languages: [...] }
router.put('/me/tags', requireRole('teacher'), async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const uid = req.session.user.id;
    const focus = cleanList(req.body.focus);
    const languages = cleanList(req.body.languages);
    await conn.beginTransaction();
    await conn.query('DELETE FROM teacher_tags WHERE teacher_user_id = ?', [uid]);
    const rows = [...focus.map((l, i) => [uid, 'focus', l, i]), ...languages.map((l, i) => [uid, 'language', l, i])];
    if (rows.length) await conn.query('INSERT INTO teacher_tags (teacher_user_id, kind, label, sort_order) VALUES ?', [rows]);
    await conn.commit();
    res.json({ focus, languages });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------- formats
// PUT /api/teachers/me/formats — { online: {price,title?,description?,is_popular?} | null, offline: {...} | null }
router.put('/me/formats', requireRole('teacher'), async (req, res, next) => {
  try {
    const uid = req.session.user.id;
    for (const kind of ['online', 'offline']) {
      if (!(kind in req.body)) continue;
      const f = req.body[kind];
      if (!f || f.price === '' || f.price == null) {
        await db.query('DELETE FROM teacher_formats WHERE teacher_user_id = ? AND kind = ?', [uid, kind]);
        continue;
      }
      const price = Number(f.price);
      if (!(price > 0)) return res.status(400).json({ error: `Enter a price greater than 0 for the ${kind} format.` });
      await db.query(
        `INSERT INTO teacher_formats (teacher_user_id, kind, title, price, description, is_popular) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), price = VALUES(price), description = VALUES(description), is_popular = VALUES(is_popular)`,
        [uid, kind, String(f.title || 'Private session').trim().slice(0, 100), price, f.description ? String(f.description).trim().slice(0, 400) : null, f.is_popular ? 1 : 0]
      );
    }
    logAudit(uid, 'Updated session formats', 'teacher', uid);
    const [formats] = await db.query('SELECT id, kind, title, price, description, is_popular FROM teacher_formats WHERE teacher_user_id = ?', [uid]);
    res.json({ formats });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------- public comments + questions
// POST /api/teachers/:id/comments — anyone can leave a public comment (rate-limited, link-free)
router.post('/:id/comments', async (req, res, next) => {
  try {
    if (req.body.website) return res.status(201).json({ comment: { name: 'Guest', body: '' } }); // honeypot filled: pretend it worked
    const name = String(req.body.name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const body = String(req.body.body || '').trim().slice(0, 240);
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
    if (body.length < 3) return res.status(400).json({ error: 'Please write a comment.' });
    if (/(https?:\/\/|www\.|\.(com|in|net|org)\b)/i.test(body)) return res.status(400).json({ error: "Links aren't allowed in comments." });

    const [[teacher]] = await db.query("SELECT user_id FROM teachers WHERE user_id = ? AND verification_status = 'verified'", [req.params.id]);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });

    const hash = ipHash(req);
    const [[recent]] = await db.query('SELECT COUNT(*) AS n FROM teacher_comments WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 1 HOUR)', [hash]);
    if (recent.n >= 5) return res.status(429).json({ error: 'You are commenting too quickly — please try again a little later.' });
    const [[dupe]] = await db.query('SELECT COUNT(*) AS n FROM teacher_comments WHERE teacher_user_id = ? AND body = ? AND created_at > (NOW() - INTERVAL 1 DAY)', [req.params.id, body]);
    if (dupe.n) return res.status(409).json({ error: 'That comment has already been posted.' });

    const authorId = req.session.user ? req.session.user.id : null;
    const [result] = await db.query(
      "INSERT INTO teacher_comments (teacher_user_id, author_name, author_user_id, body, status, ip_hash) VALUES (?, ?, ?, ?, 'published', ?)",
      [req.params.id, name, authorId, body, hash]
    );
    res.status(201).json({ comment: { id: result.insertId, name, body, created_at: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
});

// POST /api/teachers/:id/questions — a logged-in client asks a question (public once the teacher answers)
router.post('/:id/questions', requireRole('client'), async (req, res, next) => {
  try {
    const question = String(req.body.question || '').trim().slice(0, 300);
    if (question.length < 5) return res.status(400).json({ error: 'Please type your question.' });
    const [[teacher]] = await db.query("SELECT user_id FROM teachers WHERE user_id = ? AND verification_status = 'verified'", [req.params.id]);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
    const [[recent]] = await db.query('SELECT COUNT(*) AS n FROM teacher_questions WHERE asker_user_id = ? AND asked_at > (NOW() - INTERVAL 1 DAY)', [req.session.user.id]);
    if (recent.n >= 5) return res.status(429).json({ error: 'You can ask up to 5 questions a day.' });
    const [result] = await db.query('INSERT INTO teacher_questions (teacher_user_id, asker_user_id, question) VALUES (?, ?, ?)', [req.params.id, req.session.user.id, question]);
    res.status(201).json({ id: result.insertId, message: 'Question sent.' });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------- teacher dashboard: engagement
// GET /api/teachers/me/engagement — everything visitors have said on the teacher's public profile
router.get('/me/engagement', requireRole('teacher'), async (req, res, next) => {
  try {
    const uid = req.session.user.id;
    const [comments] = await db.query('SELECT id, author_name, body, status, created_at FROM teacher_comments WHERE teacher_user_id = ? ORDER BY created_at DESC LIMIT 100', [uid]);
    const [questions] = await db.query(
      `SELECT q.id, q.question, q.answer, q.status, q.asked_at, q.answered_at, cl.full_name AS asker_name
         FROM teacher_questions q LEFT JOIN clients cl ON cl.user_id = q.asker_user_id
        WHERE q.teacher_user_id = ? ORDER BY (q.answer IS NULL) DESC, q.asked_at DESC LIMIT 100`, [uid]);
    res.json({ comments, questions });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/teachers/me/comments/:cid — hide or restore a comment on your own profile
router.patch('/me/comments/:cid', requireRole('teacher'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['published', 'hidden'].includes(status)) return res.status(400).json({ error: 'status must be published or hidden.' });
    const [r] = await db.query('UPDATE teacher_comments SET status = ? WHERE id = ? AND teacher_user_id = ?', [status, req.params.cid, req.session.user.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Comment not found.' });
    res.json({ message: status === 'hidden' ? 'Comment hidden.' : 'Comment restored.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/teachers/me/questions/:qid/answer — answering publishes the Q&A on the profile
router.post('/me/questions/:qid/answer', requireRole('teacher'), async (req, res, next) => {
  try {
    const answer = String(req.body.answer || '').trim().slice(0, 1200);
    if (answer.length < 2) return res.status(400).json({ error: 'Write an answer first.' });
    const [r] = await db.query(
      "UPDATE teacher_questions SET answer = ?, status = 'published', answered_at = NOW() WHERE id = ? AND teacher_user_id = ?",
      [answer, req.params.qid, req.session.user.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Question not found.' });
    logAudit(req.session.user.id, 'Answered a profile question', 'teacher_question', req.params.qid);
    res.json({ message: 'Answer published on your profile.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/teachers/me/questions/:qid — hide / restore an answered question
router.patch('/me/questions/:qid', requireRole('teacher'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['published', 'hidden'].includes(status)) return res.status(400).json({ error: 'status must be published or hidden.' });
    const [r] = await db.query('UPDATE teacher_questions SET status = ? WHERE id = ? AND teacher_user_id = ? AND answer IS NOT NULL', [status, req.params.qid, req.session.user.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Question not found.' });
    res.json({ message: 'Updated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
