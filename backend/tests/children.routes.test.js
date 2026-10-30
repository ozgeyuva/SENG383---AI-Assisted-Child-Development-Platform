const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');
const { seedUser } = require('../src/db/seed');

describe('Create child API', () => {
  let db;
  let app;
  let parent;
  let specialist;

  const jwtSecret = 'test-secret-for-children-api';

  const validChild = {
    first_name: 'Deniz',
    last_name: 'Demo',
    date_of_birth: '2017-05-10',
    grade: '4'
  };

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

  test('creates a child linked to the authenticated parent', async () => {
    const response = await request(app)
      .post('/api/children')
      .set('Authorization', `Bearer ${tokenFor(parent)}`)
      .send({
        ...validChild,
        parent_id: specialist.id
      });

    expect(response.status).toBe(201);
    expect(response.body.child).toMatchObject({
      ...validChild,
      parent_id: parent.id
    });

    const savedChild = db.prepare(
      'SELECT * FROM children WHERE id = ?'
    ).get(response.body.child.id);

    expect(savedChild.parent_id).toBe(parent.id);
  });

  test('rejects a request without a token', async () => {
    const response = await request(app)
      .post('/api/children')
      .send(validChild);

    expect(response.status).toBe(401);
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM children').get().total
    ).toBe(0);
  });

  test('rejects a specialist creating a child', async () => {
    const response = await request(app)
      .post('/api/children')
      .set('Authorization', `Bearer ${tokenFor(specialist)}`)
      .send(validChild);

    expect(response.status).toBe(403);
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM children').get().total
    ).toBe(0);
  });

  test.each([
  ['missing first name', { first_name: undefined }],
  ['missing last name', { last_name: undefined }],
  ['missing birth date', { date_of_birth: undefined }],
  ['missing grade', { grade: undefined }],
  ['blank first name', { first_name: '   ' }],
  ['blank last name', { last_name: '   ' }],
  ['blank birth date', { date_of_birth: '   ' }],
  ['blank grade', { grade: '   ' }],
  ['non-text grade', { grade: 4 }],
  ['null first name', { first_name: null }],
  ['invalid date format', { date_of_birth: '10/05/2017' }],
  ['invalid date', { date_of_birth: '2017-02-30' }],
  ['future date', { date_of_birth: '9999-12-31' }]
])

  ('rejects %s without saving a child', async (_name, changes) => {
    const response = await request(app)
      .post('/api/children')
      .set('Authorization', `Bearer ${tokenFor(parent)}`)
      .send({ ...validChild, ...changes });

    expect(response.status).toBe(400);
    expect(
      db.prepare('SELECT COUNT(*) AS total FROM children').get().total
    ).toBe(0);
  });
});