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

function seedChildren(db) {
    const seed = db.transaction(() => {
        const parent = db.prepare(`
            SELECT id FROM users
            WHERE email = ? AND role = 'parent'
        `).get('parent@example.test');

        if (!parent) {
            throw new Error('Run seedUser before seedChildren.');
        }

        db.prepare(`
            INSERT INTO children (
                parent_id, first_name, last_name, date_of_birth, grade
            )
            SELECT ?, ?, ?, ?, ?
            WHERE NOT EXISTS (
                SELECT 1 FROM children
                WHERE parent_id = ?
                  AND first_name = ?
                  AND last_name = ?
                  AND date_of_birth = ?
            )
        `).run(
            parent.id, 'Deniz', 'Demo', '2017-05-10', '4',
            parent.id, 'Deniz', 'Demo', '2017-05-10'
        );
    });

    seed();
}
function seedTasks(db) {
    const child = db.prepare(`
        SELECT children.id, children.parent_id
        FROM children
        JOIN users ON users.id = children.parent_id
        WHERE users.email = ? AND users.role = 'parent'
          AND children.first_name = ? AND children.last_name = ?
          AND children.date_of_birth = ?
        ORDER BY children.id LIMIT 1
    `).get('parent@example.test', 'Deniz', 'Demo', '2017-05-10');

    if (!child) {
        throw new Error('Run seedUser and seedChildren before seedTasks.');
    }

    db.prepare(`
        INSERT INTO tasks (
            child_id, assigned_by, title, description, category, due_date
        )
        SELECT ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
            SELECT 1 FROM tasks
            WHERE child_id = ? AND assigned_by = ? AND title = ?
              AND due_date = ?
        )
    `).run(
        child.id, child.parent_id, 'Read for 15 minutes',
        'Read a book of your choice.', 'Academic', '2026-11-08',
        child.id, child.parent_id, 'Read for 15 minutes', '2026-11-08'
    );
}
function seedChildSpecialistLinks(db) {
    db.prepare(`
        INSERT INTO child_specialist_links (
            child_id, specialist_id, specialist_type
        )
        SELECT children.id, specialist.id, ?
        FROM children
        JOIN users AS parent ON parent.id = children.parent_id
        JOIN users AS specialist
          ON specialist.email = ? AND specialist.role = 'specialist'
        WHERE parent.email = ? AND parent.role = 'parent'
          AND children.first_name = ?
          AND children.last_name = ?
          AND children.date_of_birth = ?
        ORDER BY children.id
        LIMIT 1
        ON CONFLICT(child_id, specialist_id) DO NOTHING
    `).run(
        'Teacher', 'specialist@example.test', 'parent@example.test',
        'Deniz', 'Demo', '2017-05-10'
    );
}
if (require.main === module) {
    const dataDirectory = path.join(__dirname, '..', '..', 'data');
    fs.mkdirSync(dataDirectory, { recursive: true });

    const db = createDatabase(path.join(dataDirectory, 'lumi.sqlite'));

    try {
    seedUser(db);
    seedChildren(db);
    seedChildSpecialistLinks(db);
    seedTasks(db);
    console.table(
        db.prepare('SELECT id, email, role FROM users').all()
    );

    console.table(
        db.prepare('SELECT * FROM children').all()
    );
} finally {
    db.close();
}
}

module.exports = { seedUser, seedChildren, seedTasks, seedChildSpecialistLinks };
