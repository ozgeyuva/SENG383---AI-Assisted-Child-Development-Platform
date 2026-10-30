const express = require('express');
const { createAuthRouter } = require('./routes/auth');
const { createChildrenRouter } = require('./routes/children');
function createApp(db, options = {}) {
    const app = express();

    app.use(express.json( { limit: '16kb'}));
    app.use('/api/auth', createAuthRouter(db, options));
    app.use('/api/children', createChildrenRouter(db, options));
    app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'Invalid JSON data' });
        }

        if( error.type === 'entity.too.large') {
            return res.status(413).json({ error: 'Request entity too large' });
        }
        
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    });


    return app;

}

module.exports = { createApp };