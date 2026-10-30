const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcryptjs');

function createAuthRouter(db, { jwtSecret } = {}) {
    const router = express.Router();

    router.post('/register', async (req, res, next) => {
        const { first_name, last_name, email, password, role } = req.body || {};

        const fields = [first_name, last_name, email, password, role];

        if (fields.some(value => typeof value !== 'string' || value.trim() === '')) {
            return res.status(400).json({ error: 'All the fields are required' });
        }

        if (!['parent', 'specialist'].includes(role)) {
            return res.status(400).json({ error: 'Invalid account role' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ error: 'The password can be at most 72 bytes long.' });
        }

        try {
            const passwordHash = await bcrypt.hash(password, 10);

            const result = db.prepare(`
                INSERT INTO users (
                    first_name, last_name, email, password_hash, role
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(
                first_name.trim(),
                last_name.trim(),
                normalizedEmail,
                passwordHash,
                role
            );

            return res.status(201).json({ 
            user: {
                id: Number (result.lastInsertRowid),
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: normalizedEmail,
                role
            } 
        });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ error: 'Email already exists' });
            }
            return next(error);
        }
    });
    
    router.post('/login', async (req, res, next) => {
        const { email, password } = req.body || {};

        if (typeof email !== 'string' || typeof password !== 'string' || email.trim() === '' || password.trim() === '') {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            if (!jwtSecret) {
                throw new Error('JWT secret is not configured');
            }
            const user = db.prepare('SELECT id, first_name, last_name, email, password_hash, role FROM users WHERE email = ?').get(email.trim().toLowerCase());

            const passwordMatch = user ? await bcrypt.compare(password, user.password_hash) : false;

            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = jwt.sign(
                { role: user.role },
                jwtSecret,
                { subject: String(user.id), expiresIn: '1h', algorithm: 'HS256' 

                }
            );

            return res.status(200).json({ 
                token, user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role
                } 
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

        module.exports = { createAuthRouter };