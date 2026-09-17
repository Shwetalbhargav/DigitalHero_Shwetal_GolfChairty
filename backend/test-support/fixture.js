import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createDatabase } from '../src/config/db.js';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { createUserModel } from '../src/modules/users/user.model.js';
import { createScoreModel } from '../src/modules/scores/score.model.js';
import { createSubscriptionModel } from '../src/modules/subscriptions/subscription.model.js';
import { createPaymentModel } from '../src/modules/payments/payment.model.js';
import { createDrawModels } from '../src/modules/draws/draw.model.js';
import { createDrawService } from '../src/modules/draws/draw.service.js';
import { createWinnerModel } from '../src/modules/winners/winner.model.js';
import { createPayoutModel } from '../src/modules/payouts/payout.model.js';
import { createEvidenceModel } from '../src/modules/winners/evidence.model.js';
import { generateToken } from '../src/utils/generateToken.js';
export async function fixture() {
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.6' },
  });
  const config = parseEnv({
    NODE_ENV: 'test',
    MONGODB_URI: mongo.getUri(),
    CLIENT_ORIGIN: 'http://localhost:5173',
    AUTH_SECRET: 'isolated-fixture-secret-with-at-least-32-characters',
    PAYMENT_MODE: 'simulated',
    PROOF_STORAGE: 'local',
  });
  const database = createDatabase(config);
  await database.connect();
  const c = database.connection;
  const models = {
    ...createDrawModels(c),
    User: createUserModel(c),
    Charity: createCharityModel(c),
    Score: createScoreModel(c),
    Subscription: createSubscriptionModel(c),
    Payment: createPaymentModel(c),
    Winner: createWinnerModel(c),
    Payout: createPayoutModel(c),
    Evidence: createEvidenceModel(c),
  };
  await Promise.all(Object.values(models).map((model) => model.init()));
  const charity = await models.Charity.create({
    name: 'Fixture charity',
    slug: 'fixture-charity',
    description: 'Isolated fictional charity for automated tests.',
    category: 'youth',
    active: true,
  });
  async function user(name, role = 'member', values = [1, 2, 3, 4, 5]) {
    const record = await models.User.create({
      name,
      email: name.toLowerCase() + '@example.com',
      passwordHash: 'not-a-login-fixture',
      role,
      charity: charity._id,
      contributionPercent: 10,
    });
    const today = new Date();
    const month = today.toISOString().slice(0, 7);
    const payment = await models.Payment.create({
      user: record._id,
      key: name + '-fixture-payment-key',
      fingerprint: 'fixture',
      purpose: 'subscription',
      status: 'succeeded',
      amountMinor: 1900,
      currency: 'GBP',
      charity: charity._id,
      charityName: charity.name,
      contributionPercent: 10,
      prizePercent: 50,
      months: 1,
      plan: 'monthly',
      completedAt: today,
      allocations: [
        {
          period: month,
          revenueMinor: 1900,
          charityMinor: 190,
          prizeMinor: 950,
          platformMinor: 760,
        },
      ],
    });
    await models.Subscription.create({
      user: record._id,
      plan: 'monthly',
      periodStart: new Date(today.getTime() - 86400000),
      periodEnd: new Date(today.getTime() + 86400000 * 30),
      payment: payment._id,
    });
    if (values.length)
      await models.Score.insertMany(
        values.map((value, i) => ({
          user: record._id,
          value,
          roundDate: `2020-01-0${i + 1}`,
        })),
      );
    return {
      record,
      cookie: 'dh_session=' + generateToken(record, config.authSecret),
    };
  }
  const service = createDrawService(
    { ...models, config },
    { integer: () => 0 },
  );
  return {
    ...models,
    config,
    database,
    charity,
    user,
    service,
    app: createApp({ config, database }),
    stop: async () => {
      await database.disconnect();
      await mongo.stop();
    },
  };
}
