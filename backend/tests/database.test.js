const { createDatabase } = require('../src/db/database');

describe('User Database', () => {
    let db;

    beforeEach(() => {
        db = createDatabase();
    });

    afterEach(() => {
        db.close();
    });

    test('saves a user and generates an ID', () => {
        const result = db.prepare(`
            INSERT INTO users (
                first_name, last_name, email, password_hash, role
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            'Demo',
            'Parent',
            'parent@example.test',
            'test-only-placeholder',
            'parent'
        );

        const user = db.prepare(
            'SELECT * FROM users WHERE id = ?'
        ).get(result.lastInsertRowid);

        expect(user.id).toBeGreaterThan(0);
        expect(user.email).toBe('parent@example.test');
        expect(user.role).toBe('parent');
        expect(user.created_at).toBeTruthy();
    });

test('rejects duplicate emails regardless of letter case', () => {
    const insertUser = db.prepare(`
        INSERT INTO users (
            first_name, last_name, email, password_hash, role
        )
        VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run(
        'Demo',
        'Parent',
        'parent@example.test',
        'test-only-placeholder',
        'parent'
    );

    expect(() => {
        insertUser.run(
            'Other',
            'Parent',
            'Parent@example.test',
            'test-only-placeholder',
            'parent'
        );
    }).toThrow();

    expect(
        db.prepare('SELECT COUNT(*) AS count FROM users').get().count
    ).toBe(1);
    });

    test('rejects an invalid role', () => {
        expect(() => {
            db.prepare(`
                INSERT INTO users (
                    first_name, last_name, email, password_hash, role
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(
                'Demo', 'User', 'user@example.test',
                'test-only-placeholder', 'admin'
            );
        }).toThrow();

        expect(
            db.prepare('SELECT COUNT(*) AS count FROM users').get().count
        ).toBe(0);
    });
    
});
