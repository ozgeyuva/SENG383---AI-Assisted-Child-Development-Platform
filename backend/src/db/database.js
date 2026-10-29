const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

function createDatabase(filename = ':memory:') {
  const db = new Database(filename);

  try {
    db.pragma('foreign_keys = ON');

    const migrations = [
      '001_create_users.sql',
      '002_create_children.sql'
    ];

    db.transaction(() => {
      for (const migration of migrations) {
        const migrationPath = path.join(
          __dirname,
          'migrations',
          migration
        );

        const sql = fs.readFileSync(migrationPath, 'utf8');
        db.exec(sql);
      }
    })();

    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

module.exports = { createDatabase };