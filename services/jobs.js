// Everything the public job-board pages read from the database.
const db = require('../config/db');
const { money, postedAgo, URLS } = require('../lib/site');

const LEVEL_LABEL = { beginner: 'Beginners', intermediate: 'Intermediate', advanced: 'Advanced' };
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function budgetText(r) {
  const min = r.budget_min == null ? null : Number(r.budget_min);
  const max = r.budget_max == null ? null : Number(r.budget_max);
  if (min != null && max != null) return `${money(min)} – ${Number(max).toLocaleString('en-IN')} / session`;
  if (min != null) return `From ${money(min)} / session`;
  if (max != null) return `Up to ${money(max)} / session`;
  return r.budget_note || 'Budget on request';
}

// short form for the "₹600–900 per session" badge
function budgetShort(r) {
  const min = r.budget_min == null ? null : Number(r.budget_min);
  const max = r.budget_max == null ? null : Number(r.budget_max);
  if (min != null && max != null) return { main: `${money(min)}–${Number(max).toLocaleString('en-IN')}`, unit: 'per session' };
  if (min != null) return { main: `From ${money(min)}`, unit: 'per session' };
  if (max != null) return { main: `Up to ${money(max)}`, unit: 'per session' };
  return { main: r.budget_note || 'On request', unit: '' };
}

function placeText(r) {
  const place = [r.localityName || r.area, r.cityName].filter(Boolean).join(', ');
  if (r.mode === 'online') return 'Online';
  const suffix = r.mode === 'offline' ? '(in-studio / on-site)' : '(in-studio or online)';
  return place ? `${place} ${suffix}` : 'Location flexible';
}

function shape(r) {
  const job = {
    id: r.id, slug: r.slug, title: r.title, mode: r.mode, status: r.status, description: r.description || '',
    schedule: r.schedule_text || '', level: r.level, createdAt: r.created_at,
    cityName: r.cityName, citySlug: r.citySlug, localityName: r.localityName, localitySlug: r.localitySlug, area: r.area,
    styleId: r.styleId, styleName: r.styleName, styleSlug: r.styleSlug, styleShort: r.styleShort || r.styleName,
    budgetMin: r.budget_min == null ? null : Number(r.budget_min),
    budgetMax: r.budget_max == null ? null : Number(r.budget_max),
    budgetText: budgetText(r), budgetShort: budgetShort(r),
    applicants: Number(r.applicants) || 0,
    clientUserId: r.client_user_id,
    placeText: placeText(r),
    dataCity: r.cityName || (r.mode === 'online' ? 'Online' : ''),
    tags: [r.styleShort || r.styleName, LEVEL_LABEL[r.level]].filter(Boolean),
    postedText: postedAgo(r.created_at),
    postedDays: Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)),
  };
  job.url = URLS.job(job);
  return job;
}

const SELECT = `SELECT r.id, r.slug, r.title, r.mode, r.status, r.description, r.schedule_text, r.experience_level AS level, r.created_at, r.area,
        r.budget_min, r.budget_max, r.budget_note, r.client_user_id,
        c.name AS cityName, c.slug AS citySlug, l.name AS localityName, l.slug AS localitySlug,
        ys.id AS styleId, ys.name AS styleName, ys.slug AS styleSlug, ys.short_name AS styleShort,
        (SELECT COUNT(*) FROM requirement_applications ra WHERE ra.requirement_id = r.id) AS applicants
   FROM requirements r
   LEFT JOIN cities c ON c.id = r.city_id
   LEFT JOIN localities l ON l.id = r.locality_id
   LEFT JOIN yoga_styles ys ON ys.id = r.style_id`;

// filters: { cityId, localityId, styleId, online, statuses, excludeId, limit }
async function fetchJobCards(filters = {}) {
  const where = ['r.is_visible = 1'];
  const params = [];
  if (filters.cityId) { where.push('r.city_id = ?'); params.push(filters.cityId); }
  if (filters.localityId) { where.push('r.locality_id = ?'); params.push(filters.localityId); }
  if (filters.styleId) { where.push('r.style_id = ?'); params.push(filters.styleId); }
  if (filters.online) where.push("(r.mode = 'online' OR r.city_id IS NULL)");
  if (filters.statuses) { where.push('r.status IN (?)'); params.push(filters.statuses); }
  if (filters.excludeId) { where.push('r.id <> ?'); params.push(filters.excludeId); }
  const [rows] = await db.query(
    `${SELECT} WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC LIMIT ${Math.min(Number(filters.limit) || 200, 500)}`, params);
  return rows.map(shape);
}

// resolves a job from its URL parts
async function findJob({ cityId, localityId, slug, online }) {
  const where = ['r.slug = ?', 'r.is_visible = 1'];
  const params = [slug];
  if (online) where.push('r.city_id IS NULL');
  else {
    where.push('r.city_id = ?'); params.push(cityId);
    if (localityId) { where.push('r.locality_id = ?'); params.push(localityId); } else where.push('r.locality_id IS NULL');
  }
  const [rows] = await db.query(`${SELECT} WHERE ${where.join(' AND ')} LIMIT 1`, params);
  return rows[0] ? shape(rows[0]) : null;
}

async function findJobById(id) {
  const [rows] = await db.query(`${SELECT} WHERE r.id = ? AND r.is_visible = 1 LIMIT 1`, [id]);
  return rows[0] ? shape(rows[0]) : null;
}

async function getJobDetail(job) {
  const [needs] = await db.query('SELECT item_text AS text FROM requirement_needs WHERE requirement_id = ? ORDER BY sort_order, id', [job.id]);
  const [sched] = await db.query('SELECT day_of_week AS day, time_slot AS time FROM requirement_schedule WHERE requirement_id = ?', [job.id]);
  const [[client]] = await db.query(
    `SELECT COUNT(*) AS total, SUM(ra.status IN ('approved','rejected')) AS decided,
            AVG(CASE WHEN ra.decided_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ra.applied_at, ra.decided_at) END) AS avgMinutes
       FROM requirement_applications ra JOIN requirements r ON r.id = ra.requirement_id
      WHERE r.client_user_id = ?`, [job.clientUserId]);
  // similar: same specialty first, then same city, then anything open
  let similar = job.styleId ? await fetchJobCards({ styleId: job.styleId, excludeId: job.id, statuses: ['open'], limit: 6 }) : [];
  if (similar.length < 4) {
    const more = await fetchJobCards({ excludeId: job.id, statuses: ['open'], limit: 12 });
    const seen = new Set(similar.map((s) => s.id));
    more.filter((m) => !seen.has(m.id)).forEach((m) => { if (similar.length < 6) similar.push(m); });
  }
  const total = Number(client.total) || 0;
  const decided = Number(client.decided) || 0;
  return {
    ...job,
    needs: needs.map((n) => n.text),
    scheduleDays: DAY_LABELS.map((label, i) => {
      const s = sched.find((x) => x.day === i + 1);
      return { label, time: s ? s.time : null };
    }),
    hasSchedule: sched.length > 0,
    clientStats: {
      replyRate: total ? Math.round((decided / total) * 100) : null,
      responseHours: client.avgMinutes == null ? null : Math.max(1, Math.round(Number(client.avgMinutes) / 60)),
    },
    similar,
  };
}

module.exports = { fetchJobCards, findJob, findJobById, getJobDetail, LEVEL_LABEL };
