const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');

describe('Task assignment API', () => {
  const jwtSecret = 'test-secret-for-task-assignment';
  let db;
  let app;
  let parent;
  let otherParent;
  let specialist;
  let childAccount;
  let childId;
  let validTask;

  function createUser(role, email) {
    const result = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Demo', 'User', ?, 'test-only', ?)
    `).run(email, role);
    return { id: Number(result.lastInsertRowid), role };
  }

  function tokenFor(user, options = {}) {
    return jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id), expiresIn: '1h', algorithm: 'HS256', ...options
    });
  }

  function assign(body = validTask, token = tokenFor(parent)) {
    return request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${token}`).send(body);
  }

  beforeEach(() => {
    db = createDatabase();
    parent = createUser('parent', 'parent@example.test');
    otherParent = createUser('parent', 'other-parent@example.test');
    specialist = createUser('specialist', 'specialist@example.test');
    childAccount = createUser('child', 'child@example.test');
    childId = Number(db.prepare(`
      INSERT INTO children (parent_id, first_name, last_name, date_of_birth, grade)
      VALUES (?, 'Deniz', 'Demo', '2017-05-10', '4')
    `).run(parent.id).lastInsertRowid);
    validTask = {
      child_id: childId, title: 'Read for 15 minutes',
      description: 'Read a book of your choice.',
      category: 'Academic', due_date: '2026-11-08'
    };
    app = createApp(db, { jwtSecret });
  });

  afterEach(() => db.close());

  test('lists every task for the owned child, including another assigner, ordered by due date and ID', async () => {
    const insert = db.prepare(`
      INSERT INTO tasks (child_id, assigned_by, title, description, category, due_date, status)
      VALUES (?, ?, ?, 'Test details', 'Academic', ?, ?)
    `);
    insert.run(childId, parent.id, 'Later', '2026-11-10', 'Not Started');
    insert.run(childId, specialist.id, 'Earlier', '2026-11-08', 'Completed');
    insert.run(childId, parent.id, 'Same day', '2026-11-08', 'In Progress');
    const otherChild = db.prepare(`
      INSERT INTO children (parent_id, first_name, last_name, date_of_birth, grade)
      VALUES (?, 'Other', 'Child', '2017-05-10', '4')
    `).run(otherParent.id).lastInsertRowid;
    insert.run(otherChild, otherParent.id, 'Private', '2026-11-01', 'Not Started');
    const response = await request(app).get(`/api/tasks?childId=${childId}`)
      .set('Authorization', `Bearer ${tokenFor(parent)}`);
    expect(response.status).toBe(200);
    expect(response.body.tasks.map(task => task.title)).toEqual(['Earlier', 'Same day', 'Later']);
    expect(response.body.tasks[0].assigned_by).toBe(specialist.id);
    expect(response.body.tasks[0].status).toBe('Completed');
    expect(response.body.tasks.every(task => task.child_id === childId)).toBe(true);
  });

  test('returns an empty task list for an owned child without tasks', async () => {
    const response = await request(app).get(`/api/tasks?childId=${childId}`)
      .set('Authorization', `Bearer ${tokenFor(parent)}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ tasks: [] });
  });

  test.each(['', 'abc', '0', '-1', '1.5', '9007199254740992', '1&childId=2'])(
    'rejects invalid list child ID %s', async value => {
      const response = await request(app).get(`/api/tasks?childId=${value}`)
        .set('Authorization', `Bearer ${tokenFor(parent)}`);
      expect(response.status).toBe(400);
    }
  );

  test('rejects missing child selection and unauthorized list access', async () => {
    expect((await request(app).get('/api/tasks')
      .set('Authorization', `Bearer ${tokenFor(parent)}`)).status).toBe(400);
    expect((await request(app).get(`/api/tasks?childId=${childId}`)).status).toBe(401);
    for (const user of [otherParent, specialist, childAccount]) {
      expect((await request(app).get(`/api/tasks?childId=${childId}`)
        .set('Authorization', `Bearer ${tokenFor(user)}`)).status).toBe(403);
    }
    expect((await request(app).get('/api/tasks?childId=99999')
      .set('Authorization', `Bearer ${tokenFor(parent)}`)).status).toBe(403);
  });

  test('returns the shared category list for an authenticated parent', async () => {
    const response = await request(app).get('/api/tasks/categories')
      .set('Authorization', `Bearer ${tokenFor(parent)}`);
    expect(response.status).toBe(200);
    expect(response.body.categories).toEqual(
      db.prepare('SELECT name FROM task_categories ORDER BY name').all().map(row => row.name)
    );
  });

  test('protects category access with the existing authentication and role policy', async () => {
    expect((await request(app).get('/api/tasks/categories')).status).toBe(401);
    expect((await request(app).get('/api/tasks/categories')
      .set('Authorization', `Bearer ${tokenFor(specialist)}`)).status).toBe(403);
  });

  test('assigns an owned child a task and derives identity and initial status on the server', async () => {
    const response = await assign({
      ...validTask, assigned_by: otherParent.id, parent_id: otherParent.id,
      status: 'Completed', completed_at: '2026-11-01', created_at: '2020-01-01', id: 999
    });
    expect(response.status).toBe(201);
    expect(response.body.task).toMatchObject({
      ...validTask, assigned_by: parent.id, status: 'Not Started', completed_at: null
    });
    expect(response.body.task.id).not.toBe(999);
    expect(response.body.task.created_at).not.toBe('2020-01-01');
    expect(db.prepare('SELECT * FROM tasks WHERE id = ?').get(response.body.task.id))
      .toEqual(response.body.task);
  });

  test('trims text and accepts all shared categories', async () => {
    const categories = db.prepare('SELECT name FROM task_categories').all();
    for (const { name } of categories) {
      const response = await assign({
        ...validTask, title: '  Read  ', description: '  A book  ',
        category: ` ${name} `, due_date: ' 2028-02-29 '
      });
      expect(response.status).toBe(201);
      expect(response.body.task).toMatchObject({
        title: 'Read', description: 'A book', category: name, due_date: '2028-02-29'
      });
    }
  });

  test('rejects anonymous assignment', async () => {
    const response = await request(app).post('/api/tasks').send(validTask);
    expect(response.status).toBe(401);
    expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
  });

  test.each(['invalid', 'expired'])('rejects an %s token', async (kind) => {
    const token = kind === 'invalid' ? 'invalid' : tokenFor(parent, { expiresIn: -1 });
    expect((await assign(validTask, token)).status).toBe(401);
    expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
  });

  test('rejects a token whose account was deleted', async () => {
    const token = tokenFor(otherParent);
    db.prepare('DELETE FROM users WHERE id = ?').run(otherParent.id);
    expect((await assign(validTask, token)).status).toBe(401);
  });

  test('rechecks stored role rather than trusting a stale parent token', async () => {
    const token = tokenFor(parent);
    db.prepare("UPDATE users SET role = 'child' WHERE id = ?").run(parent.id);
    expect((await assign(validTask, token)).status).toBe(403);
    expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
  });

  test.each(['other parent', 'unlinked specialist', 'child'])(
    'rejects assignment by an %s', async (kind) => {
      const user = {
        'other parent': otherParent, 'unlinked specialist': specialist, child: childAccount
      }[kind];
      expect((await assign(validTask, tokenFor(user))).status).toBe(403);
      expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
    }
  );

  test('rejects a nonexistent child without revealing whether it exists', async () => {
    const response = await assign({ ...validTask, child_id: 99999 });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Child profile is not accessible');
    expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
  });

  test.each([
    ['child_id', undefined], ['child_id', '1'], ['child_id', 0],
    ['child_id', -1], ['child_id', 1.5], ['child_id', Number.MAX_SAFE_INTEGER + 1],
    ['title', undefined], ['title', '   '], ['title', 123],
    ['description', undefined], ['description', null], ['description', '   '],
    ['category', undefined], ['category', []], ['category', 'Unknown'],
    ['due_date', undefined], ['due_date', 123], ['due_date', ''],
    ['due_date', '2026-02-30'], ['due_date', '2027-02-29'],
    ['due_date', '2026-13-01'], ['due_date', '2026-1-01'],
    ['due_date', '2026-11-08T00:00:00Z']
  ])('rejects invalid %s (%j) without saving', async (field, value) => {
    const response = await assign({ ...validTask, [field]: value });
    expect(response.status).toBe(400);
    expect(response.body.field).toBe(field);
    expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
  });

  test('rejects an empty request body', async () => {
    expect((await assign({})).status).toBe(400);
    expect(db.prepare('SELECT COUNT(*) AS total FROM tasks').get().total).toBe(0);
  });
});
