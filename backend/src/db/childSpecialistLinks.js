function removeChildSpecialistLink(db, childId, specialistId) {
  const result = db.prepare(`
    DELETE FROM child_specialist_links
    WHERE child_id = ? AND specialist_id = ?
  `).run(childId, specialistId);

  return result.changes === 1;
}

module.exports = { removeChildSpecialistLink };