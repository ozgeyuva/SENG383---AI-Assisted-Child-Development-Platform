const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { createDatabase } = require('../src/db/database');
const { seedUser, seedChildren, seedTasks } = require('../src/db/seed');

describe('Tasks database', () => {
  let db;
  let parentId;
  let childId;

  beforeEach(() => {
    db = createDatabase();
    parentId = Number(db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Demo', 'Parent', 'parent@example.test', 'test-only', 'parent')
    `).run().lastInsertRowid);
    childId = Number(db.prepare(`
      INSERT INTO children (parent_id, first_name, last_name, date_of_birth, grade)
      VALUES (?, 'Deniz', 'Demo', '2017-05-10', '4')
    `).run(parentId).lastInsertRowid);
  });

  afterEach(() => db.close());

  function insertTask(overrides = {}) {
    const task = {
      child_id: childId,
      assigned_by: parentId,
      title: 'Read for 15 minutes',
      description: 'Read a book of your choice.',
      category: 'Academic',
      due_date: '2026-11-08',
      ...overrides
    };
    return db.prepare(`
      INSERT INTO tasks (child_id, assigned_by, title, description, category, due_date)
      VALUES (@child_id, @assigned_by, @title, @description, @category, @due_date)
    `).run(task);
  }

  test('stores child and assigner relations with the initial status', () => {
    const result = insertTask();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?')
      .get(result.lastInsertRowid);
    expect(task).toMatchObject({
      child_id: childId, assigned_by: parentId,
      status: 'Not Started', completed_at: null
    });
    expect(task.created_at).toBeTruthy();
    expect(db.prepare(`
      SELECT users.id FROM tasks JOIN users ON users.id = tasks.assigned_by
      JOIN children ON children.id = tasks.child_id WHERE tasks.id = ?
    `).get(task.id).id).toBe(parentId);
  });

  test.each(['child_id', 'assigned_by'])('rejects nonexistent %s', (field) => {
    expect(() => insertTask({ [field]: -1 })).toThrow(/FOREIGN KEY/);
    expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
  });

  test.each(['child_id', 'assigned_by', 'title', 'description', 'category', 'due_date'])(
    'rejects missing required %s', (field) => {
      expect(() => insertTask({ [field]: null })).toThrow(/NOT NULL/);
    }
  );

  test.each(['title', 'description'])('rejects blank %s', (field) => {
    expect(() => insertTask({ [field]: '   ' })).toThrow(/CHECK/);
  });

  test('uses the shared category list and rejects unknown categories', () => {
    const categories = db.prepare('SELECT name FROM task_categories ORDER BY name').all();
    expect(categories.map(category => category.name))
      .toEqual(['Academic', 'Extracurricular', 'Health']);
    for (const { name } of categories) insertTask({ category: name });
    expect(() => insertTask({ category: 'Unknown' })).toThrow(/FOREIGN KEY/);
  });

  test.each(['2026-02-30', '2026-13-01', '2026-1-01', 'not-a-date', ''])(
    'rejects invalid due date %s', (due_date) => {
      expect(() => insertTask({ due_date })).toThrow(/CHECK/);
    }
  );

  test('accepts a leap day and restricts status to the defined values', () => {
    const result = insertTask({ due_date: '2028-02-29' });
    const update = db.prepare('UPDATE tasks SET status = ? WHERE id = ?');
    for (const status of ['Not Started', 'In Progress', 'Completed']) {
      update.run(status, result.lastInsertRowid);
    }
    expect(() => update.run('Unknown', result.lastInsertRowid)).toThrow(/CHECK/);
  });

  test('seeds synthetic tasks without duplicates or resetting progress', () => {
    seedUser(db);
    seedChildren(db);
    seedTasks(db);
    db.prepare("UPDATE tasks SET status = 'In Progress'").run();
    const before = db.prepare('SELECT * FROM tasks').all();
    seedTasks(db);
    expect(db.prepare('SELECT * FROM tasks').all()).toEqual(before);
    expect(before).toHaveLength(1);
  });

  test('reopening an existing database preserves users, children and tasks', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-tasks-'));
    const filename = path.join(directory, 'test.sqlite');
    let persisted;
    try {
      // Start with the previous schema to exercise an actual upgrade.
      persisted = new Database(filename);
      for (const migration of ['001_create_users.sql', '002_create_children.sql']) {
        persisted.exec(fs.readFileSync(path.join(
          __dirname, '../src/db/migrations', migration
        ), 'utf8'));
      }
      seedUser(persisted);
      seedChildren(persisted);
      const users = persisted.prepare('SELECT * FROM users ORDER BY id').all();
      const children = persisted.prepare('SELECT * FROM children ORDER BY id').all();
      persisted.close();
      persisted = createDatabase(filename);
      expect(persisted.prepare('SELECT * FROM users ORDER BY id').all()).toEqual(users);
      expect(persisted.prepare('SELECT * FROM children ORDER BY id').all()).toEqual(children);
      seedTasks(persisted);
      const before = persisted.prepare('SELECT * FROM tasks').all();
      persisted.close();
      persisted = createDatabase(filename);
      expect(persisted.prepare('SELECT * FROM tasks').all()).toEqual(before);
      expect(persisted.prepare('SELECT COUNT(*) AS total FROM task_categories').get().total)
        .toBe(3);
      expect(persisted.pragma('foreign_keys', { simple: true })).toBe(1);
    } finally {
      if (persisted && persisted.open) persisted.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
