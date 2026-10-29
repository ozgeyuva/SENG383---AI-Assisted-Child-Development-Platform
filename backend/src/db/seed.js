const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('./database');

const demoUser = [
    {
    first_name: 'Demo',
    last_name: 'Parent',
    email: 'parent@example.test',
    role: 'parent',
    },

    {
        first_name: 'Demo',
        last_name: 'Specialist',
        email: 'specialist@example.test',
        role: 'specialist',
    },

];

function seedUser(db) {
    const passwordHash = bcrypt.hashSync('Demo1234!', 10);

    const insert = db.prepare(`
        INSERT INTO users (
            first_name, last_name, email, password_hash, role
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO NOTHING
    `);

    const seed = db.transaction(() => {
        for (const user of demoUser) {
            insert.run(
                user.first_name,
                user.last_name,
                user.email,
                passwordHash,
                user.role
            );
        }
    });

    seed();
}

if (require.main === module) {
    const dataDirectory = path.join(__dirname, '..', '..', 'data');
    fs.mkdirSync(dataDirectory, { recursive: true });

    const db = createDatabase(path.join(dataDirectory, 'lumi.sqlite'));

    try {
        seedUser(db);
        console.table(db.prepare('SELECT id, email, role FROM users').all());
    } finally {
        db.close();
    }
}

module.exports = { seedUser };  