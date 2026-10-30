const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createRequireAuth } = require('../src/middleware/auth');

describe('JWT Authentication Middleware', () => {
    const jwtSecret = 'test-only-secret-not-for-real-use';
    let app;

    beforeEach(() => {
        app = express();

        app.get(
            '/protected', 
            createRequireAuth({ jwtSecret }),
            (req, res) => {
                res.json({ auth: req.auth });
            }
        );
    });
    
    function makeToken(options = {}) {
        return jwt.sign(
            { role: 'parent' },
            jwtSecret,
            {
                subject: '1',
                expiresIn: '1h',
                algorithm: 'HS256',
                ...options,
            }
        );
    }

    test('accepts a valid token and passes account information', async () => {
        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.auth).toEqual({ userId: 1, role: 'parent' });
    });

    test('rejects a request without a token', async () => {
        const response = await request(app).get('/protected');

        expect(response.status).toBe(401);
        expect(response.body).not.toHaveProperty('auth');
    });

    test('rejects a malformed token', async () => {
        const response = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer not-a-valid-token');

        expect(response.status).toBe(401);
    });

    test('rejects an expired token', async () => {
        const response = await request(app)
            .get('/protected')
            .set(
                'Authorization',
                `Bearer ${makeToken({ expiresIn: -60 })}`
            );

        expect(response.status).toBe(401);
    });

    test('rejects a token signed with a different secret', async () => {
        const token = jwt.sign(
            { role: 'parent' },
            'another-test-secret',
            {
                subject: '1',
                expiresIn: '1h',
                algorithm: 'HS256'
            }
        );

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
    });

    test('rejects an unsupported signing algorithm', async () => {
        const token = makeToken({ algorithm: 'HS384' });

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
    });
});