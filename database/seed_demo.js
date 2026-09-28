// Demo data for the public Teachers / Job-board pages.
//   node database/seed_demo.js            -> (re)create the demo dataset
//   node database/seed_demo.js --purge    -> remove demo accounts + their data
//
// Demo accounts use the e-mail domain @demo.yogsetu.local (password: Demo@1234)
// so they can always be told apart from real users and removed cleanly.
// The existing test teacher (user 7, teacher@test.com) is *adopted* as the demo
// "Shikhar Mehrotra" so that login keeps working and the dashboard is populated.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const data = require('./demo/data');
const { slugify, uniqueSlug } = require('../lib/slug');
const { jobSlug } = require('../services/slugs');

const DEMO = '@demo.yogsetu.local';
const DAY = 24 * 3600 * 1000;
const now = Date.now();

// deterministic RNG so the dataset is identical every run
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (arr, rand) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const iso = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const bulk = (conn, sql, rows) => (rows.length ? conn.query(sql, [rows]) : Promise.resolve());

async function purge(conn) {
  const [demoUsers] = await conn.query('SELECT id FROM users WHERE email LIKE ?', [`%${DEMO}`]);
  if (demoUsers.length) await conn.query('DELETE FROM users WHERE email LIKE ?', [`%${DEMO}`]); // cascades
  return demoUsers.length;
}

async function main() {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (process.argv.includes('--purge')) {
      const n = await purge(conn);
      await conn.commit();
      console.log(`Removed ${n} demo accounts and everything attached to them.`);
      return;
    }

    // ------------------------------------------------------------ reference data
    const [[india]] = await conn.query("SELECT id FROM countries WHERE name = 'India'");
    for (const [, state] of data.states) {
      await conn.query('INSERT IGNORE INTO states (country_id, name) VALUES (?, ?)', [india.id, state]);
    }
    await conn.query("UPDATE cities SET name = 'Delhi', slug = 'delhi' WHERE name = 'New Delhi'");
    for (const [state, city] of data.cities) {
      const [[st]] = await conn.query('SELECT id FROM states WHERE name = ?', [state]);
      await conn.query('INSERT IGNORE INTO cities (state_id, name, slug) VALUES (?, ?, ?)', [st.id, city, slugify(city)]);
    }
    const [cityRows] = await conn.query('SELECT id, name FROM cities');
    const cityId = Object.fromEntries(cityRows.map((c) => [c.name, c.id]));

    for (const [city, list] of Object.entries(data.localities)) {
      for (const name of list) {
        await conn.query('INSERT IGNORE INTO localities (city_id, name, slug) VALUES (?, ?, ?)', [cityId[city], name, slugify(name)]);
      }
    }
    const [locRows] = await conn.query('SELECT id, city_id, name FROM localities');
    const locId = {};
    locRows.forEach((l) => { locId[`${l.city_id}|${l.name}`] = l.id; });

    for (const [name, slug, short, desc] of data.styles) {
      const [ex] = await conn.query('SELECT id FROM yoga_styles WHERE name = ?', [name]);
      if (ex.length) {
        await conn.query('UPDATE yoga_styles SET slug = ?, short_name = ?, description = ? WHERE id = ?', [slug, short, desc, ex[0].id]);
      } else {
        await conn.query('INSERT INTO yoga_styles (name, slug, short_name, description) VALUES (?, ?, ?, ?)', [name, slug, short, desc]);
      }
    }
    const [styleRows] = await conn.query('SELECT id, name FROM yoga_styles');
    const styleId = Object.fromEntries(styleRows.map((s) => [s.name, s.id]));
    const [certRows] = await conn.query('SELECT id, name FROM certification_types');
    const certId = Object.fromEntries(certRows.map((c) => [c.name, c.id]));
    if (!certId['Diploma in Yoga Science']) throw new Error('certification types missing — run database/seed.sql first');

    // ------------------------------------------------------------ clean slate
    const purged = await purge(conn);
    for (const spec of data.teachers.filter((t) => t.adoptUserId)) {
      // the adopted test teacher: drop its earlier test interactions and profile rows
      const uid = spec.adoptUserId;
      await conn.query('DELETE FROM connections WHERE teacher_user_id = ?', [uid]);
      await conn.query('DELETE FROM requirement_applications WHERE teacher_user_id = ?', [uid]);
      for (const t of ['teacher_expertise', 'teacher_certifications', 'teacher_pricing_packages', 'teacher_weekly_availability',
        'teacher_tags', 'teacher_formats', 'teacher_comments', 'teacher_questions', 'teacher_online_locations']) {
        await conn.query(`DELETE FROM ${t} WHERE teacher_user_id = ?`, [uid]);
      }
    }
    // leftover end-to-end test requirements stay in the DB but are taken off the public board
    await conn.query(
      `UPDATE requirements r JOIN users u ON u.id = r.client_user_id
          SET r.is_visible = 0
        WHERE u.email = 'client@test.com' OR u.email LIKE 'smoketest-%'`
    );

    const hash = await bcrypt.hash('Demo@1234', 10);

    // ------------------------------------------------------------ client pool
    const POOL = 172;
    const names = data.namedClients.slice();
    const seen = new Set(names);
    const rand0 = rng(7);
    while (names.length < POOL) {
      const n = `${data.firstNames[Math.floor(rand0() * data.firstNames.length)]} ${data.lastNames[Math.floor(rand0() * data.lastNames.length)]}`;
      if (!seen.has(n)) { seen.add(n); names.push(n); }
    }
    const requesters = [...new Set(data.requirements.map((r) => r.client))];
    const allClientNames = names.concat(requesters);
    await bulk(conn, 'INSERT INTO users (email, password_hash, role) VALUES ?',
      allClientNames.map((n, i) => [`demo-client-${i + 1}${DEMO}`, hash, 'client']));
    const [cu] = await conn.query('SELECT id, email FROM users WHERE email LIKE ? AND role = ?', [`demo-client-%${DEMO}`, 'client']);
    const uidByEmail = Object.fromEntries(cu.map((u) => [u.email, u.id]));
    const cityNames = Object.keys(cityId);
    const clientByName = {};
    const clientRows = allClientNames.map((n, i) => {
      const id = uidByEmail[`demo-client-${i + 1}${DEMO}`];
      clientByName[n] = id;
      return [id, n, cityId[cityNames[i % cityNames.length]]];
    });
    await bulk(conn, 'INSERT INTO clients (user_id, full_name, city_id) VALUES ?', clientRows);
    const pool = names.map((n) => clientByName[n]);
    const poolByName = Object.fromEntries(names.map((n) => [n, clientByName[n]]));

    // ------------------------------------------------------------ teachers
    const teacherId = {};
    for (let ti = 0; ti < data.teachers.length; ti += 1) {
      const t = data.teachers[ti];
      const rand = rng(1000 + ti);
      const cid = cityId[t.city];
      const lid = locId[`${cid}|${t.locality}`];
      let uid = t.adoptUserId;
      if (!uid) {
        const [r] = await conn.query('INSERT INTO users (email, phone, password_hash, role) VALUES (?, ?, ?, ?)',
          [`demo-${t.slug}${DEMO}`, `98${String(10000000 + ti * 1111111).slice(0, 8)}`, hash, 'teacher']);
        uid = r.insertId;
      }
      teacherId[t.key] = uid;

      const fields = [t.name, t.slug, t.gender, t.years, t.mode, t.qualifications, t.bio, t.photo, cid, lid, t.pincode,
        t.price, t.trial, 'verified', t.team, t.headline, t.tagline];
      const [exists] = await conn.query('SELECT user_id FROM teachers WHERE user_id = ?', [uid]);
      if (exists.length) {
        await conn.query(
          `UPDATE teachers SET full_name=?, slug=?, gender=?, years_experience=?, teaching_mode=?, qualifications=?, bio=?,
             profile_photo_url=?, city_id=?, locality_id=?, pincode=?, per_session_price=?, trial_price=?,
             verification_status=?, team_rating=?, headline=?, tagline=? WHERE user_id=?`, [...fields, uid]);
      } else {
        await conn.query(
          `INSERT INTO teachers (full_name, slug, gender, years_experience, teaching_mode, qualifications, bio,
             profile_photo_url, city_id, locality_id, pincode, per_session_price, trial_price,
             verification_status, team_rating, headline, tagline, user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [...fields, uid]);
      }

      await bulk(conn, 'INSERT IGNORE INTO teacher_expertise (teacher_user_id, style_id) VALUES ?', t.styles.map((s) => [uid, styleId[s]]));
      await bulk(conn, 'INSERT IGNORE INTO teacher_tags (teacher_user_id, kind, label, sort_order) VALUES ?', [
        ...t.focus.map((l, i) => [uid, 'focus', l, i]), ...t.languages.map((l, i) => [uid, 'language', l, i])]);
      await bulk(conn, 'INSERT INTO teacher_certifications (teacher_user_id, certification_type_id, certification_name_other, issuing_body, certificate_number, status, verified_at) VALUES ?',
        t.certs.map(([title, body, no, type], i) => [uid, certId[type] || certId.Other, title, body, no, 'verified', iso(now - (200 + i * 40) * DAY)]));
      await bulk(conn, 'INSERT INTO teacher_formats (teacher_user_id, kind, title, price, description, is_popular) VALUES ?',
        Object.entries(t.formats).map(([kind, f]) => [uid, kind, f[0], f[1], f[2], f[3] ? 1 : 0]));
      await bulk(conn, 'INSERT INTO teacher_pricing_packages (teacher_user_id, session_count, total_price) VALUES ?', t.packages.map(([n, p]) => [uid, n, p]));

      // ---- connections, then ratings
      const R = t.reviews;
      const extraApproved = 2 + Math.floor(rand() * 3);
      const A = R + extraApproved;
      const D = Math.max(1, Math.round(A * (1 / t.acceptance - 1)));
      const P = 2;
      const quoteId = poolByName[t.quote[1]];
      const textIds = t.texts.map((x) => poolByName[x[0]]);
      const specific = new Set([quoteId, ...textIds]);
      const others = shuffle(pool.filter((id) => !specific.has(id)), rand);
      const order = [...new Set([quoteId, ...textIds, ...others])].slice(0, A + D + P);
      const approved = order.slice(0, A);
      const declined = order.slice(A, A + D);
      const pending = order.slice(A + D);

      // which approved connections happened in the last 30 days ("students this month")
      const recentSet = new Set([0]);
      const recentPool = shuffle(approved.map((_, i) => i).filter((i) => i > t.texts.length), rand);
      for (let i = 0; recentSet.size < t.monthly && i < recentPool.length; i += 1) recentSet.add(recentPool[i]);

      const connRows = [];
      approved.forEach((cl, i) => {
        const recent = recentSet.has(i);
        const decidedAgo = recent ? (i === 0 ? 3.5 : 1 + rand() * 26) : 35 + rand() * 360;
        const decided = now - decidedAgo * DAY;
        const requested = decided - t.responseHours * (0.5 + rand()) * 3600 * 1000;
        connRows.push([cl, uid, 'direct_browse', 'approved', iso(requested), iso(decided), iso(decided)]);
      });
      declined.forEach((cl) => {
        const requested = now - (20 + rand() * 300) * DAY;
        connRows.push([cl, uid, 'direct_browse', 'declined', iso(requested), iso(requested + t.responseHours * 3600 * 1000), null]);
      });
      pending.forEach((cl) => connRows.push([cl, uid, 'direct_browse', 'pending', iso(now - (0.3 + rand() * 2) * DAY), null, null]));
      await bulk(conn, 'INSERT INTO connections (client_user_id, teacher_user_id, origin, status, requested_at, decided_at, whatsapp_shared_at) VALUES ?', connRows);
      const [connIds] = await conn.query('SELECT id, client_user_id, decided_at FROM connections WHERE teacher_user_id = ? AND status = ?', [uid, 'approved']);
      const connByClient = Object.fromEntries(connIds.map((c) => [c.client_user_id, c]));

      // star counts (largest remainder) minus the hand-written reviews
      const raw = t.dist.map((p) => (p / 100) * R);
      const counts = raw.map(Math.floor);
      let left = R - counts.reduce((a, b) => a + b, 0);
      raw.map((v, i) => [v - counts[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { counts[i] += 1; left -= 1; } });
      const specificStars = [[quoteId, 5], ...t.texts.map((x) => [poolByName[x[0]], x[1]])];
      specificStars.forEach(([, s]) => { const idx = 5 - s; if (counts[idx] > 0) counts[idx] -= 1; });
      const stars = shuffle(counts.flatMap((n, i) => Array(n).fill(5 - i)), rand);

      const ratingRows = [];
      let si = 0;
      approved.slice(0, R).forEach((cl, i) => {
        const c = connByClient[cl];
        const decided = new Date(c.decided_at).getTime();
        let text = null; let star; let created;
        if (cl === quoteId) { text = t.quote[0]; star = 5; created = now - 2 * DAY; }
        else {
          const spec = t.texts.find((x) => poolByName[x[0]] === cl);
          if (spec) { text = spec[2]; star = spec[1]; created = Math.min(decided + 2 * DAY, now - 6 * DAY); }
          else { star = stars[si]; si += 1; created = Math.min(decided + (1 + rand() * 12) * DAY, now - 5 * DAY); }
        }
        ratingRows.push([c.id, uid, cl, star, text, 'published', iso(Math.max(created, decided))]);
      });
      await bulk(conn, 'INSERT INTO ratings (connection_id, teacher_user_id, client_user_id, stars, review_text, status, created_at) VALUES ?', ratingRows);

      // ---- weekly availability (booked slots point at real approved connections)
      const slotTimes = ['7:00 AM', '6:00 PM'];
      const booked = connIds.slice(0, 6).map((c) => c.id);
      let b = 0;
      const availRows = [];
      t.avail.forEach((day, d) => day.forEach((state, s) => {
        if (state === '-') return;
        availRows.push([uid, d + 1, slotTimes[s], 1, state === 'T' ? booked[b++ % booked.length] : null]);
      }));
      await bulk(conn, 'INSERT INTO teacher_weekly_availability (teacher_user_id, day_of_week, time_slot, is_available, booked_connection_id) VALUES ?', availRows);

      // ---- public comments and Q&A
      await bulk(conn, 'INSERT INTO teacher_comments (teacher_user_id, author_name, body, status, created_at) VALUES ?',
        t.comments.map(([name, body, hoursAgo]) => [uid, name, body, 'published', iso(now - hoursAgo * 3600 * 1000)]));
      const askers = shuffle(pool, rand);
      await bulk(conn, 'INSERT INTO teacher_questions (teacher_user_id, asker_user_id, question, answer, status, asked_at, answered_at) VALUES ?',
        t.qa.map(([q, a], i) => [uid, askers[i], q, a, 'published', iso(now - (20 + i * 9) * DAY), iso(now - (19 + i * 9) * DAY)]));
    }

    // ------------------------------------------------------------ requirements
    for (let ri = 0; ri < data.requirements.length; ri += 1) {
      const r = data.requirements[ri];
      const rand = rng(5000 + ri);
      const cid = r.city ? cityId[r.city] : null;
      const lid = r.locality ? locId[`${cid}|${r.locality}`] : null;
      const slug = await jobSlug(conn, r.title, cid, lid);
      const createdAt = iso(now - r.posted * DAY - Math.floor(rand() * 6) * 3600 * 1000);
      const cols = ['client_user_id', 'title', 'slug', 'style_id', 'purpose', 'preferred_gender', 'mode', 'city_id', 'locality_id', 'area',
        'budget_min', 'budget_max', 'budget_note', 'description', 'schedule_text', 'experience_level', 'status', 'is_visible', 'source', 'created_at'];
      const purposeByStyle = { 'Prenatal Yoga': 'prenatal', 'Therapeutic Yoga': 'therapeutic', 'Corporate Wellness': 'corporate_wellness' };
      const vals = [clientByName[r.client], r.title, slug, styleId[r.style], purposeByStyle[r.style] || 'personal_practice', 'no_preference',
        r.mode, cid, lid, r.locality, r.budget ? r.budget[0] : null, r.budget ? r.budget[1] : null, r.budgetNote || null,
        r.description, r.schedule, r.level, r.status, 1, 'platform', createdAt];
      if (r.id) { cols.unshift('id'); vals.unshift(r.id); }
      const [ins] = await conn.query(`INSERT INTO requirements (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
      const rid = r.id || ins.insertId;
      await bulk(conn, 'INSERT INTO requirement_needs (requirement_id, item_text, sort_order) VALUES ?', r.needs.map((n, i) => [rid, n, i]));
      await bulk(conn, 'INSERT INTO requirement_schedule (requirement_id, day_of_week, time_slot) VALUES ?', r.days.map(([d, t]) => [rid, d, t]));
      await bulk(conn, 'INSERT IGNORE INTO requirement_availability_slots (requirement_id, slot_label) VALUES ?', r.slots.map((s) => [rid, s]));

      const postedMs = now - r.posted * DAY;
      for (let ai = 0; ai < r.applicants.length; ai += 1) {
        const [key, status] = r.applicants[ai];
        const applied = postedMs + (2 + ai * 5 + rand() * 5) * 3600 * 1000;
        const decided = status === 'pending' ? null : Math.min(now, applied + (10 + rand() * 20) * 3600 * 1000);
        const [a] = await conn.query('INSERT INTO requirement_applications (requirement_id, teacher_user_id, status, applied_at, decided_at) VALUES (?,?,?,?,?)',
          [rid, teacherId[key], status, iso(Math.min(applied, now)), decided ? iso(decided) : null]);
        if (status === 'approved') {
          await conn.query(`INSERT IGNORE INTO connections (client_user_id, teacher_user_id, origin, source_application_id, status, requested_at, decided_at, whatsapp_shared_at)
                            VALUES (?,?,?,?,?,?,?,?)`, [clientByName[r.client], teacherId[key], 'requirement_application', a.insertId, 'approved', iso(Math.min(applied, now)), iso(decided), iso(decided)]);
        }
      }
    }

    await conn.commit();
    const [[t1]] = await conn.query("SELECT COUNT(*) n FROM teachers WHERE verification_status = 'verified'");
    const [[r1]] = await conn.query('SELECT COUNT(*) n FROM requirements WHERE is_visible = 1');
    const [[rt]] = await conn.query('SELECT COUNT(*) n FROM ratings');
    console.log(`Demo data ready (replaced ${purged} earlier demo accounts): ${t1.n} verified teachers, ${r1.n} visible requirements, ${rt.n} ratings.`);
    console.log('Demo logins use password  Demo@1234  (teachers: demo-<slug>@demo.yogsetu.local; adopted test teacher: teacher@test.com).');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await db.end();
  }
}

main().catch((err) => { console.error('Seeding failed:', err); process.exit(1); });
