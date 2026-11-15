const { createApp } = require('./src/app');
const { createDatabase } = require('./src/db/database');
const { seedUser} = require('./src/db/seed');

const db = createDatabase(':memory:');
seedUser(db);

const app = createApp(db, { jwtSecret: 'lumi-e2e-test-secret' });

app.listen(3100, '127.0.0.1', () => {
    console.log("E2E API running at http://127.0.0.1:3100");
});