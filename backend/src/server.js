require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('./db/database');
const { createApp } = require('./app');

const dataDirectory = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

const db = createDatabase(
    path.join(dataDirectory, 'lumi.sqlite')
);

const app = createApp(db, { jwtSecret: process.env.JWT_SECRET });
const port = process.env.PORT || 3000;

const server = app.listen(port, '127.0.0.1', () => {
    console.log(`API running at http://127.0.0.1:${port}`);
});

process.on('SIGINT', () => {
    server.close(() => {
        db.close();
        process.exit(0);
    });
});