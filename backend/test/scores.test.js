import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createDatabase } from '../src/config/db.js';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { createScoreModel } from '../src/modules/scores/score.model.js';
import { createSubscriptionModel } from '../src/modules/subscriptions/subscription.model.js';
import { createUserService } from '../src/modules/users/user.service.js';
let mongo, db, app, Score, Subscription, users;
const origin = 'http://localhost:5173';
function write(method, path, user = users[0]) {
  const client = request(app);
  return client[method]('/api/scores' + path)
    .set('Origin', origin)
    .set('X-CSRF-Protection', '1')
    .set('Cookie', user.cookie);
}
async function list(user = users[0]) {
  return (
    await request(app).get('/api/scores').set('Cookie', user.cookie).expect(200)
  ).body.data;
}
before(
  async () => {
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: { version: '8.2.6' },
    });
    const config = parseEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongo.getUri(),
      CLIENT_ORIGIN: origin,
      AUTH_SECRET: 'test-only-secret-with-at-least-32-characters',
      PAYMENT_MODE: 'simulated',
    });
    db = createDatabase(config);
    await db.connect();
    app = createApp({ config, database: db });
    const charity = await createCharityModel(db.connection).create({
      name: 'Score Test Charity',
      slug: 'score-test-charity',
      description: 'A fictional charity for score tests.',
      category: 'youth',
      active: true,
    });
    Score = createScoreModel(db.connection);
    Subscription = createSubscriptionModel(db.connection);
    await Promise.all([Score.init(), Subscription.init()]);
    users = [];
    for (const number of [1, 2]) {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Origin', origin)
        .set('X-CSRF-Protection', '1')
        .send({
          name: 'Score User',
          email: `scores${number}@example.com`,
          password: 'long-test-password',
          charityId: String(charity._id),
          contributionPercent: 10,
        })
        .expect(201);
      users.push({
        id: res.body.data.user.id,
        cookie: res.headers['set-cookie'][0].split(';')[0],
      });
    }
  },
  { timeout: 180000 },
);
beforeEach(async () => {
  await Score.deleteMany({});
  await Subscription.deleteMany({});
  for (const user of users)
    await Subscription.create({
      user: user.id,
      plan: 'yearly',
      periodStart: new Date('2000-01-01'),
      periodEnd: new Date('2099-01-01'),
      payment: user.id,
    });
});
after(async () => {
  await db?.disconnect();
  await mongo?.stop();
});
test('profile persists only allowed fields; lapsed dashboard stays owned and reflects source records', async () => {
  const patch = (body) =>
    request(app)
      .patch('/api/users/me')
      .set('Origin', origin)
      .set('X-CSRF-Protection', '1')
      .set('Cookie', users[0].cookie)
      .send(body);
  for (const body of [
    { role: 'admin' },
    { name: 'Updated', role: 'admin' },
    { email: 'other@example.com' },
    { suspended: false },
    { name: 'A' },
    { displayDateFormat: 'anything' },
    {},
  ])
    await patch(body).expect(400);
  await patch({ name: 'Updated Member', displayDateFormat: 'iso' }).expect(200);
  const me = (
    await request(app)
      .get('/api/auth/me')
      .set('Cookie', users[0].cookie)
      .expect(200)
  ).body.data.user;
  assert.equal(me.name, 'Updated Member');
  assert.equal(me.displayDateFormat, 'iso');
  assert.equal(me.role, 'member');
  await write('post', '')
    .send({ value: 37, roundDate: '2020-01-01' })
    .expect(201);
  await Subscription.updateOne(
    { user: users[0].id },
    { periodEnd: new Date('2001-01-01') },
  );
  const dashboard = (
    await request(app)
      .get('/api/users/me/dashboard')
      .set('Cookie', users[0].cookie)
      .expect(200)
  ).body.data;
  assert.equal(dashboard.subscription.data.status, 'lapsed');
  assert.equal(dashboard.scores.data.items[0].value, 37);
  assert.equal(dashboard.charity.data.contributionPercent, 10);
  assert.equal(dashboard.charity.data.name, 'Score Test Charity');
  assert.equal(dashboard.upcomingDraw.data, null);
  assert.equal(dashboard.participation.count, 0);
  assert.deepEqual(dashboard.winnings.data.totals, []);
  const other = (
    await request(app)
      .get('/api/users/me/dashboard')
      .set('Cookie', users[1].cookie)
      .expect(200)
  ).body.data;
  assert.equal(other.scores.data.count, 0);
  assert.equal(other.user.name, 'Score User');
  await patch({ name: 'Still reachable' }).expect(200);
  await request(app).get('/api/users/me/dashboard').expect(401);
});
test('dashboard isolates a failed section and never exposes its internal error', async () => {
  const Charity = {
    findById: () => ({
      select: () => ({
        lean: async () => {
          throw new Error('private-database-connection');
        },
      }),
    }),
  };
  const Score = {
    find: () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            { _id: 'score-1', value: 20, roundDate: '2020-01-01' },
          ],
        }),
      }),
    }),
  };
  const service = createUserService(
    null,
    Charity,
    {},
    { Score, subscriptions: { current: async () => null } },
  );
  const data = await service.dashboard({
    _id: 'user-1',
    name: 'Alex',
    email: 'alex@example.com',
    role: 'member',
    charity: 'charity-1',
    contributionPercent: 10,
  });
  assert.equal(data.charity.status, 'error');
  assert.equal(data.scores.status, 'ready');
  assert.equal(data.scores.data.count, 1);
  assert.equal(data.subscription.status, 'ready');
  assert.ok(!JSON.stringify(data).includes('private-database-connection'));
});
test('values 1 and 45 succeed; 0,46,decimals,strings and invalid dates fail', async () => {
  for (const value of [0, 46, 1.5, '10', null])
    await write('post', '')
      .send({ value, roundDate: '2020-01-01' })
      .expect(400);
  for (const roundDate of [
    '2025-02-29',
    '2024-02-30',
    '2020-1-01',
    '2099-01-01',
    '2020-01-01T00:00:00Z',
  ])
    await write('post', '').send({ value: 20, roundDate }).expect(400);
  await write('post', '')
    .send({ value: 1, roundDate: '2024-02-29' })
    .expect(201);
  await write('post', '')
    .send({ value: 45, roundDate: '2024-03-01' })
    .expect(201);
  const result = await list();
  assert.deepEqual(
    result.items.map((s) => s.value),
    [45, 1],
  );
  assert.equal(result.remaining, 3);
});
test('duplicates, owned IDs, edits and delete enforce isolation and date order', async () => {
  const a = (
    await write('post', '')
      .send({ value: 20, roundDate: '2020-01-01' })
      .expect(201)
  ).body.data.score;
  const b = (
    await write('post', '')
      .send({ value: 25, roundDate: '2020-01-03' })
      .expect(201)
  ).body.data.score;
  await write('post', '')
    .send({ value: 30, roundDate: '2020-01-01' })
    .expect(409);
  await write('post', '', users[1])
    .send({ value: 30, roundDate: '2020-01-01' })
    .expect(201);
  await write('patch', '/' + a.id, users[1])
    .send({ value: 30 })
    .expect(404);
  await write('delete', '/' + a.id, users[1]).expect(404);
  await write('patch', '/' + a.id)
    .send({ roundDate: '2020-01-03' })
    .expect(409);
  await write('patch', '/' + a.id)
    .send({ roundDate: '2020-01-04', value: 45 })
    .expect(200);
  assert.deepEqual(
    (await list()).items.map((s) => s.id),
    [a.id, b.id],
  );
  await write('delete', '/' + a.id).expect(200);
  assert.equal((await list()).count, 1);
  assert.equal((await list(users[1])).count, 1);
  await write('patch', '/bad').send({ value: 20 }).expect(400);
});
test('sixth score evicts oldest atomically and older full-set insert is rejected', async () => {
  for (let day = 1; day <= 5; day++)
    await write('post', '')
      .send({ value: day, roundDate: `2020-01-0${day}` })
      .expect(201);
  const oldest = (await list()).items.at(-1).id;
  const added = await write('post', '')
    .send({ value: 6, roundDate: '2020-01-06' })
    .expect(201);
  assert.equal(added.body.data.evictedId, oldest);
  assert.deepEqual(
    (await list()).items.map((s) => s.value),
    [6, 5, 4, 3, 2],
  );
  await write('post', '')
    .send({ value: 7, roundDate: '2019-12-31' })
    .expect(400);
  assert.equal(await Score.countDocuments({ user: users[0].id }), 5);
});
test('concurrent inserts serialize per user with no committed six-score state', async () => {
  for (let day = 1; day <= 4; day++)
    await write('post', '')
      .send({ value: day, roundDate: `2020-01-0${day}` })
      .expect(201);
  let done = false;
  const observed = [];
  const writes = Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      write('post', '').send({
        value: index + 10,
        roundDate: `2020-01-${String(index + 5).padStart(2, '0')}`,
      }),
    ),
  ).finally(() => {
    done = true;
  });
  while (!done)
    observed.push(await Score.countDocuments({ user: users[0].id }));
  const responses = await writes;
  assert.ok(responses.every((res) => [201, 400].includes(res.status)));
  assert.ok(observed.every((count) => count <= 5));
  assert.deepEqual(
    (await list()).items.map((s) => s.roundDate),
    ['2020-01-12', '2020-01-11', '2020-01-10', '2020-01-09', '2020-01-08'],
  );
  const duplicates = await Promise.all(
    [1, 2, 3].map(() =>
      write('post', '', users[1]).send({ value: 20, roundDate: '2020-01-01' }),
    ),
  );
  assert.deepEqual(duplicates.map((res) => res.status).sort(), [201, 409, 409]);
});
test('lapse blocks every mutation but preserves read access and empty states', async () => {
  const score = (
    await write('post', '').send({ value: 20, roundDate: '2020-01-01' })
  ).body.data.score;
  await Subscription.updateOne(
    { user: users[0].id },
    { periodEnd: new Date('2001-01-01') },
  );
  await write('post', '')
    .send({ value: 21, roundDate: '2020-01-02' })
    .expect(403);
  await write('patch', '/' + score.id)
    .send({ value: 22 })
    .expect(403);
  await write('delete', '/' + score.id).expect(403);
  assert.equal((await list()).count, 1);
  assert.equal((await list(users[1])).count, 0);
});
