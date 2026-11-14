const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');
const { seedUser, seedChildren } = require('../src/db/seed');

describe('Specialist link lists', () => {
  const jwtSecret = 'test-secret-for-specialist-link-lists';
  const specialistChildrenPath = '/api/specialists/me/children';

  let db;
  let app;
  let parent;
  let specialist;
  let child;

  function getAs(path, user) {
    const token = jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: '1h',
      algorithm: 'HS256'
    });

    return request(app).get(path).set('Authorization', `Bearer ${token}`);
  }

  function addLink(childId, specialistId) {
    db.prepare(`
      INSERT INTO child_specialist_links (child_id, specialist_id, specialist_type)
      VALUES (?, ?, 'Teacher')
    `).run(childId, specialistId);
  }

  beforeEach(() => {
    db = createDatabase();
    seedUser(db);
    seedChildren(db);

    const findUser = db.prepare('SELECT id, role FROM users WHERE email = ?');
    parent = findUser.get('parent@example.test');
    specialist = findUser.get('specialist@example.test');

    child = db.prepare(`
      SELECT id, first_name, last_name, date_of_birth, grade
      FROM children WHERE parent_id = ?
    `).get(parent.id);

    app = createApp(db, { jwtSecret });
  });

  afterEach(() => db?.close());

  test('lists the specialists linked to the parent’s child', async () => {
    addLink(child.id, specialist.id);

    const response = await getAs(`/api/children/${child.id}/specialists`, parent);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      specialists: [{
        specialist_id: specialist.id,
        first_name: 'Demo',
        last_name: 'Specialist',
        email: 'specialist@example.test',
        specialist_type: 'Teacher'
      }]
    });
  });

  test('returns an empty specialist list when the child has no links', async () => {
    const response = await getAs(`/api/children/${child.id}/specialists`, parent);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ specialists: [] });
  });

  test('rejects an invalid child ID', async () => {
    const response = await getAs('/api/children/abc/specialists', parent);

    expect(response.status).toBe(400);
  });

  test('denies access to another parent’s specialist list', async () => {
    addLink(child.id, specialist.id);

    const result = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Other', 'Parent', 'other-parent@example.test', 'test-only', 'parent')
    `).run();

    const response = await getAs(`/api/children/${child.id}/specialists`, {
      id: Number(result.lastInsertRowid),
      role: 'parent'
    });

    expect(response.status).toBe(403);
  });

  test('lists only the children linked to the signed-in specialist', async () => {
    addLink(child.id, specialist.id);

    const otherSpecialist = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Other', 'Specialist', 'other-specialist@example.test', 'test-only', 'specialist')
    `).run();

    const otherChild = db.prepare(`
      INSERT INTO children (parent_id, first_name, last_name, date_of_birth, grade)
      VALUES (?, 'Ece', 'Demo', '2018-05-10', '3')
    `).run(parent.id);

    addLink(otherChild.lastInsertRowid, otherSpecialist.lastInsertRowid);

    const response = await getAs(specialistChildrenPath, specialist);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      children: [{ ...child, specialist_type: 'Teacher' }]
    });
  });

  test('returns an empty child list when the specialist has no links', async () => {
    const response = await getAs(specialistChildrenPath, specialist);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ children: [] });
  });

  test('denies a parent access to the specialist’s child list', async () => {
    const response = await getAs(specialistChildrenPath, parent);

    expect(response.status).toBe(403);
  });

  test('requires authentication on both list endpoints', async () => {
    const parentList = await request(app).get(`/api/children/${child.id}/specialists`);
    const specialistList = await request(app).get(specialistChildrenPath);

    expect(parentList.status).toBe(401);
    expect(specialistList.status).toBe(401);
  });
});