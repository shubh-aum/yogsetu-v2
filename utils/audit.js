const db = require('../config/db');

// Fire-and-forget audit trail entry. Never blocks or fails the calling request.
async function logAudit(actorUserId, action, targetType, targetId) {
  try {
    await db.query(
      'INSERT INTO audit_logs (actor_user_id, action, target_type, target_id) VALUES (?, ?, ?, ?)',
      [actorUserId || null, action, targetType || null, targetId || null]
    );
  } catch (err) {
    console.error('audit log failed:', err.message);
  }
}

module.exports = { logAudit };
