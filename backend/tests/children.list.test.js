const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');
const { seedUser } = require('../src/db/seed');

describe('List parent children API', () => {
  let db;
  let app;
  let parent;
  let specialist;

  const jwtSecret = 'test-secret-for-list-children';

  function tokenFor(user) {
    return jwt.sign(
      { role: user.role },
      jwtSecret,
      {
        subject: String(user.id),
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );
  }

  function addChild(parentId, firstName) {
    const result = db.prepare(`
      INSERT INTO children (
        parent_id, first_name, last_name, date_of_birth, grade
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(parentId, firstName, 'Demo', '2017-05-10', '4');

    return Number(result.lastInsertRowid);
  }

  beforeEach(() => {
    db = createDatabase();
    seedUser(db);

    parent = db.prepare(
      "SELECT id, role FROM users WHERE role = 'parent'"
    ).get();

    specialist = db.prepare(
      "SELECT id, role FROM users WHERE role = 'specialist'"
    ).get();

    app = createApp(db, { jwtSecret });
  });

  afterEach(() => {
    db.close();
  });

  test('returns only the authenticated parent’s children', async () => {
    const otherParent = db.prepare(`
      INSERT INTO users (
        first_name, last_name, email, password_hash, role
      )
      SELECT 'Other', 'Parent', 'other@example.test',
             password_hash, 'parent'
      FROM users WHERE id = ?
    `).run(parent.id);

    const ownChildId = addChild(parent.id, 'Deniz');
    addChild(Number(otherParent.lastInsertRowid), 'Ece');

    const response = await request(app)
      .get('/api/children')
      .set('Authorization', `Bearer ${tokenFor(parent)}`);

    expect(response.status).toBe(200);
    expect(response.body.children).toHaveLength(1);
    expect(response.body.children[0]).toMatchObject({
      id: ownChildId,
      parent_id: parent.id,
      first_name: 'Deniz'
    });
  });

  test('returns an empty list when the parent has no children', async () => {
    const response = await request(app)
      .get('/api/children')
      .set('Authorization', `Bearer ${tokenFor(parent)}`);

    expect(response.status).toBe(200);
    expect(response.body.children).toEqual([]);
  });

  test('rejects a request without a token', async () => {
    const response = await request(app)
      .get('/api/children');

    expect(response.status).toBe(401);
  });

  test('rejects a specialist listing children through this endpoint', async () => {
    const response = await request(app)
      .get('/api/children')
      .set('Authorization', `Bearer ${tokenFor(specialist)}`);

    expect(response.status).toBe(403);
  });
});