const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/db/database');
const { seedUser } = require('../src/db/seed');

describe('Child birth date boundaries', () => {
  let db;
  let app;
  let parentId;
  let token;

  const jwtSecret = 'test-secret-for-child-validation';

  beforeEach(() => {
    db = createDatabase();
    seedUser(db);

    const parent = db.prepare(
      "SELECT id FROM users WHERE role = 'parent'"
    ).get();

    parentId = parent.id;

    // Freeze only the clock; keep server timers working normally.
    jest.useFakeTimers({
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'performance',
        'hrtime',
        'queueMicrotask'
      ]
    });

    // Local calendar date: October 31, 2026.
    jest.setSystemTime(new Date(2026, 9, 31, 12, 0, 0));

    token = jwt.sign(
      { role: 'parent' },
      jwtSecret,
      {
        subject: String(parentId),
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    app = createApp(db, { jwtSecret });
  });

  afterEach(() => {
    jest.useRealTimers();
    db.close();
  });

  test.each([
    ['yesterday', '2026-10-30', 201],
    ['today', '2026-10-31', 201],
    ['tomorrow', '2026-11-01', 400]
  ])('validates %s as the birth date', async (_label, birthDate, status) => {
    const response = await request(app)
      .post('/api/children')
      .set('Authorization', `Bearer ${token}`)
      .send({
        first_name: 'Deniz',
        last_name: 'Demo',
        date_of_birth: birthDate,
        grade: '4'
      });

    expect(response.status).toBe(status);

    const children = db.prepare(
      'SELECT * FROM children'
    ).all();

    if (status === 201) {
      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({
        parent_id: parentId,
        date_of_birth: birthDate
      });
    } else {
      expect(children).toHaveLength(0);
      expect(response.body.error).toBe(
        'Date of birth cannot be in the future'
      );
    }
  });
});