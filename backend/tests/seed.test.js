const bcrypt = require('bcryptjs');
const { createDatabase } = require('../src/db/database');
const { seedUser } = require('../src/db/seed');

describe('Demo account seed', () => {
    let db;

    beforeEach(() => {
        db = createDatabase();
    });

    afterEach(() => {
        db.close();
    });

    test('creates parent and specialist accounts with hashed passwords', () => {
        seedUser(db);

        const users = db.prepare(
            'SELECT email, role, password_hash FROM users ORDER BY id'
        ).all();

        expect(users).toHaveLength(2);
        expect(users.map(user => [user.email, user.role])).toEqual([
            ['parent@example.test', 'parent'],
            ['specialist@example.test', 'specialist']
        ]);

        for (const user of users) {
            expect(user.password_hash).not.toBe('Demo1234!');
            expect(
                bcrypt.compareSync('Demo1234!', user.password_hash)
            ).toBe(true);
        }
    });

    test('does not duplicate accounts or change passwords when run again', () => {
        seedUser(db);

        const before = db.prepare(
            'SELECT * FROM users ORDER BY id'
        ).all();

        seedUser(db);

        const after = db.prepare(
            'SELECT * FROM users ORDER BY id'
        ).all();

        expect(after).toEqual(before);
    });
});