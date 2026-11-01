function createRequireRole(db, allowedRoles) {
    return function requireRole(req, res, next) {
        if (!req.auth) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        try {
            const account = db.prepare(`
                SELECT id, role
                FROM users
                WHERE id = ?
            `).get(req.auth.userId);

            if (!account) {
                return res.status(401).json({
                    error: 'Account not found'
                });
            }

            if (!allowedRoles.includes(account.role)) {
                return res.status(403).json({
                    error: 'Access denied'
                });
            }

            req.auth.role = account.role;

            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = { createRequireRole };