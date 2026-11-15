function completeTaskForChild(db, taskId, childId) {
  return db.prepare(`
    UPDATE tasks
    SET status = 'Completed',
        completed_at = CASE
          WHEN status = 'Completed' AND completed_at IS NOT NULL THEN completed_at
          ELSE CURRENT_TIMESTAMP
        END
    WHERE id = ? AND child_id = ?
    RETURNING *
  `).get(taskId, childId) ?? null;
}

module.exports = { completeTaskForChild };
