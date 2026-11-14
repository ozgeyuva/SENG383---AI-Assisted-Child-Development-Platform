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

  function linkSpecialist(user, payload = body) {
    const token = jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: '1h',
      algorithm: 'HS256'
    });

    return request(app)
      .post(`/api/children/${childId}/specialists`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
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
    test.each([
    ['an unregistered email', 'unknown@example.test'],
    ['a parent account', 'parent@example.test']
  ])('rejects %s without creating a link', async (_label, email) => {
    const response = await linkSpecialist(parent, { ...body, email });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'No registered specialist found for this email'
    });
    expect(db.prepare('SELECT * FROM child_specialist_links').all())
      .toEqual([]);
  });
    test.each([
    ['removes a confirmed link for the owner', true, true, 204, 0],
    ['preserves the link when confirmation is false', false, true, 400, 1],
    ['preserves the link when confirmation is missing', undefined, true, 400, 1],
    ['preserves the link when another parent confirms', true, false, 403, 1]
  ])('%s', async (_name, confirmed, isOwner, expectedStatus, expectedCount) => {
    const created = await linkSpecialist(parent);
    expect(created.status).toBe(201);

    const { specialist_id } = created.body.link;
    let userId = parent.id;

    if (!isOwner) {
      const otherParent = db.prepare(`
        INSERT INTO users (first_name, last_name, email, password_hash, role)
        VALUES ('Other', 'Parent', 'other-parent@example.test', 'test-only', 'parent')
      `).run();
      userId = Number(otherParent.lastInsertRowid);
    }

    const token = jwt.sign({ role: 'parent' }, jwtSecret, {
      subject: String(userId),
      expiresIn: '1h',
      algorithm: 'HS256'
    });

    const response = await request(app)
      .delete(`/api/children/${childId}/specialists/${specialist_id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmed });

    expect(response.status).toBe(expectedStatus);

    const { count } = db.prepare(`
      SELECT COUNT(*) AS count FROM child_specialist_links
      WHERE child_id = ? AND specialist_id = ?
    `).get(childId, specialist_id);

    expect(count).toBe(expectedCount);
  });
});