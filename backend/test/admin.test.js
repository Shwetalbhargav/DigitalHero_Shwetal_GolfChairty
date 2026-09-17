import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
import { fixture } from '../test-support/fixture.js';
import { createAuditModel } from '../src/modules/admin/audit.model.js';
import { createDrawService } from '../src/modules/draws/draw.service.js';
let f, admin, member, second;
function call(method, path, user = admin) {
  const agent = request(f.app);
  return agent[method]('/api' + path)
    .set('Cookie', user.cookie)
    .set('Origin', f.config.clientOrigin)
    .set('X-CSRF-Protection', '1');
}
before(
  async () => {
    f = await fixture();
    admin = await f.user('Administrator', 'admin', []);
    member = await f.user('Subscriber');
  },
  { timeout: 180000 },
);
after(async () => f?.stop());
test('admin users enforce role, audit profile/score changes and guard the final administrator', async () => {
  await call('get', '/admin/users', member).expect(403);
  await call('patch', '/admin/users/' + member.record._id, member)
    .send({ name: 'No access', reason: 'test' })
    .expect(403);
  await call('patch', '/admin/users/' + admin.record._id)
    .send({ suspended: true, reason: 'Self suspension' })
    .expect(409);
  await call('patch', '/admin/users/' + admin.record._id)
    .send({ role: 'member', reason: 'Final admin demotion' })
    .expect(409);
  await call('patch', '/admin/users/' + member.record._id)
    .send({
      name: 'Corrected Member',
      passwordHash: 'injected',
      reason: 'Not allowed',
    })
    .expect(400);
  await call('patch', '/admin/users/' + member.record._id)
    .send({ name: 'Corrected Member', reason: 'Correct spelling' })
    .expect(200);
  const score = await f.Score.findOne({ user: member.record._id, value: 1 });
  await call('patch', `/admin/users/${member.record._id}/scores/${score._id}`)
    .send({ value: 45, reason: 'Verified scorecard correction' })
    .expect(200);
  await call('patch', `/admin/users/${member.record._id}/scores/${score._id}`)
    .send({ roundDate: '2020-01-02', reason: 'Duplicate date test' })
    .expect(409);
  const detail = (await call('get', '/admin/users/' + member.record._id)).body
    .data;
  assert.equal(detail.user.name, 'Corrected Member');
  assert.equal(detail.audit.length, 2);
  assert.ok(
    detail.audit.every(
      (row) =>
        row.actor === String(admin.record._id) &&
        row.reason &&
        row.at &&
        row.before &&
        row.after,
    ),
  );
  assert.equal(
    (await call('get', '/admin/users?q=Corrected&page=1&limit=1')).body.data
      .total,
    1,
  );
});
test('suspension revokes access, reactivation requires fresh login, manual subscription overrides create no ledger payment', async () => {
  const before = await f.Payment.countDocuments();
  await call('patch', '/admin/users/' + member.record._id)
    .send({ suspended: true, reason: 'Investigating account' })
    .expect(200);
  await call('get', '/users/me/dashboard', member).expect(401);
  await call('patch', '/admin/users/' + member.record._id)
    .send({ suspended: false, reason: 'Investigation resolved' })
    .expect(200);
  await call('get', '/scores', member).expect(401);
  const start = new Date(Date.now() - 86400000),
    end = new Date(Date.now() + 86400000 * 10);
  const sub = (
    await call('patch', `/admin/users/${member.record._id}/subscription`)
      .send({
        plan: 'monthly',
        periodStart: start,
        periodEnd: end,
        cancelAtPeriodEnd: false,
        reason: 'Demo entitlement correction',
      })
      .expect(200)
  ).body.data;
  assert.equal(sub.mode, 'manual-demo');
  assert.equal(sub.paymentId, null);
  assert.equal(sub.active, true);
  assert.equal(await f.Payment.countDocuments(), before);
  second = await f.user('SecondAdmin', 'admin', []);
  const changes = await Promise.all([
    call('patch', '/admin/users/' + second.record._id, admin).send({
      role: 'member',
      reason: 'Concurrent role correction',
    }),
    call('patch', '/admin/users/' + admin.record._id, second).send({
      role: 'member',
      reason: 'Concurrent role correction',
    }),
  ]);
  assert.deepEqual(changes.map((row) => row.status).sort(), [200, 409]);
  assert.equal(
    await f.User.countDocuments({ role: 'admin', suspended: false }),
    1,
  );
  const remaining = await f.User.findOne({ role: 'admin', suspended: false });
  if (String(remaining._id) === String(second.record._id)) admin = second;
});
test('charity CRUD validates slugs/events, serves safe local media, archives referenced records and preserves attribution', async () => {
  await call('post', '/admin/charities', member).send({}).expect(401);
  const body = {
    name: 'New demo charity',
    slug: 'new-demo-charity',
    description: 'A fictional cause for isolated media tests.',
    category: 'community',
    active: true,
    featured: true,
    upcomingEvents: [
      {
        title: 'Community day',
        startsAt: '2030-01-01T10:00:00Z',
        location: 'Demo venue',
        description: 'Fictional event',
      },
    ],
    reason: 'Create local test charity',
  };
  const charity = (
    await call('post', '/admin/charities').send(body).expect(201)
  ).body.data;
  await call('post', '/admin/charities').send(body).expect(409);
  await call('post', '/admin/charities')
    .send({ ...body, slug: 'bad slug' })
    .expect(400);
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: 'blue' },
  })
    .png()
    .toBuffer();
  const media = (
    await call(
      'post',
      `/admin/charities/${charity.id}/media?alt=Blue%20test%20image&reason=Testing%20media`,
    )
      .set('Content-Type', 'image/png')
      .send(png)
      .expect(200)
  ).body.data;
  assert.equal(media.storage, 'local');
  const url = new URL(media.charity.images[0].url);
  await request(f.app)
    .get(url.pathname)
    .expect(200)
    .expect('Content-Type', /image\/png/);
  await call('patch', '/admin/charities/' + charity.id)
    .send({ active: false, reason: 'Temporarily inactive' })
    .expect(200);
  await request(f.app)
    .get('/api/charities/' + charity.id)
    .expect(404);
  await request(f.app).get(url.pathname).expect(404);
  const removed = (
    await call('delete', '/admin/charities/' + charity.id)
      .send({ reason: 'Remove unreferenced fixture' })
      .expect(200)
  ).body.data;
  assert.equal(removed.action, 'deleted');
  const old = await f.Payment.findOne({ charity: f.charity._id }).lean();
  const archived = (
    await call('delete', '/admin/charities/' + f.charity._id)
      .send({ reason: 'Archive referenced fixture' })
      .expect(200)
  ).body.data;
  assert.equal(archived.action, 'archived');
  assert.ok(await f.Charity.findById(f.charity._id));
  assert.deepEqual(
    (await f.Payment.findById(old._id)).allocations.map((row) =>
      row.toObject(),
    ),
    old.allocations,
  );
  assert.ok(
    await createAuditModel(f.database.connection).countDocuments({
      entity: 'charity',
    }),
  );
});
test('reporting reconciles successful annual allocation and donations separately with safe dates and empty ranges', async () => {
  const year = new Date().getUTCFullYear();
  const payment = await f.Payment.findOne({}).lean();
  await f.Payment.create({
    user: member.record._id,
    key: 'annual-report-fixture',
    fingerprint: 'annual',
    purpose: 'subscription',
    status: 'succeeded',
    amountMinor: 12000,
    currency: 'GBP',
    charity: f.charity._id,
    charityName: 'Historical charity name',
    contributionPercent: 30,
    prizePercent: 50,
    plan: 'yearly',
    months: 12,
    completedAt: new Date(`${year}-01-01T00:00:00Z`),
    allocations: Array.from({ length: 12 }, (_, index) => ({
      period: `${year}-${String(index + 1).padStart(2, '0')}`,
      revenueMinor: 1000,
      charityMinor: 300,
      prizeMinor: 500,
      platformMinor: 200,
    })),
  });
  for (const [status, key] of [
    ['succeeded', 'donation-ok'],
    ['failed', 'donation-failed'],
  ])
    await f.Payment.create({
      user: member.record._id,
      key,
      fingerprint: key,
      purpose: 'donation',
      status,
      amountMinor: 700,
      currency: 'GBP',
      charity: f.charity._id,
      charityName: payment.charityName,
      contributionPercent: 100,
      completedAt: new Date(`${year}-01-01T00:00:00Z`),
    });
  await call(
    'get',
    `/admin/reports?from=${year}-01-01&to=${year}-12-31`,
    member,
  ).expect(401);
  const report = (
    await call(
      'get',
      `/admin/reports?from=${year}-01-01&to=${year}-12-31`,
    ).expect(200)
  ).body.data;
  const total = report.totals.find((row) => row.currency === 'GBP');
  assert.equal(total.subscriptionRevenueMinor, 17700);
  assert.equal(total.subscriptionCharityMinor, 4170);
  assert.equal(total.prizeAllocationMinor, 8850);
  assert.equal(total.platformAllocationMinor, 4680);
  assert.equal(total.donationsMinor, 700);
  assert.equal(
    total.subscriptionCharityMinor +
      total.prizeAllocationMinor +
      total.platformAllocationMinor,
    total.subscriptionRevenueMinor,
  );
  const day = (
    await call(
      'get',
      `/admin/reports?from=${year}-01-01&to=${year}-01-01`,
    ).expect(200)
  ).body.data.totals[0];
  assert.equal(day.subscriptionRevenueMinor, 1000);
  assert.equal(day.donationsMinor, 700);
  const empty = (
    await call('get', '/admin/reports?from=2001-01-01&to=2001-01-01').expect(
      200,
    )
  ).body.data;
  assert.equal(empty.totals[0].subscriptionRevenueMinor, 0);
  assert.equal(empty.publishedDraws, 0);
  await call('get', '/admin/reports?from=2026-02-30&to=2026-03-01').expect(400);
  await call('get', '/admin/reports?from=2026-03-01&to=2026-02-01').expect(400);
});
test('configured cutoff preserves historical scores and membership after post-cutoff edits', async () => {
  const isolated = await fixture();
  try {
    const player = await isolated.user('CutoffMember');
    const time = new Date();
    const cutoff = new Date(time.getTime() + 500);
    let clock = time;
    const service = createDrawService(
      { ...isolated, config: isolated.config },
      { now: () => clock, integer: () => 0 },
    );
    const draw = await service.create({
      month: time.toISOString().slice(0, 7),
      strategy: 'weighted',
      scheduledAt: cutoff.toISOString(),
      cutoffAt: cutoff.toISOString(),
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
    clock = new Date();
    const score = await isolated.Score.findOne({
      user: player.record._id,
      value: 1,
    });
    await request(isolated.app)
      .patch('/api/scores/' + score._id)
      .set('Cookie', player.cookie)
      .set('Origin', isolated.config.clientOrigin)
      .set('X-CSRF-Protection', '1')
      .send({ value: 44 })
      .expect(200);
    const preview = await service.simulate(draw.id, {});
    assert.deepEqual(preview.numbers, [1, 2, 3, 4, 5]);
    await service.publish(draw.id, { previewVersion: preview.previewVersion });
    const own = await service.ownedResult(draw.id, player.record);
    assert.equal(own.tier, 5);
    assert.ok(own.scores.some((row) => row.value === 1));
    assert.ok(!own.scores.some((row) => row.value === 44));
  } finally {
    await isolated.stop();
  }
});
