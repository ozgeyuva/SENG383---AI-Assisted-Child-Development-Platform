const { createDatabase } = require('../src/db/database');
const { removeChildSpecialistLink } = require('../src/db/childSpecialistLinks');
const {
    seedUser,
    seedChildren,
    seedChildSpecialistLinks
} = require('../src/db/seed');

test('seeds one demo link and rejects a duplicate child-specialist pair', () => {
    const db = createDatabase();

    try {
        seedUser(db);
        seedChildren(db);
        seedChildSpecialistLinks(db);
        seedChildSpecialistLinks(db);

        const links = db.prepare('SELECT * FROM child_specialist_links').all();
        const child = db.prepare("SELECT id FROM children WHERE first_name = 'Deniz'").get();
        const specialist = db.prepare('SELECT id FROM users WHERE email = ?')
            .get('specialist@example.test');

        expect(links).toEqual([{
            child_id: child.id,
            specialist_id: specialist.id,
            specialist_type: 'Teacher'
        }]);

        expect(() => {
            db.prepare(`
                INSERT INTO child_specialist_links (
                    child_id, specialist_id, specialist_type
                )
                VALUES (?, ?, ?)
            `).run(child.id, specialist.id, 'Teacher');
        }).toThrow(/UNIQUE constraint failed/);
    } finally {
        db.close();
    }
});
test('removes only the selected child-specialist link', () => {
  const db = createDatabase();

  try {
    seedUser(db);
    seedChildren(db);

    const child = db.prepare('SELECT id FROM children').get();
    const specialist = db.prepare('SELECT id FROM users WHERE email = ?')
      .get('specialist@example.test');
    const otherSpecialist = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Other', 'Specialist', 'other-specialist@example.test', 'test-only', 'specialist')
    `).run();

    const insertLink = db.prepare(`
      INSERT INTO child_specialist_links (child_id, specialist_id, specialist_type)
      VALUES (?, ?, 'Teacher')
    `);
    insertLink.run(child.id, specialist.id);
    insertLink.run(child.id, otherSpecialist.lastInsertRowid);

    expect(removeChildSpecialistLink(db, child.id, specialist.id)).toBe(true);
    expect(removeChildSpecialistLink(db, child.id, specialist.id)).toBe(false);
    expect(db.prepare(`
      SELECT specialist_id FROM child_specialist_links WHERE child_id = ?
    `).all(child.id)).toEqual([
      { specialist_id: Number(otherSpecialist.lastInsertRowid) }
    ]);
  } finally {
    db.close();
  }
});