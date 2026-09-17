import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { createUserModel } from '../src/modules/users/user.model.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { createScoreModel } from '../src/modules/scores/score.model.js';
import { createSubscriptionModel } from '../src/modules/subscriptions/subscription.model.js';
import { createPaymentModel } from '../src/modules/payments/payment.model.js';
import { createDrawModels } from '../src/modules/draws/draw.model.js';
import { createDrawService } from '../src/modules/draws/draw.service.js';
import { createWinnerModel } from '../src/modules/winners/winner.model.js';
import { createPayoutModel } from '../src/modules/payouts/payout.model.js';
import { createEvidenceModel } from '../src/modules/winners/evidence.model.js';
import { createEvidenceStorage } from '../src/modules/winners/evidence.storage.js';
import { createWinnerService } from '../src/modules/winners/winner.service.js';
import { allocatePayment, addMonths } from '../src/modules/subscriptions/subscription.service.js';

// Public credentials belong exclusively to this disposable test database.
export async function seedOperationsFixture(database, config) {
  if (config.nodeEnv !== 'test') throw new Error('Operations fixtures require isolated test mode.');
  const c = database.connection;
  const models = { ...createDrawModels(c), User: createUserModel(c), Charity: createCharityModel(c), Score: createScoreModel(c), Subscription: createSubscriptionModel(c), Payment: createPaymentModel(c), Winner: createWinnerModel(c), Payout: createPayoutModel(c) };
  await Promise.all(Object.values(models).map((model) => model.init()));
  const charities = await models.Charity.find({ active: true }).sort({ name: 1 });
  const passwordHash = await bcrypt.hash('local-browser-fixture-password', 12);
  const now = new Date();
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 12));
  const admin = await models.User.create({ name: 'Operations Admin', email: 'operations-admin@example.test', passwordHash, role: 'admin', charity: charities[0]._id, contributionPercent: 10 });
  const fixtures = [
    ['Operations Member', 'operations-member@example.test', [1, 2, 3, 4, 5], 'unsubmitted'],
    ['Aarav Mehta', 'aarav@example.test', [1, 2, 3, 4, 12], 'pending'],
    ['Riya Sharma', 'riya@example.test', [1, 2, 3, 18, 24], 'rejected'],
    ['Kabir Patel', 'kabir@example.test', [1, 2, 3, 4, 20], 'approved'],
    ['Meera Nair', 'meera@example.test', [1, 2, 3, 4, 5], 'paid'],
    ['Dev Kapoor', 'dev@example.test', [9, 16, 23, 30, 37], 'none'],
  ];
  const members = [];
  for (const [index, [name, email, values, state]] of fixtures.entries()) {
    const charity = charities[index % charities.length];
    const member = await models.User.create({ name, email, passwordHash, charity: charity._id, contributionPercent: 10 + (index % 3) * 5 });
    await models.User.collection.updateOne({ _id: member._id }, { $set: { createdAt: previous } });
    await models.Score.insertMany(values.map((value, i) => ({ user: member._id, value, roundDate: '2020-01-0' + (i + 1) })));
    const allocation = { amountMinor: 19000, months: 12, contributionPercent: member.contributionPercent, prizePercent: 50 };
    const payment = await models.Payment.create({ user: member._id, key: 'fixture-' + index, fingerprint: 'fixture-' + index, purpose: 'subscription', status: 'succeeded', mode: 'simulated', ...allocation, currency: 'GBP', charity: charity._id, charityName: charity.name, plan: 'yearly', completedAt: previous, allocations: allocatePayment(allocation, previous) });
    await models.Subscription.create({ user: member._id, plan: 'yearly', periodStart: previous, periodEnd: addMonths(previous, 12), payment: payment._id });
    members.push({ member, state });
  }
  const draws = createDrawService({ ...models, config }, { integer: () => 0, now: () => cutoff });
  const draft = await draws.create({ month: previous.toISOString().slice(0, 7), strategy: 'random', scheduledAt: cutoff.toISOString() });
  const preview = await draws.simulate(draft.id, {});
  await draws.publish(draft.id, { previewVersion: preview.previewVersion });
  const Evidence = createEvidenceModel(c);
  const winners = createWinnerService({ ...models, Evidence, storage: createEvidenceStorage(Evidence, config), config });
  for (const { member, state } of members) {
    if (['none', 'unsubmitted'].includes(state)) continue;
    const winner = await models.Winner.findOne({ user: member._id });
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#e6f2e9"/><text x="45" y="80" font-size="32" fill="#004a36">FICTIONAL DEMO SCORECARD</text><text x="45" y="150" font-size="24">' + member.name + '</text><text x="45" y="220" font-size="24">' + winner.entry.scores.map((s) => s.value).join(' / ') + '</text><text x="45" y="310" font-size="22">For local review only - no real winnings.</text></svg>';
    const proof = await sharp(Buffer.from(svg)).png().toBuffer();
    const submitted = await winners.submit(String(winner._id), member, proof, 'image/png');
    if (state !== 'pending') await winners.review(String(winner._id), { decision: state === 'rejected' ? 'rejected' : 'approved', reason: state === 'rejected' ? 'Please include all score dates in your image.' : 'Demo evidence reviewed', revision: submitted.revision }, admin);
    if (state === 'paid') await winners.pay(String(winner._id), { mode: 'simulated', reference: 'DEMO-PAID-MEERA' }, admin);
  }
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15, 12));
  await createDrawService({ ...models, config }).create({ month: next.toISOString().slice(0, 7), strategy: 'weighted', scheduledAt: next.toISOString(), cutoffAt: new Date(next.getTime() - 86400000).toISOString() });
  const lapsed = await models.User.create({ name: 'Lapsed Demo Member', email: 'lapsed@example.test', passwordHash, charity: charities[0]._id, contributionPercent: 10 });
  await models.Subscription.create({ user: lapsed._id, plan: 'monthly', periodStart: addMonths(previous, -1), periodEnd: previous });
  return { admin: admin.email, members: members.map(({ member }) => member.email), draw: draft.id };
}

