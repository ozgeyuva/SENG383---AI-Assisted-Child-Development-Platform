const { createDatabase } = require('../src/db/database');
const { seedUser } = require('../src/db/seed');

describe('Child profiles database', () => {
  let db;
  let parentId;

  beforeEach(() => {
    db = createDatabase();
    seedUser(db);

    const parent = db.prepare(
      "SELECT id FROM users WHERE role = 'parent'"
    ).get();

    parentId = parent.id;
  });

  afterEach(() => {
    db.close();
  });

  test('stores a child linked to an existing parent', () => {
    const result = db.prepare(`
      INSERT INTO children (
        parent_id, first_name, last_name, date_of_birth, grade
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(parentId, 'Deniz', 'Yilmaz', '2017-05-10', '4');

    const child = db.prepare(
      'SELECT * FROM children WHERE id = ?'
    ).get(result.lastInsertRowid);

    expect(child.parent_id).toBe(parentId);
    expect(child.first_name).toBe('Deniz');
    expect(child.grade).toBe('4');
  });

  test('rejects a child linked to a nonexistent user', () => {
    const insert = db.prepare(`
      INSERT INTO children (
        parent_id, first_name, last_name, date_of_birth, grade
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    expect(() => {
      insert.run(-1, 'Deniz', 'Yilmaz', '2017-05-10', '4');
    }).toThrow(/FOREIGN KEY constraint failed/);

    const result = db.prepare(
      'SELECT COUNT(*) AS total FROM children'
    ).get();

    expect(result.total).toBe(0);
  });
});