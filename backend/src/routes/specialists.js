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

  return router;
}

module.exports = { createSpecialistsRouter };