// Public contact form -> contact_messages (read and triaged from the admin dashboard).
const express = require('express');
const router = express.Router();
const db = require('../config/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // ip -> [timestamps]

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}
setInterval(() => { const now = Date.now(); hits.forEach((v, k) => { if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k); }); }, WINDOW_MS).unref();

// POST /api/contact
router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    // honeypot: real visitors never see or fill this field — pretend success to bots
    if (typeof b.website === 'string' && b.website.trim()) return res.json({ message: 'Thanks — message received.' });

    const name = String(b.name || '').trim().slice(0, 100);
    const email = String(b.email || '').trim().slice(0, 200);
    const topic = String(b.topic || 'General question').trim().slice(0, 100) || 'General question';
    const message = String(b.message || '').replace(/\r\n?/g, '\n').trim();

    if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (message.length < 10) return res.status(400).json({ error: 'Please write a few words about how we can help (at least 10 characters).' });
    if (message.length > 3000) return res.status(400).json({ error: 'Your message is too long — please keep it under 3,000 characters.' });
    if (limited(req.ip)) return res.status(429).json({ error: 'You have sent several messages recently. Please try again in a while, or email hello@yogsetu.com.' });

    await db.query(
      'INSERT INTO contact_messages (name, email, topic, message, user_id, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, topic, message, req.session && req.session.user ? req.session.user.id : null, String(req.ip || '').slice(0, 64)]
    );
    res.status(201).json({ message: 'Thanks — message received.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
