const jwt = require('jsonwebtoken');

function createRequireAuth( { jwtSecret} = {}) {
    if (typeof jwtSecret !== 'string' || jwtSecret.trim() === '') {
        throw new Error ('JWT_SECRET is not configured.');
    }

    return function requireAuth(req, res, next) {
        const authorization = req.get('Authorization');

        const match = typeof authorization === 'string'
        ? /^Bearer ([^\s]+)$/i.exec(authorization)
        : null;

        if (!match) {
            return res.status(401).json({ error: 'Authorization required.' });
        }

        let payload;

        try {
            payload = jwt.verify(match[1], jwtSecret, {
                algorithms: ['HS256']
            });
        } catch (error) {
            return res.status(401).json({'error': 'Invalid or expired token.'});
        }

        if (
            typeof payload !== 'object' ||
            payload === null ||
            typeof payload.sub !== 'string' ||
            !/^[1-9]\d*$/.test(payload.sub) ||
            !Number.isSafeInteger(Number(payload.sub)) ||
            !['parent', 'specialist', 'child'].includes(payload.role) ||
            !Number.isInteger(payload.exp)
        ) {
                return res.status(401).json({ error: 'Invalid token.' });
        }

        req.auth = {
            userId: Number(payload.sub),
            role: payload.role,
        };

        return next();
    };
}

module.exports = { createRequireAuth }; 