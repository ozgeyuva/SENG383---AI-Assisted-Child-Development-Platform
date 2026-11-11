
const { createDatabase } = require('../src/db/database');
const { seedUser, seedChildren } = require('../src/db/seed');
//const { linkChildAccount } = require('../src/db/childAccounts');


const {
    linkChildAccount,
    findChildIdForUser,
} = require('../src/db/childAccounts');

describe('Child account links', () => {
    let db;
    let childId;

    beforeEach(() => {
        db = createDatabase();
        seedUser(db);
        seedChildren(db);

        childId = db.prepare(
            'SELECT id FROM children WHERE first_name = ?'
        ).get('Deniz').id;
    });

    afterEach(() => {
        db.close();
    });

    test('links a child account to a child profile', () => {
        const { lastInsertRowid: userId } = db.prepare(`
            INSERT INTO users (
                first_name, last_name, email, password_hash, role
            )
            VALUES (?, ?, ?, ?, ?)
        `).run('Deniz', 'Demo', 'child-fixture@example.test', 'unused', 'child');

        expect(findChildIdForUser(db, userId)).toBeNull();
        linkChildAccount(db, childId, userId);
        expect(findChildIdForUser(db, userId)).toBe(childId);

        const link = db.prepare(
            'SELECT user_id FROM child_accounts WHERE child_id = ?'
        ).get(childId);

        expect(link.user_id).toBe(userId);
    });

    test('rejects a parent account and leaves the profile unlinked', () => {
        const parent = db.prepare(
            'SELECT id FROM users WHERE email = ?'
        ).get('parent@example.test');

        expect(() => linkChildAccount(db, childId, parent.id))
            .toThrow('A child account is required.');

        const link = db.prepare(
            'SELECT user_id FROM child_accounts WHERE child_id = ?'
        ).get(childId);

        expect(link).toBeUndefined();
    });
});