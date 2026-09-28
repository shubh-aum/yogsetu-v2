const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');

// GET /api/client/dashboard
router.get('/client/dashboard', requireRole('client'), async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const [requirements] = await db.query(
      `SELECT id, title, status, is_visible, created_at,
              (SELECT COUNT(*) FROM requirement_applications ra WHERE ra.requirement_id = requirements.id) AS applicant_count
       FROM requirements WHERE client_user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    const [connections] = await db.query(
      `SELECT conn.id, conn.status, conn.requested_at, t.full_name AS teacher_name
       FROM connections conn JOIN teachers t ON t.user_id = conn.teacher_user_id
       WHERE conn.client_user_id = ? ORDER BY conn.requested_at DESC`,
      [userId]
    );
    res.json({ requirements, connections });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/dashboard
router.get('/teacher/dashboard', requireRole('teacher'), async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const [profile] = await db.query(
      'SELECT full_name, verification_status, per_session_price, trial_price, profile_photo_url FROM teachers WHERE user_id = ?',
      [userId]
    );
    const [applications] = await db.query(
      `SELECT ra.id, ra.status, ra.applied_at, r.title, r.id AS requirement_id,
              r.budget_min, r.budget_max, r.mode, c.name AS city,
              conn.id AS connection_id,
              CASE WHEN conn.status = 'approved' THEN cu.full_name END AS client_name,
              CASE WHEN conn.status = 'approved' THEN u.email END AS client_email,
              CASE WHEN conn.status = 'approved' THEN u.phone END AS client_phone
       FROM requirement_applications ra
       JOIN requirements r ON r.id = ra.requirement_id
       LEFT JOIN cities c ON c.id = r.city_id
       LEFT JOIN connections conn ON conn.source_application_id = ra.id
       LEFT JOIN clients cu ON cu.user_id = conn.client_user_id
       LEFT JOIN users u ON u.id = conn.client_user_id
       WHERE ra.teacher_user_id = ? ORDER BY ra.applied_at DESC`,
      [userId]
    );
    const [connections] = await db.query(
      `SELECT conn.id, conn.status, conn.requested_at, c.full_name AS client_name
       FROM connections conn JOIN clients c ON c.user_id = conn.client_user_id
       WHERE conn.teacher_user_id = ? ORDER BY conn.requested_at DESC`,
      [userId]
    );
    const [ratingRow] = await db.query(
      `SELECT ROUND(AVG(stars), 1) AS avg_rating, COUNT(*) AS rating_count
       FROM ratings WHERE teacher_user_id = ? AND status = 'published'`,
      [userId]
    );
    res.json({ profile: profile[0] || null, applications, connections, rating: ratingRow[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard
router.get('/admin/dashboard', requireRole('admin'), async (req, res, next) => {
  try {
    const [[teacherCounts]] = await db.query(
      `SELECT
        SUM(verification_status = 'pending') AS pending_verification,
        SUM(verification_status = 'verified') AS verified,
        COUNT(*) AS total
       FROM teachers`
    );
    const [[requirementCounts]] = await db.query(
      `SELECT SUM(status = 'open') AS open, SUM(status = 'matched') AS matched, COUNT(*) AS total FROM requirements`
    );
    const [[userCounts]] = await db.query(
      `SELECT SUM(role = 'client') AS clients, SUM(role = 'teacher') AS teachers FROM users`
    );
    const [[connectionCounts]] = await db.query(
      `SELECT SUM(status = 'approved') AS approved, SUM(status = 'pending') AS pending, SUM(status = 'declined') AS declined, COUNT(*) AS total FROM connections`
    );
    const [[ratingCounts]] = await db.query(
      `SELECT SUM(status = 'flagged') AS flagged, COUNT(*) AS total FROM ratings`
    );
    const [[{ feeRevenue }]] = await db.query(
      `SELECT COALESCE(SUM(fee_charged), 0) AS feeRevenue FROM connections WHERE fee_charged IS NOT NULL`
    );
    const [pendingCertifications] = await db.query(
      `SELECT tc.id, tc.certification_name_other, ct.name AS certification_type, t.full_name AS teacher_name
       FROM teacher_certifications tc
       JOIN teachers t ON t.user_id = tc.teacher_user_id
       LEFT JOIN certification_types ct ON ct.id = tc.certification_type_id
       WHERE tc.status = 'pending'
       ORDER BY tc.id DESC LIMIT 20`
    );
    const [recentConnections] = await db.query(
      `SELECT conn.id, conn.status, conn.requested_at, cl.full_name AS client_name, t.full_name AS teacher_name
       FROM connections conn JOIN clients cl ON cl.user_id = conn.client_user_id JOIN teachers t ON t.user_id = conn.teacher_user_id
       ORDER BY conn.requested_at DESC LIMIT 5`
    );
    res.json({ teacherCounts, requirementCounts, userCounts, connectionCounts, ratingCounts, feeRevenue, pendingCertifications, recentConnections });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
