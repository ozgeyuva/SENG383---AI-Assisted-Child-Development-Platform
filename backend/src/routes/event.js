const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { createRequireRole } = require('../middleware/access');

const categories = ['School', 'Extracurricular', 'Health', 'Other'];

function createEventRouter(db, options = {}) {
    const router = express.Router();

    router.post(
        '/',
    createRequireAuth(options),
    createRequireRole(db, ['parent', 'specialist']),
    (req, res, next) => {
        try {
            const { child_id, title, event_date, event_time, category } = req.body || {};

            if (!Number.isSafeInteger(child_id) || child_id < 1) {
                return res.status(400).json({ error: 'Invalid child_id', field: 'child_id' });
            }

            if (typeof title !== 'string' || title.trim() === '') {
                return res.status(400).json({ error: 'Title is required', field: 'title' });
            }

            if (typeof event_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
                return res.status(400).json({ error: 'Use YYYY-MM-DD format.', field: 'event_date' });
            }

            const date = new Date(event_date + 'T00:00:00.000Z');
            if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== event_date) {
                return res.status(400).json({ error: 'Invalid event date', field: 'event_date' });
            }

             if (typeof event_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event_time)) {
                    return res.status(400).json({ error: 'Use HH:MM.', field: 'event_time' });
                }

                if (!categories.includes(category)) {
                    return res.status(400).json({ error: 'Invalid category.', field: 'category' });
                }

                const { userId, role } = req.auth;
                const access = role === 'parent'
                    ? db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?')
                        .get(child_id, userId)
                    : db.prepare('SELECT child_id FROM child_specialist_links WHERE child_id = ? AND specialist_id = ?')
                        .get(child_id, userId);

                if (!access) {
                    return res.status(403).json({ error: 'Child profile is not accessible.' });
                }

                const result = db.prepare(`
                    INSERT INTO events (child_id, title, event_date, event_time, category)
                    VALUES (?, ?, ?, ?, ?)
                `).run(child_id, title.trim(), event_date, event_time, category);

                const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
                return res.status(201).json( { event });
            } catch (err) {
                return next(err);
            }
        }
    );

    return router;

}

module.exports = { createEventRouter };