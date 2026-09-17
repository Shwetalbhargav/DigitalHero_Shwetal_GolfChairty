import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createDatabase } from '../src/config/db.js';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { createPaymentModel } from '../src/modules/payments/payment.model.js';
let mongo, db, app, charity, inactive, cookie, Payment;
const origin = 'http://localhost:5173';
function write(method, path) {
  const client = request(app);
  return client[method]('/api' + path)
    .set('Origin', origin)
    .set('X-CSRF-Protection', '1')
    .set('Cookie', cookie || '');
}
before(async () => {
  mongo = await MongoMemoryServer.create();
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
  const Charity = createCharityModel(db.connection);
  charity = await Charity.create({
    name: 'Active Test',
    slug: 'active-test',
    description: 'A fictional charity for donation tests.',
    category: 'youth',
    active: true,
  });
  inactive = await Charity.create({
    name: 'Inactive Test',
    slug: 'inactive-test',
    description: 'A fictional charity for donation tests.',
    category: 'youth',
    active: false,
  });
  const response = await write('post', '/auth/register')
    .send({
      name: 'Donation Member',
      email: 'donor@example.com',
      password: 'long-test-password',
      charityId: String(charity._id),
      contributionPercent: 10,
    })
    .expect(201);
  cookie = response.headers['set-cookie'][0].split(';')[0];
  Payment = createPaymentModel(db.connection);
  await Payment.init();
});
after(async () => {
  await db?.disconnect();
  await mongo?.stop();
});
test('charity preferences enforce active recipients and contribution boundaries', async () => {
  for (const contributionPercent of [9, 51, 12.5])
    await write('patch', '/users/me/charity')
      .send({ charityId: String(charity._id), contributionPercent })
      .expect(400);
  await write('patch', '/users/me/charity')
    .send({ charityId: String(inactive._id), contributionPercent: 10 })
    .expect(400);
  await write('patch', '/users/me/charity')
    .send({ charityId: String(charity._id), contributionPercent: 50 })
    .expect(200);
});
test('concurrent donation requests and completion credit once, keep snapshots and confer no membership', async () => {
  const body = { charityId: String(charity._id), amountMinor: 1234 };
  const calls = await Promise.all(
    [1, 2, 3].map(() =>
      write('post', '/donations')
        .set('Idempotency-Key', 'same-donation-request-001')
        .send(body)
        .expect(201),
    ),
  );
  const id = calls[0].body.data.id;
  assert.ok(calls.every((res) => res.body.data.id === id));
  assert.equal(await Payment.countDocuments(), 1);
  await write('post', '/donations')
    .set('Idempotency-Key', 'same-donation-request-001')
    .send({ ...body, amountMinor: 2000 })
    .expect(409);
  await Promise.all(
    [1, 2, 3].map(() =>
      write('post', '/payments/' + id + '/process')
        .send({ scenario: 'approve' })
        .expect(200),
    ),
  );
  const record = await Payment.findById(id);
  assert.equal(record.attempts, 1);
  assert.equal(record.allocations.length, 1);
  assert.equal(record.allocations[0].charityMinor, 1234);
  assert.equal(record.allocations[0].prizeMinor, 0);
  await write('patch', '/users/me/charity')
    .send({ charityId: String(charity._id), contributionPercent: 20 })
    .expect(200);
  assert.equal((await Payment.findById(id)).contributionPercent, 100);
  const me = await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookie)
    .expect(200);
  assert.equal(me.body.data.subscription, null);
  await request(app)
    .get('/api/payments/' + id)
    .expect(401);
});
test('donation failure and retry are explicit, while production simulation is refused', async () => {
  const created = await write('post', '/donations')
    .set('Idempotency-Key', 'failed-donation-request-002')
    .send({ charityId: String(charity._id), amountMinor: 1000 })
    .expect(201);
  const path = '/payments/' + created.body.data.id;
  await write('post', path + '/process')
    .send({ scenario: 'decline' })
    .expect(200);
  assert.equal(
    (
      await write('post', path + '/process')
        .send({ scenario: 'approve' })
        .expect(200)
    ).body.data.status,
    'failed',
  );
  await write('post', path + '/retry')
    .send({})
    .expect(200);
  assert.equal(
    (
      await write('post', path + '/process')
        .send({ scenario: 'approve' })
        .expect(200)
    ).body.data.status,
    'succeeded',
  );
  assert.throws(
    () =>
      parseEnv({
        NODE_ENV: 'production',
        MONGODB_URI: mongo.getUri(),
        CLIENT_ORIGIN: origin,
        AUTH_SECRET: 'test-only-secret-with-at-least-32-characters',
        PAYMENT_MODE: 'simulated',
      }),
    /forbidden in production/,
  );
});
