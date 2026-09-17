import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createDatabase } from '../src/config/db.js';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { createPaymentModel } from '../src/modules/payments/payment.model.js';
import { createSubscriptionModel } from '../src/modules/subscriptions/subscription.model.js';
import {
  addMonths,
  allocatePayment,
} from '../src/modules/subscriptions/subscription.service.js';
let mongo, db, app, charity, Subscription, Payment;
const origin = 'http://localhost:5173';
const base = {
  NODE_ENV: 'test',
  CLIENT_ORIGIN: origin,
  AUTH_SECRET: 'test-only-secret-with-at-least-32-characters',
  PAYMENT_MODE: 'simulated',
};
function post(path, cookie) {
  return request(app)
    .post('/api' + path)
    .set('Origin', origin)
    .set('X-CSRF-Protection', '1')
    .set('Cookie', cookie || '');
}
async function member(email) {
  const res = await post('/auth/register')
    .send({
      name: 'Billing Member',
      email,
      password: 'long-test-password',
      charityId: String(charity._id),
      contributionPercent: 15,
    })
    .expect(201);
  return {
    id: res.body.data.user.id,
    cookie: res.headers['set-cookie'][0].split(';')[0],
  };
}
async function checkout(user, plan, key, renew = false) {
  return (
    await post('/subscriptions/' + (renew ? 'renew' : 'checkout'), user.cookie)
      .set('Idempotency-Key', key)
      .send({ plan })
      .expect(201)
  ).body.data;
}
before(
  async () => {
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: { version: '8.2.6' },
    });
    const config = parseEnv({ ...base, MONGODB_URI: mongo.getUri() });
    db = createDatabase(config);
    await db.connect();
    app = createApp({ config, database: db });
    const Charity = createCharityModel(db.connection);
    charity = await Charity.create({
      name: 'Billing Charity',
      slug: 'billing-charity',
      description: 'A fictional charity used for subscription tests.',
      category: 'youth',
      active: true,
    });
    Subscription = createSubscriptionModel(db.connection);
    Payment = createPaymentModel(db.connection);
    await Promise.all([Subscription.init(), Payment.init()]);
  },
  { timeout: 180000 },
);
after(async () => {
  await db?.disconnect();
  await mongo?.stop();
});
test('plan amounts and discounts are server configured; invalid plans and client amounts fail', async () => {
  const plans = (await request(app).get('/api/subscriptions/plans').expect(200))
    .body.data;
  assert.equal(plans.plans[0].amountMinor, 1900);
  assert.equal(plans.plans[1].amountMinor, 19000);
  const user = await member('plans@example.com');
  await post('/subscriptions/checkout', user.cookie)
    .set('Idempotency-Key', 'invalid-plan-request')
    .send({ plan: 'free' })
    .expect(400);
  await post('/subscriptions/checkout', user.cookie)
    .set('Idempotency-Key', 'invalid-plan-request')
    .send({ plan: 'monthly', amountMinor: 1 })
    .expect(400);
  assert.throws(
    () =>
      parseEnv({
        ...base,
        MONGODB_URI: mongo.getUri(),
        MONTHLY_PRICE_MINOR: '100',
        YEARLY_PRICE_MINOR: '1200',
      }),
    /discounted/,
  );
});
test('monthly failure, explicit retry and concurrent approval activate exactly once', async () => {
  const user = await member('monthly@example.com');
  const payment = await checkout(user, 'monthly', 'monthly-checkout-key');
  const path = '/payments/' + payment.id;
  await post(path + '/process', user.cookie)
    .send({ scenario: 'decline' })
    .expect(200);
  assert.equal(await Subscription.countDocuments({ user: user.id }), 0);
  await Promise.all(
    [1, 2].map(() =>
      post(path + '/retry', user.cookie)
        .send({})
        .expect(200),
    ),
  );
  await Promise.all(
    [1, 2, 3].map(() =>
      post(path + '/process', user.cookie)
        .send({ scenario: 'approve' })
        .expect(200),
    ),
  );
  const record = await Payment.findById(payment.id);
  assert.equal(record.status, 'succeeded');
  assert.equal(record.attempts, 2);
  assert.equal(record.allocations.length, 1);
  const subscription = await Subscription.findOne({ user: user.id });
  assert.ok(subscription);
  assert.equal(String(subscription.payment), payment.id);
  const end = subscription.periodEnd.toISOString();
  await post(path + '/process', user.cookie)
    .send({ scenario: 'approve' })
    .expect(200);
  assert.equal(
    (await Subscription.findById(subscription._id)).periodEnd.toISOString(),
    end,
  );
  await post('/scores', user.cookie)
    .send({ value: 20, roundDate: '2020-01-01' })
    .expect(201);
  await post('/subscriptions/cancel', user.cookie).send({}).expect(200);
  const me = (
    await request(app)
      .get('/api/auth/me')
      .set('Cookie', user.cookie)
      .expect(200)
  ).body.data;
  assert.equal(me.subscription.active, true);
  assert.equal(me.subscription.cancelAtPeriodEnd, true);
  await Subscription.updateOne(
    { user: user.id },
    { periodStart: new Date('2000-01-01'), periodEnd: new Date('2000-02-01') },
  );
  await post('/scores', user.cookie).send({ score: 20 }).expect(403);
  const lapsed = (
    await request(app)
      .get('/api/subscriptions/me')
      .set('Cookie', user.cookie)
      .expect(200)
  ).body.data.subscription;
  assert.equal(lapsed.status, 'lapsed');
  const renewal = await checkout(user, 'monthly', 'monthly-renewal-key', true);
  await post('/payments/' + renewal.id + '/process', user.cookie)
    .send({ scenario: 'approve' })
    .expect(200);
  assert.equal(
    (await request(app).get('/api/auth/me').set('Cookie', user.cookie)).body
      .data.subscription.active,
    true,
  );
});
test('yearly revenue splits into twelve conserving rows; duplicate checkout and competing payment cannot double activate', async () => {
  const user = await member('yearly@example.com');
  const payment = await checkout(user, 'yearly', 'yearly-checkout-key');
  assert.equal(
    (await checkout(user, 'yearly', 'yearly-checkout-key')).id,
    payment.id,
  );
  const competing = await checkout(user, 'monthly', 'competing-checkout-key');
  await post('/payments/' + payment.id + '/process', user.cookie)
    .send({ scenario: 'approve' })
    .expect(200);
  await post('/payments/' + competing.id + '/process', user.cookie)
    .send({ scenario: 'approve' })
    .expect(409);
  const record = await Payment.findById(payment.id);
  assert.equal(record.allocations.length, 12);
  assert.equal(
    record.allocations.reduce((sum, row) => sum + row.revenueMinor, 0),
    19000,
  );
  for (const row of record.allocations) {
    assert.equal(
      row.charityMinor + row.prizeMinor + row.platformMinor,
      row.revenueMinor,
    );
    assert.ok(row.platformMinor >= 0);
  }
  const other = await member('other@example.com');
  await request(app)
    .get('/api/payments/' + payment.id)
    .set('Cookie', other.cookie)
    .expect(404);
});
test('calendar month ends, annual rounding and disabled provider fail safely', async () => {
  assert.equal(
    addMonths(new Date('2024-01-31T12:00:00Z'), 1).toISOString(),
    '2024-02-29T12:00:00.000Z',
  );
  assert.equal(
    addMonths(new Date('2024-02-29T12:00:00Z'), 12).toISOString(),
    '2025-02-28T12:00:00.000Z',
  );
  const rows = allocatePayment(
    {
      months: 12,
      amountMinor: 19001,
      contributionPercent: 50,
      prizePercent: 50,
    },
    new Date('2024-01-31'),
  );
  assert.equal(
    rows.reduce((sum, row) => sum + row.revenueMinor, 0),
    19001,
  );
  assert.ok(rows.every((row) => row.platformMinor >= 0));
  const user = await member('expired@example.com');
  const payment = await checkout(user, 'yearly', 'expired-checkout-key');
  await Payment.updateOne(
    { _id: payment.id },
    { expiresAt: new Date('2000-01-01') },
  );
  await post('/payments/' + payment.id + '/process', user.cookie)
    .send({ scenario: 'approve' })
    .expect(409);
  const disabledApp = createApp({
    database: db,
    config: parseEnv({
      ...base,
      MONGODB_URI: mongo.getUri(),
      PAYMENT_MODE: 'disabled',
    }),
  });
  await request(disabledApp)
    .post('/api/payments/' + payment.id + '/process')
    .set('Origin', origin)
    .set('X-CSRF-Protection', '1')
    .set('Cookie', user.cookie)
    .send({ scenario: 'approve' })
    .expect(503);
});
