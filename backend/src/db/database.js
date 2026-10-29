const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

function createDatabase(filename = ':memory:') {
  const db = new Database(filename);

  try {
    db.pragma('foreign_keys = ON');

    const migrationsPath = path.join(__dirname, 'migrations', '001_create_users.sql');

    const sql = fs.readFileSync(migrationsPath, 'utf8');
    db.exec(sql);

    return db;
  } catch (error) {
    db.close();
    throw error;        
  }
}

module.exports = { createDatabase };