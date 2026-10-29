const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');

describe('POST /api/auth/register', () => {
    let db;
    let app;

    beforeEach(() => {
        db = createDatabase();
        app = createApp(db);
    });

    afterEach(() => {
        db.close();
    });

    test.each(['parent', 'specialist'])(
        'registers a %s and stores a hashed password',
        async (role) => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    first_name: 'Demo',
                    last_name: 'User',
                    email: 'demo@example.test',
                    password: 'Demo1234!',
                    role
                });

            expect(response.status).toBe(201);
            expect(response.body.user).toEqual({
                id: expect.any(Number),
                first_name: 'Demo',
                last_name: 'User',
                email: 'demo@example.test',
                role
            });

            const user = db.prepare(
                'SELECT * FROM users WHERE id = ?'
            ).get(response.body.user.id);

            expect(user.password_hash).not.toBe('Demo1234!');
            expect(
                bcrypt.compareSync('Demo1234!', user.password_hash)
            ).toBe(true);
        }
    );

    test('rejects a duplicate email regardless of letter case', async () => {
        const data = {
            first_name: 'Demo',
            last_name: 'User',
            email: 'demo@example.test',
            password: 'Demo1234!',
            role: 'parent'
        };

        const first = await request(app)
            .post('/api/auth/register')
            .send(data);

        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/auth/register')
            .send({ ...data, email: 'DEMO@example.test' });

        expect(second.status).toBe(409);
        expect(
            db.prepare('SELECT COUNT(*) AS count FROM users').get().count
        ).toBe(1);
    });

    test.each([
        'first_name', 'last_name', 'email', 'password', 'role'
    ])('rejects a missing %s', async (field) => {
        const data = {
            first_name: 'Demo',
            last_name: 'User',
            email: 'demo@example.test',
            password: 'Demo1234!',
            role: 'parent'
        };

        delete data[field];

        const response = await request(app)
            .post('/api/auth/register')
            .send(data);

        expect(response.status).toBe(400);
        expect(
            db.prepare('SELECT COUNT(*) AS count FROM users').get().count
        ).toBe(0);
    });

    test.each(['child', 'admin'])(
        'rejects public registration with role %s',
        async (role) => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    first_name: 'Demo',
                    last_name: 'User',
                    email: 'demo@example.test',
                    password: 'Demo1234!',
                    role
                });

            expect(response.status).toBe(400);
            expect(
                db.prepare('SELECT COUNT(*) AS count FROM users').get().count
            ).toBe(0);
        }
    );

        test.each([
        ['invalid email', { email: 'not-an-email' }],
        ['blank name', { first_name: '   ' }],
        ['non-string password', { password: 123456 }],
        ['password over 72 bytes', { password: 'a'.repeat(73) }]
    ])('rejects %s without creating a user', async (_, changes) => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                first_name: 'Demo',
                last_name: 'User',
                email: 'demo@example.test',
                password: 'Demo1234!',
                role: 'parent',
                ...changes
            });

        expect(response.status).toBe(400);

        expect(
            db.prepare('SELECT COUNT(*) AS count FROM users').get().count
        ).toBe(0);
    });

});