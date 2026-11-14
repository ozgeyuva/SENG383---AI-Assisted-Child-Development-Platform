const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { createRequireRole } = require('../middleware/access');

function createChildrenRouter(db, options = {}) {
  const router = express.Router();

  router.use(createRequireAuth(options));
  router.use(createRequireRole(db, ['parent']));

  router.get('/', (req, res, next) => {
  try {


    const children = db.prepare(`
      SELECT id, parent_id, first_name, last_name,
             date_of_birth, grade
      FROM children
      WHERE parent_id = ?
      ORDER BY id ASC
    `).all(req.auth.userId);

    return res.status(200).json({ children });
  } catch (error) {
    return next(error);
  }
});
router.get('/:childId', (req, res, next) => {
  try {
    
    const { childId } = req.params;

    if (
      !/^[1-9]\d*$/.test(childId) ||
      !Number.isSafeInteger(Number(childId))
    ) {
      return res.status(400).json({
        error: 'Invalid child ID'
      });
    }

    const child = db.prepare(`
      SELECT id, parent_id, first_name, last_name,
             date_of_birth, grade
      FROM children
      WHERE id = ? AND parent_id = ?
    `).get(Number(childId), req.auth.userId);

    if (!child) {
      return res.status(403).json({
        error: 'Child profile is not accessible'
      });
    }

    return res.status(200).json({ child });
  } catch (error) {
    return next(error);
  }
});

  router.post('/', (req, res, next) => {
    try {
      
      const {
        first_name,
        last_name,
        date_of_birth,
        grade
      } = req.body || {};

    const fields = [
  ['first_name', first_name, 'First name'],
  ['last_name', last_name, 'Last name'],
  ['date_of_birth', date_of_birth, 'Date of birth'],
  ['grade', grade, 'Grade']
];

for (const [field, value, label] of fields) {
  if (typeof value !== 'string' || value.trim() === '') {
    return res.status(400).json({
      error: `${label} is required and must be text.`,
      field
    });
  }
}

      const birthDate = date_of_birth.trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        return res.status(400).json({
          error: 'Date of birth must use YYYY-MM-DD format'
        });
      }

      const parsedDate = new Date(`${birthDate}T00:00:00.000Z`);

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== birthDate
      ) {
        return res.status(400).json({
          error: 'Invalid date of birth'
        });
      }

      // Compare calendar dates using the server's local date.
      const now = new Date();
      const today = [
        String(now.getFullYear()).padStart(4, '0'),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('-');

      if (birthDate > today) {
        return res.status(400).json({
          error: 'Date of birth cannot be in the future'
        });
      }

      const result = db.prepare(`
        INSERT INTO children (
          parent_id,
          first_name,
          last_name,
          date_of_birth,
          grade
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(
        req.auth.userId,
        first_name.trim(),
        last_name.trim(),
        birthDate,
        grade.trim()
      );

      const child = db.prepare(`
        SELECT * FROM children WHERE id = ?
      `).get(result.lastInsertRowid);

      return res.status(201).json({ child });
    } catch (error) {
      return next(error);
    }
  });
  router.post('/:childId/specialists', (req, res, next) => {
    try {
      const { childId } = req.params;

      if (
        !/^[1-9]\d*$/.test(childId) ||
        !Number.isSafeInteger(Number(childId))
      ) {
        return res.status(400).json({ error: 'Invalid child ID' });
      }

      const child = db.prepare(`
        SELECT id FROM children WHERE id = ? AND parent_id = ?
      `).get(Number(childId), req.auth.userId);

      if (!child) {
        return res.status(403).json({
          error: 'Child profile is not accessible'
        });
      }

      const { email, specialist_type } = req.body || {};

      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'Email is required' });
      }

      if (typeof specialist_type !== 'string' || !specialist_type.trim()) {
        return res.status(400).json({ error: 'Specialist type is required' });
      }

      const specialist = db.prepare(`
        SELECT id FROM users
        WHERE email = ? COLLATE NOCASE AND role = 'specialist'
      `).get(email.trim());

      if (!specialist) {
        return res.status(404).json({
          error: 'No registered specialist found for this email'
        });
      }

      const link = {
        child_id: child.id,
        specialist_id: specialist.id,
        specialist_type: specialist_type.trim()
      };

      const result = db.prepare(`
        INSERT INTO child_specialist_links (
          child_id, specialist_id, specialist_type
        )
        VALUES (?, ?, ?)
        ON CONFLICT(child_id, specialist_id) DO NOTHING
      `).run(link.child_id, link.specialist_id, link.specialist_type);

      if (result.changes === 0) {
        return res.status(409).json({
          error: 'This specialist is already linked to the child'
        });
      }

      return res.status(201).json({ link });
    } catch (error) {
      return next(error);
    }
  });
    router.get('/:childId/specialists', (req, res, next) => {
    try {
      const { childId } = req.params;

      if (
        !/^[1-9]\d*$/.test(childId) ||
        !Number.isSafeInteger(Number(childId))
      ) {
        return res.status(400).json({ error: 'Invalid child ID' });
      }

      const child = db.prepare(`
        SELECT id FROM children WHERE id = ? AND parent_id = ?
      `).get(Number(childId), req.auth.userId);

      if (!child) {
        return res.status(403).json({
          error: 'Child profile is not accessible'
        });
      }

      const specialists = db.prepare(`
        SELECT users.id AS specialist_id, users.first_name, users.last_name,
               users.email, links.specialist_type
        FROM child_specialist_links AS links
        JOIN users ON users.id = links.specialist_id
        WHERE links.child_id = ? AND users.role = 'specialist'
        ORDER BY users.id ASC
      `).all(child.id);

      return res.status(200).json({ specialists });
    } catch (error) {
      return next(error);
    }
  });
  return router;
}

module.exports = { createChildrenRouter };