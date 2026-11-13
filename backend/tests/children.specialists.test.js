const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');
const { seedUser, seedChildren } = require('../src/db/seed');

describe('POST /api/children/:childId/specialists', () => {
  const jwtSecret = 'test-secret-for-specialist-links';
  const body = {
    email: 'specialist@example.test',
    specialist_type: 'Teacher'
  };

  let db;
  let app;
  let parent;
  let childId;

  function linkSpecialist(user) {
    const token = jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: '1h',
      algorithm: 'HS256'
    });

    return request(app)
      .post(`/api/children/${childId}/specialists`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  beforeEach(() => {
    db = createDatabase();
    seedUser(db);
    seedChildren(db);

    parent = db.prepare('SELECT id, role FROM users WHERE email = ?')
      .get('parent@example.test');

    childId = db.prepare('SELECT id FROM children WHERE parent_id = ?')
      .get(parent.id).id;

    app = createApp(db, { jwtSecret });
  });

  afterEach(() => db?.close());

  test('links a registered specialist to the parent’s child', async () => {
    const response = await linkSpecialist(parent);

    expect(response.status).toBe(201);

    const specialist = db.prepare('SELECT id FROM users WHERE email = ?')
      .get(body.email);

    const expectedLink = {
      child_id: childId,
      specialist_id: specialist.id,
      specialist_type: 'Teacher'
    };

    expect(response.body).toEqual({ link: expectedLink });
    expect(db.prepare('SELECT * FROM child_specialist_links').all())
      .toEqual([expectedLink]);
  });

  test('rejects a different parent without creating a link', async () => {
    const result = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Other', 'Parent', 'other-parent@example.test', 'test-only', 'parent')
    `).run();

    const response = await linkSpecialist({
      id: Number(result.lastInsertRowid),
      role: 'parent'
    });

    expect(response.status).toBe(403);
    expect(db.prepare('SELECT * FROM child_specialist_links').all())
      .toEqual([]);
  });

  test('rejects a duplicate link and keeps only one record', async () => {
    const first = await linkSpecialist(parent);
    expect(first.status).toBe(201);

    const second = await linkSpecialist(parent);
    expect(second.status).toBe(409);

    expect(db.prepare('SELECT * FROM child_specialist_links').all())
      .toEqual([first.body.link]);
  });
});