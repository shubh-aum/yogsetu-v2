// Minimal migration runner:  node database/migrate.js
// Applies every file in database/migrations/ (sorted by name) that has not run
// yet, recording each in schema_migrations. Migrations export { id, up(conn, helpers) }
// and must be safe to run against a database that already has data.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const helpers = {
  async hasColumn(conn, table, column) {
    const [rows] = await conn.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column]
    );
    return rows.length > 0;
  },
  async hasTable(conn, table) {
    const [rows] = await conn.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [table]
    );
    return rows.length > 0;
  },
  async hasIndex(conn, table, index) {
    const [rows] = await conn.query(
      `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [table, index]
    );
    return rows.length > 0;
  },
  async addColumn(conn, table, column, definition) {
    if (!(await helpers.hasColumn(conn, table, column))) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      return true;
    }
    return false;
  },
};

async function main() {
  const conn = await db.getConnection();
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
    const [done] = await conn.query('SELECT id FROM schema_migrations');
    const applied = new Set(done.map((r) => r.id));

    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
    let ran = 0;
    for (const file of files) {
      const migration = require(path.join(dir, file));
      if (applied.has(migration.id)) continue;
      console.log(`→ applying ${migration.id}`);
      await migration.up(conn, helpers);
      await conn.query('INSERT INTO schema_migrations (id) VALUES (?)', [migration.id]);
      ran += 1;
    }
    console.log(ran ? `Done — ${ran} migration(s) applied.` : 'Database is up to date.');
  } finally {
    conn.release();
    await db.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
