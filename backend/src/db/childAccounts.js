function linkChildAccount(db, childId, userId) {
    const result = db.prepare(`
        INSERT INTO child_accounts (child_id, user_id)
        SELECT ?, id
        FROM users
        WHERE id = ? AND role = 'child'
    `).run(childId, userId);

    if (result.changes === 0) {
        throw new Error('A child account is required.');
    }
}

function findChildIdForUser(db, userId) {
    const link = db.prepare(`
        SELECT child_accounts.child_id
        FROM child_accounts
        JOIN users ON users.id = child_accounts.user_id
        WHERE users.id = ? AND users.role = 'child'
    `).get(userId);

    return link?.child_id ?? null;
}

module.exports = { linkChildAccount, findChildIdForUser };