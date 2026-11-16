const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { createRequireRole } = require('../middleware/access');

function createTasksRouter(db, options = {}) {
  const router = express.Router();

  router.use(createRequireAuth(options));
  const requireTaskAccessRole = createRequireRole(db, ['parent', 'specialist']);

  function findAccessibleChild(childId, { role, userId }) {
    const query = role === 'parent'
      ? 'SELECT 1 FROM children WHERE id = ? AND parent_id = ?'
      : 'SELECT 1 FROM child_specialist_links WHERE child_id = ? AND specialist_id = ?';
    return db.prepare(query).get(childId, userId);
  }

  const listTasks = db.transaction((childId, auth) => {
    if (!findAccessibleChild(childId, auth)) return null;

    const assignerFilter = auth.role === 'specialist' ? 'AND assigned_by = ?' : '';
    const params = auth.role === 'specialist' ? [childId, auth.userId] : [childId];
    return db.prepare(`
      SELECT id, child_id, assigned_by, title, description, category,
             due_date, status, created_at, completed_at
      FROM tasks WHERE child_id = ? ${assignerFilter}
      ORDER BY due_date ASC, id ASC
    `).all(...params);
  });

  router.get('/', requireTaskAccessRole, (req, res, next) => {
    try {
      const { childId } = req.query;
      if (typeof childId !== 'string' || !/^[1-9]\d*$/.test(childId) ||
          !Number.isSafeInteger(Number(childId))) {
        return res.status(400).json({ error: 'Invalid child ID', field: 'childId' });
      }

      const tasks = listTasks(Number(childId), req.auth);
      if (!tasks) {
        return res.status(403).json({ error: 'Child profile is not accessible' });
      }

      return res.status(200).json({ tasks });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/categories', requireTaskAccessRole, (req, res, next) => {
    try {
      const categories = db.prepare('SELECT name FROM task_categories ORDER BY name')
        .all().map(category => category.name);
      return res.status(200).json({ categories });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', requireTaskAccessRole, (req, res, next) => {
    try {
      const { child_id, title, description, category, due_date } = req.body || {};

      if (!Number.isSafeInteger(child_id) || child_id < 1) {
        return res.status(400).json({
          error: 'Child ID must be a positive integer.',
          field: 'child_id'
        });
      }

      if (!findAccessibleChild(child_id, req.auth)) {
        return res.status(403).json({ error: 'Child profile is not accessible' });
      }

      const errors = {};
      for (const [field, value, label] of [
        ['title', title, 'Title'],
        ['description', description, 'Description'],
        ['category', category, 'Category'],
        ['due_date', due_date, 'Due date']
      ]) {
        if (typeof value !== 'string' || value.trim() === '') {
          errors[field] = `${label} is required and must be text.`;
        }
      }

      if (Object.keys(errors).length) {
        const field = Object.keys(errors)[0];
        return res.status(400).json({ error: errors[field], field, errors });
      }

      const dueDate = due_date.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        return res.status(400).json({
          error: 'Due date must use YYYY-MM-DD format.', field: 'due_date'
        });
      }

      const parsedDate = new Date(`${dueDate}T00:00:00.000Z`);
      if (Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== dueDate) {
        return res.status(400).json({ error: 'Invalid due date.', field: 'due_date' });
      }

      const selectedCategory = category.trim();
      if (!db.prepare('SELECT name FROM task_categories WHERE name = ?')
        .get(selectedCategory)) {
        return res.status(400).json({ error: 'Invalid category.', field: 'category' });
      }

      const task = db.transaction(() => {
        if (!findAccessibleChild(child_id, req.auth)) return null;

        return db.prepare(`
          INSERT INTO tasks (child_id, assigned_by, title, description, category, due_date)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING *
        `).get(child_id, req.auth.userId, title.trim(), description.trim(), selectedCategory, dueDate);
      }).immediate();
      if (!task) {
        return res.status(403).json({ error: 'Child profile is not accessible' });
      }

      return res.status(201).json({ task });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createTasksRouter };
