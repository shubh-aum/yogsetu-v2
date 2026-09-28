// SEO-friendly URLs + the data the public teacher / job pages need to be
// rendered entirely from the database (comments, Q&A, session formats,
// schedules, checklists ...). Safe to run on a database that already has rows.
const { slugify, uniqueSlug } = require('../../lib/slug');

exports.id = '001_seo_profiles';

exports.up = async function up(conn, h) {
  // ---------------------------------------------------------------- geography
  await h.addColumn(conn, 'cities', 'slug', 'VARCHAR(120) NULL AFTER name');
  const [cities] = await conn.query('SELECT id, name FROM cities WHERE slug IS NULL ORDER BY id');
  const [usedCities] = await conn.query('SELECT slug FROM cities WHERE slug IS NOT NULL');
  const takenCities = new Set(usedCities.map((r) => r.slug));
  for (const c of cities) {
    const slug = uniqueSlug(c.name, takenCities);
    takenCities.add(slug);
    await conn.query('UPDATE cities SET slug = ? WHERE id = ?', [slug, c.id]);
  }
  await conn.query('ALTER TABLE cities MODIFY slug VARCHAR(120) NOT NULL');
  if (!(await h.hasIndex(conn, 'cities', 'uq_cities_slug'))) {
    await conn.query('ALTER TABLE cities ADD UNIQUE KEY uq_cities_slug (slug)');
  }

  await conn.query(`CREATE TABLE IF NOT EXISTS localities (
    id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    city_id  BIGINT UNSIGNED NOT NULL,
    name     VARCHAR(100) NOT NULL,
    slug     VARCHAR(120) NOT NULL,
    UNIQUE KEY uq_localities_city_slug (city_id, slug),
    UNIQUE KEY uq_localities_city_name (city_id, name),
    CONSTRAINT fk_localities_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  // ------------------------------------------------------------- yoga styles
  await h.addColumn(conn, 'yoga_styles', 'slug', 'VARCHAR(120) NULL AFTER name');
  await h.addColumn(conn, 'yoga_styles', 'short_name', 'VARCHAR(50) NULL AFTER slug');
  await h.addColumn(conn, 'yoga_styles', 'description', 'VARCHAR(500) NULL AFTER short_name');
  const [styles] = await conn.query('SELECT id, name FROM yoga_styles WHERE slug IS NULL ORDER BY id');
  const [usedStyles] = await conn.query('SELECT slug FROM yoga_styles WHERE slug IS NOT NULL');
  const takenStyles = new Set(usedStyles.map((r) => r.slug));
  for (const s of styles) {
    const slug = uniqueSlug(s.name, takenStyles);
    takenStyles.add(slug);
    await conn.query('UPDATE yoga_styles SET slug = ? WHERE id = ?', [slug, s.id]);
  }
  await conn.query('ALTER TABLE yoga_styles MODIFY slug VARCHAR(120) NOT NULL');
  if (!(await h.hasIndex(conn, 'yoga_styles', 'uq_yoga_styles_slug'))) {
    await conn.query('ALTER TABLE yoga_styles ADD UNIQUE KEY uq_yoga_styles_slug (slug)');
  }

  // ---------------------------------------------------------------- teachers
  await h.addColumn(conn, 'teachers', 'slug', 'VARCHAR(140) NULL');
  await h.addColumn(conn, 'teachers', 'locality_id', 'BIGINT UNSIGNED NULL');
  await h.addColumn(conn, 'teachers', 'headline', 'VARCHAR(160) NULL COMMENT \'Short specialty line, e.g. "Hatha & Ashtanga"\'');
  await h.addColumn(conn, 'teachers', 'tagline', 'VARCHAR(500) NULL COMMENT \'One-paragraph summary shown in the profile hero\'');
  const [teachers] = await conn.query('SELECT user_id, full_name FROM teachers WHERE slug IS NULL ORDER BY user_id');
  const [usedTeachers] = await conn.query('SELECT slug FROM teachers WHERE slug IS NOT NULL');
  const takenTeachers = new Set(usedTeachers.map((r) => r.slug));
  for (const t of teachers) {
    const slug = uniqueSlug(t.full_name || `teacher-${t.user_id}`, (s) => takenTeachers.has(s) || takenStyles.has(s));
    takenTeachers.add(slug);
    await conn.query('UPDATE teachers SET slug = ? WHERE user_id = ?', [slug, t.user_id]);
  }
  await conn.query('ALTER TABLE teachers MODIFY slug VARCHAR(140) NOT NULL');
  if (!(await h.hasIndex(conn, 'teachers', 'uq_teachers_slug'))) {
    await conn.query('ALTER TABLE teachers ADD UNIQUE KEY uq_teachers_slug (slug)');
  }
  const [fk] = await conn.query(
    `SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE() AND table_name = 'teachers' AND constraint_name = 'fk_teachers_locality'`
  );
  if (!fk.length) {
    await conn.query(
      'ALTER TABLE teachers ADD CONSTRAINT fk_teachers_locality FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE SET NULL'
    );
  }

  await h.addColumn(conn, 'teacher_certifications', 'certificate_number', 'VARCHAR(60) NULL');

  await conn.query(`CREATE TABLE IF NOT EXISTS teacher_tags (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_user_id BIGINT UNSIGNED NOT NULL,
    kind            ENUM('focus','language') NOT NULL DEFAULT 'focus',
    label           VARCHAR(60) NOT NULL,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_ttag (teacher_user_id, kind, label),
    CONSTRAINT fk_ttag_teacher FOREIGN KEY (teacher_user_id) REFERENCES teachers(user_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await conn.query(`CREATE TABLE IF NOT EXISTS teacher_formats (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_user_id BIGINT UNSIGNED NOT NULL,
    kind            ENUM('online','offline') NOT NULL,
    title           VARCHAR(100) NOT NULL DEFAULT 'Private session',
    price           DECIMAL(10,2) NOT NULL,
    description     VARCHAR(400) NULL,
    is_popular      TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_tformat_teacher FOREIGN KEY (teacher_user_id) REFERENCES teachers(user_id) ON DELETE CASCADE,
    UNIQUE KEY uq_tformat (teacher_user_id, kind)
  ) ENGINE=InnoDB`);

  await conn.query(`CREATE TABLE IF NOT EXISTS teacher_comments (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_user_id BIGINT UNSIGNED NOT NULL,
    author_name     VARCHAR(60) NOT NULL,
    author_user_id  BIGINT UNSIGNED NULL,
    body            VARCHAR(500) NOT NULL,
    status          ENUM('published','hidden') NOT NULL DEFAULT 'published',
    ip_hash         CHAR(40) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_tcomment_teacher (teacher_user_id, status, created_at),
    CONSTRAINT fk_tcomment_teacher FOREIGN KEY (teacher_user_id) REFERENCES teachers(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_tcomment_user    FOREIGN KEY (author_user_id)  REFERENCES users(id)          ON DELETE SET NULL
  ) ENGINE=InnoDB`);

  await conn.query(`CREATE TABLE IF NOT EXISTS teacher_questions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_user_id BIGINT UNSIGNED NOT NULL,
    asker_user_id   BIGINT UNSIGNED NULL,
    question        VARCHAR(500) NOT NULL,
    answer          TEXT NULL,
    status          ENUM('pending','published','hidden') NOT NULL DEFAULT 'pending' COMMENT 'Public only once answered (published)',
    asked_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answered_at     TIMESTAMP NULL,
    KEY ix_tq_teacher (teacher_user_id, status, asked_at),
    CONSTRAINT fk_tq_teacher FOREIGN KEY (teacher_user_id) REFERENCES teachers(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_tq_asker   FOREIGN KEY (asker_user_id)   REFERENCES users(id)          ON DELETE SET NULL
  ) ENGINE=InnoDB`);

  // ------------------------------------------------------------ requirements
  await h.addColumn(conn, 'requirements', 'slug', 'VARCHAR(140) NULL');
  await h.addColumn(conn, 'requirements', 'locality_id', 'BIGINT UNSIGNED NULL');
  await h.addColumn(conn, 'requirements', 'schedule_text', 'VARCHAR(200) NULL COMMENT \'Human summary, e.g. "Mornings, 3x per week"\'');
  await h.addColumn(conn, 'requirements', 'experience_level', "ENUM('any','beginner','intermediate','advanced') NOT NULL DEFAULT 'any'");
  await h.addColumn(conn, 'requirements', 'budget_note', 'VARCHAR(120) NULL COMMENT \'Shown instead of a range, e.g. "Package pricing preferred"\'');
  if (!(await h.hasIndex(conn, 'requirements', 'ix_req_slug'))) {
    await conn.query('ALTER TABLE requirements ADD KEY ix_req_slug (slug)');
  }
  const [fk2] = await conn.query(
    `SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = DATABASE() AND table_name = 'requirements' AND constraint_name = 'fk_req_locality'`
  );
  if (!fk2.length) {
    await conn.query(
      'ALTER TABLE requirements ADD CONSTRAINT fk_req_locality FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE SET NULL'
    );
  }

  await conn.query(`CREATE TABLE IF NOT EXISTS requirement_needs (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requirement_id BIGINT UNSIGNED NOT NULL,
    item_text      VARCHAR(255) NOT NULL,
    sort_order     SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_reqneed_req FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await conn.query(`CREATE TABLE IF NOT EXISTS requirement_schedule (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requirement_id BIGINT UNSIGNED NOT NULL,
    day_of_week    TINYINT UNSIGNED NOT NULL COMMENT '1=Mon ... 7=Sun',
    time_slot      VARCHAR(20) NOT NULL COMMENT 'HH:MM, 24h',
    UNIQUE KEY uq_reqsched (requirement_id, day_of_week),
    CONSTRAINT fk_reqsched_req FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  // Backfill job slugs for rows that already exist.
  const [reqs] = await conn.query('SELECT id, title, city_id, locality_id FROM requirements WHERE slug IS NULL ORDER BY id');
  const taken = new Map(); // "city|locality" -> Set(slug)
  for (const r of reqs) {
    const key = `${r.city_id || 0}|${r.locality_id || 0}`;
    if (!taken.has(key)) taken.set(key, new Set());
    const set = taken.get(key);
    let base = slugify(r.title, 60) || 'yoga-teacher-required';
    const slug = uniqueSlug(base, (s) => set.has(s) || takenStyles.has(s));
    set.add(slug);
    await conn.query('UPDATE requirements SET slug = ? WHERE id = ?', [slug, r.id]);
  }
  await conn.query('ALTER TABLE requirements MODIFY slug VARCHAR(140) NOT NULL');
};
