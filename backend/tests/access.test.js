const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createDatabase } = require('../src/db/database');
const { createRequireAuth } = require('../src/middleware/auth');
const { createRequireRole } = require('../src/middleware/access');

describe('Role access control', () => {
    const jwtSecret = 'test-only-secret-not-for-real-use';
    let db;
    let app;
    let userId;

    beforeEach(() => {
        db = createDatabase();

        const result = db.prepare(`
            INSERT INTO users (
                first_name, last_name, email, password_hash, role
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            'Demo',
            'Parent',
            'access@example.test',
            'test-only-placeholder',
            'parent'
        );

        userId = Number(result.lastInsertRowid);

        app = express();

        app.get(
            '/parent-only',
            createRequireAuth({ jwtSecret }),
            createRequireRole(db, ['parent']),
            (req, res) => {
                res.json({ auth: req.auth });
            }
        );
    });

    afterEach(() => {
        db.close();
    });

    function makeToken(role = 'parent', id = userId) {
        return jwt.sign(
            { role },
            jwtSecret,
            {
                subject: String(id),
                expiresIn: '1h',
                algorithm: 'HS256'
            }
        );
    }

    test('allows a parent to access a parent-only route', async () => {
        const response = await request(app)
            .get('/parent-only')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.auth).toEqual({
            userId,
            role: 'parent'
        });
    });

    test('rejects a request without authentication', async () => {
        const response = await request(app).get('/parent-only');

        expect(response.status).toBe(401);
    });

    test.each(['specialist', 'child'])(
        'rejects an account whose stored role is %s',
        async (role) => {
            db.prepare(
                'UPDATE users SET role = ? WHERE id = ?'
            ).run(role, userId);

            const response = await request(app)
                .get('/parent-only')
                .set('Authorization', `Bearer ${makeToken(role)}`);

            expect(response.status).toBe(403);
        }
    );

    test('uses the current database role instead of an old token role', async () => {
        const token = makeToken('parent');

        db.prepare(
            'UPDATE users SET role = ? WHERE id = ?'
        ).run('specialist', userId);

        const response = await request(app)
            .get('/parent-only')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
    });

    test('rejects a token belonging to a deleted account', async () => {
        const token = makeToken();

        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        const response = await request(app)
            .get('/parent-only')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
    });
});