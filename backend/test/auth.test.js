import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createDatabase } from '../src/config/db.js';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { createUserModel } from '../src/modules/users/user.model.js';
import { requireAdmin } from '../src/middleware/admin.middleware.js';
let mongo, database, app, config, charity, User;
const origin = 'http://localhost:5173';
const secret = 'test-only-secret-with-at-least-32-characters';
const writes = (path) =>
  request(app)
    .post('/api/auth/' + path)
    .set('Origin', origin)
    .set('X-CSRF-Protection', '1');
before(async () => {
  mongo = await MongoMemoryServer.create();
  config = parseEnv({
    NODE_ENV: 'test',
    MONGODB_URI: mongo.getUri(),
    CLIENT_ORIGIN: origin,
    AUTH_SECRET: secret,
  });
  database = createDatabase(config);
  await database.connect();
  app = createApp({ config, database });
  const Charity = createCharityModel(database.connection);
  charity = await Charity.create({
    name: 'Test Charity',
    slug: 'test-charity',
    description: 'A charity used for authentication tests.',
    category: 'youth',
    active: true,
  });
  User = createUserModel(database.connection);
  await User.init();
});
after(async () => {
  await database?.disconnect();
  await mongo?.stop();
});
const signup = (email) => ({
  name: 'Member Name',
  email,
  password: 'long-test-password',
  charityId: String(charity._id),
  contributionPercent: 10,
});
test('register/login/me/logout normalize and revoke sessions without exposing secrets', async () => {
  const created = await writes('register')
    .send(signup('Member@Example.com'))
    .expect(201);
  assert.equal(created.body.data.user.email, 'member@example.com');
  assert.equal(created.body.data.user.role, 'member');
  assert.ok(!JSON.stringify(created.body).includes('passwordHash'));
  const cookie = created.headers['set-cookie'][0].split(';')[0];
  assert.match(created.headers['set-cookie'][0], /HttpOnly/);
  await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);
  await writes('register').send(signup('member@example.com')).expect(409);
  await writes('login')
    .send({ email: 'member@example.com', password: 'wrong' })
    .expect(401);
  await writes('login')
    .send({ email: ' MEMBER@example.com ', password: 'long-test-password' })
    .expect(200);
  await writes('logout').set('Cookie', cookie).send({}).expect(200);
  await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
});
test('role injection, charity and contribution validation and CSRF reject writes', async () => {
  await writes('register')
    .send({ ...signup('role@example.com'), role: 'admin' })
    .expect(400);
  await writes('register')
    .send({ ...signup('charity@example.com'), charityId: 'a'.repeat(24) })
    .expect(400);
  for (const contributionPercent of [9, 51, 10.5, '10'])
    await writes('register')
      .send({ ...signup('share@example.com'), contributionPercent })
      .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send(signup('csrf@example.com'))
    .expect(403);
  await request(app)
    .post('/api/auth/register')
    .set('Origin', origin)
    .send(signup('csrf@example.com'))
    .expect(403);
});
test('suspended users, expired and tampered JWTs, and non-admin access are rejected', async () => {
  const result = await writes('register')
    .send(signup('suspend@example.com'))
    .expect(201);
  const cookie = result.headers['set-cookie'][0].split(';')[0];
  await User.updateOne({ email: 'suspend@example.com' }, { suspended: true });
  await request(app).get('/api/auth/me').set('Cookie', cookie).expect(403);
  await writes('login')
    .send({ email: 'suspend@example.com', password: 'long-test-password' })
    .expect(403);
  await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookie + 'bad')
    .expect(401);
  const expired = jwt.sign(
    { sub: result.body.data.user.id, version: 0 },
    secret,
    { expiresIn: -1, issuer: 'digital-heroes', audience: 'digital-heroes-web' },
  );
  await request(app)
    .get('/api/auth/me')
    .set('Cookie', 'dh_session=' + expired)
    .expect(401);
  assert.throws(
    () => requireAdmin({ user: { role: 'member' } }, {}, () => {}),
    /Administrator/,
  );
});
