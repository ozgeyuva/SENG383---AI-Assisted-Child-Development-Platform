const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');
const { seedUser } = require('../src/db/seed');

describe('POST /api/auth/login', () => {
    let db;
    let app;

    const jwtSecret = 'test-only-secret-not-for-real-use';

    beforeEach(() => {
        db = createDatabase();
        seedUser(db);
        app = createApp(db, { jwtSecret });
    });

    afterEach(() => {
        db.close();
    });

    test.each([
        ['parent@example.test', 'parent'],
        ['specialist@example.test', 'specialist']
    ])('logs in %s and issues a valid JWT', async (email, role) => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email,
                password: 'Demo1234!'
            });

        expect(response.status).toBe(200);
        expect(response.body.user).toEqual({
            id: expect.any(Number),
            first_name: 'Demo',
            last_name: role === 'parent' ? 'Parent' : 'Specialist',
            email,
            role
        });

        const payload = jwt.verify(
            response.body.token,
            jwtSecret,
            { algorithms: ['HS256'] }
        );

        expect(payload.sub).toBe(String(response.body.user.id));
        expect(payload.role).toBe(role);
        expect(payload.exp - payload.iat).toBe(3600);
        expect(payload).not.toHaveProperty('password');
        expect(payload).not.toHaveProperty('password_hash');
    });

    test.each([
        ['parent@example.test', 'WrongPassword!'],
        ['unknown@example.test', 'Demo1234!']
    ])('rejects invalid credentials for %s', async (email, password) => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            error: 'Invalid email or password'
        });
    });
});