// Everything the public teacher pages read from the database. Cards for
// listings are assembled with a fixed number of batched queries (no per-teacher
// round trips) and every figure shown to visitors is computed from real rows.
const db = require('../config/db');
const { initials, shortName, URLS } = require('../lib/site');

const SLOT_ORDER = ['7:00 AM', '9:00 AM', '6:00 PM', '8:00 PM'];

// Public rating = 70% student average + 30% admin "team rating" (see schema notes)
function blendedRating(avg, count, team) {
  const a = avg == null ? null : Number(avg);
  const t = team == null ? null : Number(team);
  if (a != null && count > 0) return t != null ? a * 0.7 + t * 0.3 : a;
  return t;
}

function expBand(years) {
  const y = Number(years) || 0;
  if (y >= 7) return '7+';
  if (y >= 3) return '3-7';
  return '0-3';
}

function todayIndex() { // Mon=1 ... Sun=7
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function accreditationOf(body) {
  const b = String(body || '');
  if (/yoga alliance/i.test(b)) return 'Yoga Alliance';
  if (/ayush/i.test(b)) return 'AYUSH';
  if (/yttai/i.test(b)) return 'YTTAI';
  if (/pyc/i.test(b)) return 'PYC';
  return null;
}

function availabilityInfo(rows) {
  const open = rows.filter((r) => r.is_available && !r.booked_connection_id);
  const today = todayIndex();
  const availToday = open.some((r) => r.day_of_week === today);
  let text;
  if (availToday) text = 'Available today';
  else if (open.length) text = `${open.length} slot${open.length === 1 ? '' : 's'} this week`;
  else text = 'Fully booked this week';
  return { openCount: open.length, availToday, text, isSoon: !availToday };
}

const groupBy = (rows, key) => {
  const map = new Map();
  rows.forEach((r) => { if (!map.has(r[key])) map.set(r[key], []); map.get(r[key]).push(r); });
  return map;
};

// filters: { cityId, localityId, styleId, excludeId, ids, limit }
async function fetchTeacherCards(filters = {}) {
  const where = ["t.verification_status = 'verified'", "u.status = 'active'"];
  const params = [];
  let join = '';
  if (filters.cityId) { where.push('t.city_id = ?'); params.push(filters.cityId); }
  if (filters.localityId) { where.push('t.locality_id = ?'); params.push(filters.localityId); }
  if (filters.styleId) {
    join = 'JOIN teacher_expertise fe ON fe.teacher_user_id = t.user_id AND fe.style_id = ?';
    params.unshift(filters.styleId);
  }
  if (filters.excludeId) { where.push('t.user_id <> ?'); params.push(filters.excludeId); }
  if (filters.ids) { where.push('t.user_id IN (?)'); params.push(filters.ids.length ? filters.ids : [0]); }

  const [teachers] = await db.query(
    `SELECT t.user_id AS id, t.slug, t.full_name AS name, t.gender, t.years_experience AS years, t.teaching_mode AS mode,
            t.profile_photo_url AS photo, t.per_session_price AS price, t.trial_price AS trialPrice, t.team_rating AS team,
            t.headline, t.tagline, t.bio, t.pincode,
            c.name AS cityName, c.slug AS citySlug, l.name AS localityName, l.slug AS localitySlug
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       ${join}
       LEFT JOIN cities c ON c.id = t.city_id
       LEFT JOIN localities l ON l.id = t.locality_id
      WHERE ${where.join(' AND ')}
      ORDER BY t.team_rating DESC, t.user_id ASC
      LIMIT ${Math.min(Number(filters.limit) || 200, 500)}`,
    params
  );
  if (!teachers.length) return [];
  const ids = teachers.map((t) => t.id);

  const [styles] = await db.query(
    `SELECT te.teacher_user_id AS tid, ys.id, ys.name, ys.slug, ys.short_name AS shortName
       FROM teacher_expertise te JOIN yoga_styles ys ON ys.id = te.style_id
      WHERE te.teacher_user_id IN (?) ORDER BY ys.id`, [ids]);
  const [tags] = await db.query(
    'SELECT teacher_user_id AS tid, kind, label FROM teacher_tags WHERE teacher_user_id IN (?) ORDER BY sort_order, id', [ids]);
  const [ratings] = await db.query(
    `SELECT teacher_user_id AS tid, COUNT(*) AS n, AVG(stars) AS avg
       FROM ratings WHERE status = 'published' AND teacher_user_id IN (?) GROUP BY teacher_user_id`, [ids]);
  const [month] = await db.query(
    `SELECT teacher_user_id AS tid, COUNT(*) AS n FROM connections
      WHERE status = 'approved' AND decided_at >= (NOW() - INTERVAL 30 DAY) AND teacher_user_id IN (?) GROUP BY teacher_user_id`, [ids]);
  const [recent] = await db.query(
    `SELECT tid, clientId, name FROM (
        SELECT c.teacher_user_id AS tid, c.client_user_id AS clientId, cl.full_name AS name,
               ROW_NUMBER() OVER (PARTITION BY c.teacher_user_id ORDER BY c.decided_at DESC) AS rn
          FROM connections c JOIN clients cl ON cl.user_id = c.client_user_id
         WHERE c.status = 'approved' AND c.teacher_user_id IN (?)) x
      WHERE rn <= 3`, [ids]);
  const [lastReviews] = await db.query(
    `SELECT tid, stars, text, name FROM (
        SELECT r.teacher_user_id AS tid, r.stars, r.review_text AS text, cl.full_name AS name,
               ROW_NUMBER() OVER (PARTITION BY r.teacher_user_id ORDER BY r.created_at DESC) AS rn
          FROM ratings r JOIN clients cl ON cl.user_id = r.client_user_id
         WHERE r.status = 'published' AND r.review_text IS NOT NULL AND r.teacher_user_id IN (?)) x
      WHERE rn = 1`, [ids]);
  const [avail] = await db.query(
    'SELECT teacher_user_id AS tid, day_of_week, is_available, booked_connection_id FROM teacher_weekly_availability WHERE teacher_user_id IN (?)', [ids]);
  const [certs] = await db.query(
    "SELECT teacher_user_id AS tid, issuing_body FROM teacher_certifications WHERE status = 'verified' AND teacher_user_id IN (?)", [ids]);

  const by = {
    styles: groupBy(styles, 'tid'), tags: groupBy(tags, 'tid'), ratings: groupBy(ratings, 'tid'), month: groupBy(month, 'tid'),
    recent: groupBy(recent, 'tid'), last: groupBy(lastReviews, 'tid'), avail: groupBy(avail, 'tid'), certs: groupBy(certs, 'tid'),
  };

  return teachers.map((t) => {
    const st = by.styles.get(t.id) || [];
    const rt = (by.ratings.get(t.id) || [])[0];
    const count = rt ? Number(rt.n) : 0;
    const rating = blendedRating(rt ? rt.avg : null, count, t.team);
    const focus = (by.tags.get(t.id) || []).filter((x) => x.kind === 'focus').map((x) => x.label);
    const availInfo = availabilityInfo(by.avail.get(t.id) || []);
    const last = (by.last.get(t.id) || [])[0];
    const bodies = [...new Set((by.certs.get(t.id) || []).map((c) => accreditationOf(c.issuing_body)).filter(Boolean))];
    const card = {
      ...t,
      price: t.price == null ? null : Number(t.price),
      team: t.team == null ? null : Number(t.team),
      initials: initials(t.name),
      styles: st,
      primaryStyle: st[0] || null,
      tags: focus.length ? focus : st.map((s) => s.shortName || s.name),
      rating: rating == null ? null : Math.round(rating * 10) / 10,
      ratingCount: count,
      monthStudents: (by.month.get(t.id) || [{ n: 0 }])[0].n,
      recentClients: (by.recent.get(t.id) || []).map((r) => ({ id: r.clientId, initial: initials(r.name)[0] })),
      lastReview: last ? { stars: last.stars, text: last.text, author: shortName(last.name) } : null,
      accreditations: bodies,
      expBand: expBand(t.years),
      availability: availInfo,
      metaLine: [t.headline || st.map((s) => s.shortName || s.name).join(' & '), t.cityName, `${t.years} yrs exp.`].filter(Boolean).join(' · '),
    };
    card.url = URLS.teacher(card);
    return card;
  });
}

async function getTeacherIdBySlug(slug) {
  const [rows] = await db.query(
    `SELECT t.user_id AS id, c.slug AS citySlug FROM teachers t
       LEFT JOIN cities c ON c.id = t.city_id
      WHERE t.slug = ? AND t.verification_status = 'verified' LIMIT 1`, [slug]);
  return rows[0] || null;
}

function slotsFromAvailability(rows) {
  const times = [...new Set(rows.filter((r) => r.is_available).map((r) => r.time_slot))]
    .sort((a, b) => (SLOT_ORDER.indexOf(a) + 1 || 99) - (SLOT_ORDER.indexOf(b) + 1 || 99));
  const shown = times.length ? times : ['7:00 AM', '6:00 PM'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => {
    const segs = shown.map((time) => {
      const r = rows.find((x) => x.day_of_week === i + 1 && x.time_slot === time && x.is_available);
      if (!r) return { state: 'empty', time };
      return { state: r.booked_connection_id ? 'taken' : 'open', time };
    });
    return { label, segs, open: segs.filter((s) => s.state === 'open').length, none: segs.every((s) => s.state === 'empty') };
  });
  return days;
}

async function getTeacherProfile(id) {
  const [card] = await fetchTeacherCards({ ids: [id], limit: 1 });
  if (!card) return null;

  const [certRows] = await db.query(
    `SELECT tc.id, COALESCE(tc.certification_name_other, ct.name) AS title, tc.issuing_body AS body, tc.certificate_number AS number, tc.verified_at
       FROM teacher_certifications tc LEFT JOIN certification_types ct ON ct.id = tc.certification_type_id
      WHERE tc.teacher_user_id = ? AND tc.status = 'verified' ORDER BY tc.id`, [id]);
  const [formatRows] = await db.query(
    'SELECT kind, title, price, description, is_popular AS popular FROM teacher_formats WHERE teacher_user_id = ? ORDER BY FIELD(kind, "online", "offline")', [id]);
  const [packageRows] = await db.query(
    'SELECT session_count AS sessions, total_price AS total FROM teacher_pricing_packages WHERE teacher_user_id = ? ORDER BY session_count', [id]);
  const [availRows] = await db.query('SELECT day_of_week, time_slot, is_available, booked_connection_id FROM teacher_weekly_availability WHERE teacher_user_id = ?', [id]);
  const [langRows] = await db.query("SELECT label FROM teacher_tags WHERE teacher_user_id = ? AND kind = 'language' ORDER BY sort_order, id", [id]);
  const [dist] = await db.query(
    "SELECT stars, COUNT(*) AS n FROM ratings WHERE teacher_user_id = ? AND status = 'published' GROUP BY stars", [id]);
  const [reviewRows] = await db.query(
    `SELECT r.stars, r.review_text AS text, r.created_at AS createdAt, cl.full_name AS name, cl.user_id AS clientId
       FROM ratings r JOIN clients cl ON cl.user_id = r.client_user_id
      WHERE r.teacher_user_id = ? AND r.status = 'published' AND r.review_text IS NOT NULL
      ORDER BY r.created_at DESC LIMIT 10`, [id]);
  const [[conn]] = await db.query(
    `SELECT SUM(status = 'approved') AS approved, SUM(status = 'declined') AS declined,
            AVG(CASE WHEN status IN ('approved','declined') AND decided_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, requested_at, decided_at) END) AS avgMinutes,
            COUNT(DISTINCT CASE WHEN status = 'approved' THEN client_user_id END) AS students
       FROM connections WHERE teacher_user_id = ?`, [id]);
  const [commentRows] = await db.query(
    `SELECT id, author_name AS name, body, created_at AS createdAt FROM teacher_comments
      WHERE teacher_user_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 30`, [id]);
  const [qaRows] = await db.query(
    `SELECT id, question, answer, answered_at AS answeredAt FROM teacher_questions
      WHERE teacher_user_id = ? AND status = 'published' AND answer IS NOT NULL ORDER BY answered_at DESC LIMIT 12`, [id]);

  const approved = Number(conn.approved) || 0;
  const declined = Number(conn.declined) || 0;
  const decided = approved + declined;
  const total = dist.reduce((s, d) => s + Number(d.n), 0);
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const n = Number((dist.find((d) => d.stars === star) || { n: 0 }).n);
    return { star, n, pct: total ? Math.round((n / total) * 100) : 0 };
  });

  // related: same specialty first, then same city
  let related = [];
  if (card.primaryStyle) related = await fetchTeacherCards({ styleId: card.primaryStyle.id, excludeId: id, limit: 8 });
  if (related.length < 4) {
    const more = await fetchTeacherCards({ cityId: undefined, excludeId: id, limit: 12 });
    const seen = new Set(related.map((r) => r.id));
    more.filter((m) => !seen.has(m.id)).forEach((m) => { if (related.length < 8) related.push(m); });
  }

  const formats = formatRows.map((f) => ({ ...f, price: Number(f.price), popular: !!f.popular }));
  const packages = packageRows.map((p) => ({ sessions: p.sessions, total: Number(p.total) }));

  return {
    ...card,
    certifications: certRows,
    formats,
    packages,
    languages: langRows.map((l) => l.label),
    weekly: slotsFromAvailability(availRows),
    ratingDistribution: distribution,
    reviews: reviewRows.map((r) => ({ ...r, author: shortName(r.name), initial: initials(r.name)[0] })),
    stats: {
      students: Number(conn.students) || 0,
      acceptance: decided ? Math.round((approved / decided) * 100) : null,
      responseHours: conn.avgMinutes == null ? null : Math.max(1, Math.round(Number(conn.avgMinutes) / 60)),
    },
    comments: commentRows,
    questions: qaRows,
    related: related.slice(0, 8),
  };
}

module.exports = { fetchTeacherCards, getTeacherIdBySlug, getTeacherProfile, blendedRating, expBand, accreditationOf, todayIndex };
