// Shared helpers for server-rendered pages: escaping, formatting and the one
// place that knows what every public URL looks like.
const SITE_NAME = 'YogSetu';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// JSON that is safe to embed inside <script type="application/ld+json">
function jsonForScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028|\u2029/g, '');
}

function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function money(n) {
  if (n == null || n === '') return '';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

// "Neha Rao" -> "Neha R."; leave "HR, TechCorp" style labels alone
function shortName(name) {
  const n = String(name || '').trim();
  if (!n) return 'Student';
  if (n.includes(',')) return n;
  const parts = n.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

function timeAgo(date, { prefix = '' } = {}) {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  let out;
  if (mins < 2) out = 'just now';
  else if (mins < 60) out = `${mins} minutes ago`;
  else if (hrs < 24) out = hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
  else if (days < 1) out = 'today';
  else if (days < 7) out = days === 1 ? '1 day ago' : `${days} days ago`;
  else if (days < 30) out = Math.round(days / 7) === 1 ? '1 week ago' : `${Math.round(days / 7)} weeks ago`;
  else if (days < 365) out = Math.round(days / 30) === 1 ? '1 month ago' : `${Math.round(days / 30)} months ago`;
  else out = `${Math.floor(days / 365)} yr ago`;
  return prefix ? `${prefix} ${out === 'just now' ? 'today' : out}` : out;
}

// "Posted today" / "Posted 2 days ago" (whole-day based, as on the job board)
function postedAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted 1 day ago';
  if (days < 7) return `Posted ${days} days ago`;
  const weeks = Math.round(days / 7);
  if (days < 30) return weeks === 1 ? 'Posted 1 week ago' : `Posted ${weeks} weeks ago`;
  const months = Math.round(days / 30);
  return months === 1 ? 'Posted 1 month ago' : `Posted ${months} months ago`;
}

const AVATAR_COLORS = ['#D97757', '#3A3935', '#8C887D', '#A65032', '#55534C'];
const avatarColor = (i) => AVATAR_COLORS[Math.abs(Number(i) || 0) % AVATAR_COLORS.length];

// ---------------------------------------------------------------- URL scheme
//   /yoga-teachers                              all teachers
//   /yoga-teachers/:city                        teachers in a city
//   /yoga-teachers/:city/:locality              teachers in a locality
//   /yoga-teachers/:city/:specialty             teachers by specialty
//   /yoga-teachers/:city/:teacher               one teacher
//   /yoga-jobs                                  all jobs
//   /yoga-jobs/:city                            jobs in a city
//   /yoga-jobs/:city/:locality                  jobs in a locality
//   /yoga-jobs/:city/:locality/:job             one job
//   /yoga-jobs/:city/:job                       one job with no locality
//   /yoga-jobs/online/:job                      one online job
const URLS = {
  teachers: () => '/yoga-teachers',
  teachersCity: (citySlug) => `/yoga-teachers/${citySlug}`,
  teachersLocality: (citySlug, localitySlug) => `/yoga-teachers/${citySlug}/${localitySlug}`,
  teachersStyle: (citySlug, styleSlug) => (citySlug
    ? `/yoga-teachers/${citySlug}/${styleSlug}`
    : `/yoga-teachers?specialization=${encodeURIComponent(styleSlug)}`),
  teacher: (t) => `/yoga-teachers/${t.citySlug || 'all'}/${t.slug}`,
  jobs: () => '/yoga-jobs',
  jobsCity: (citySlug) => `/yoga-jobs/${citySlug}`,
  jobsLocality: (citySlug, localitySlug) => `/yoga-jobs/${citySlug}/${localitySlug}`,
  jobsStyle: (citySlug, styleSlug) => (citySlug
    ? `/yoga-jobs/${citySlug}?specialization=${encodeURIComponent(styleSlug)}`
    : `/yoga-jobs?specialization=${encodeURIComponent(styleSlug)}`),
  job: (j) => {
    if (!j.citySlug) return `/yoga-jobs/online/${j.slug}`;
    if (!j.localitySlug) return `/yoga-jobs/${j.citySlug}/${j.slug}`;
    return `/yoga-jobs/${j.citySlug}/${j.localitySlug}/${j.slug}`;
  },
};

module.exports = {
  SITE_NAME, esc, jsonForScript, siteUrl, money, initials, shortName, timeAgo, postedAgo, avatarColor, URLS,
};
