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
        first_name,
        last_name,
        date_of_birth,
        grade
      ];

      if (fields.some(value =>
        typeof value !== 'string' || value.trim() === ''
      )) {
        return res.status(400).json({
          error: 'All child profile fields are required'
        });
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

  return router;
}

module.exports = { createChildrenRouter };