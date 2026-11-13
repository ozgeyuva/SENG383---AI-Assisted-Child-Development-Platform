const { createDatabase } = require('../src/db/database');
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