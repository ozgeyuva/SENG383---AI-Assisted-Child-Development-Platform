const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { createRequireRole } = require('../middleware/access');

function createSpecialistsRouter(db, options = {}) {
  const router = express.Router();

  router.use(createRequireAuth(options));
  router.use(createRequireRole(db, ['specialist']));

  router.get('/me/children', (req, res, next) => {
    try {
      const children = db.prepare(`
        SELECT children.id, children.first_name, children.last_name,
               children.date_of_birth, children.grade, links.specialist_type
        FROM child_specialist_links AS links
        JOIN children ON children.id = links.child_id
        WHERE links.specialist_id = ?
        ORDER BY children.id ASC
      `).all(req.auth.userId);

      return res.status(200).json({ children });
    } catch (error) {
      return next(error);
    }
  });
  router.get('/me/children/:childId', (req, res, next) => {
    try {
      const { childId } = req.params;
      const id = Number(childId);

      if (!/^[1-9]\d*$/.test(childId) || !Number.isSafeInteger(id)) {
        return res.status(400).json({ error: 'Invalid child ID' });
      }

      const child = db.prepare(`
        SELECT children.id, children.first_name, children.last_name,
               children.date_of_birth, children.grade, links.specialist_type
        FROM child_specialist_links AS links
        JOIN children ON children.id = links.child_id
        WHERE links.specialist_id = ? AND links.child_id = ?
      `).get(req.auth.userId, id);

      if (!child) {
        return res.status(403).json({ error: 'Child profile is not accessible' });
      }

      return res.status(200).json({ child });
    } catch (error) {
      return next(error);
    }
  });
  return router;
}

module.exports = { createSpecialistsRouter };