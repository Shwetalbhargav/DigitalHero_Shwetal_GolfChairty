import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
import { fixture } from '../test-support/fixture.js';
import { createWinnerService } from '../src/modules/winners/winner.service.js';
import {
  createEvidenceStorage,
  validateEvidence,
} from '../src/modules/winners/evidence.storage.js';
let f, admin, member, other, id, preview, winner;
function call(method, path, user = admin) {
  const agent = request(f.app);
  return agent[method]('/api' + path)
    .set('Cookie', user?.cookie || '')
    .set('Origin', f.config.clientOrigin)
    .set('X-CSRF-Protection', '1');
}
before(
  async () => {
    f = await fixture();
    admin = await f.user('Admin', 'admin', []);
    member = await f.user('Member');
    other = await f.user('Other', 'member', [6, 7]);
  },
  { timeout: 180000 },
);
after(async () => f?.stop());
test('draw routes protect drafts, static latest, IDs and admin mutations', async () => {
  assert.equal(
    (await call('get', '/draws/latest').expect(200)).body.data,
    null,
  );
  await call('post', '/admin/draws', member).send({}).expect(403);
  await call('get', '/draws/nope').expect(400);
  const time = new Date();
  const draft = (
    await call('post', '/admin/draws')
      .send({
        month: time.toISOString().slice(0, 7),
        strategy: 'random',
        scheduledAt: time.toISOString(),
      })
      .expect(201)
  ).body.data;
  id = draft.id;
  await call('get', '/draws/' + id).expect(404);
  assert.equal((await call('get', '/draws').expect(200)).body.data.total, 0);
  await call('get', '/admin/draws/' + id, member).expect(403);
});
test('preview is versioned and private; stale eligibility and config reject publication; simulation has no financial writes', async () => {
  preview = await f.service.simulate(id, {});
  assert.deepEqual(preview.numbers, [1, 2, 3, 4, 5]);
  assert.equal(await f.Winner.countDocuments(), 0);
  assert.equal(await f.Payout.countDocuments(), 0);
  assert.equal(await f.Rollover.countDocuments(), 0);
  assert.ok(!JSON.stringify(preview).includes(member.record.email));
  assert.ok(!JSON.stringify(preview).includes(String(member.record._id)));
  const score = await f.Score.findOne({ user: member.record._id, value: 5 });
  await call('patch', '/scores/' + score._id, member)
    .send({ value: 6 })
    .expect(200);
  await call('post', `/admin/draws/${id}/publish`)
    .send({ previewVersion: preview.previewVersion })
    .expect(409);
  await call('patch', '/scores/' + score._id, member)
    .send({ value: 5 })
    .expect(200);
  preview = await f.service.simulate(id, {});
  const draft = await f.Draw.findById(id);
  await call('patch', '/admin/draws/' + id)
    .send({
      month: draft.month,
      strategy: 'weighted',
      scheduledAt: draft.scheduledAt,
    })
    .expect(200);
  await call('post', `/admin/draws/${id}/publish`)
    .send({ previewVersion: preview.previewVersion })
    .expect(409);
  preview = await f.service.simulate(id, {});
});
test('concurrent publishing commits exactly the reviewed snapshot and one winner/payout/rollover; later score edits do not change results', async () => {
  const responses = await Promise.all(
    [1, 2, 3].map(() =>
      call('post', `/admin/draws/${id}/publish`)
        .send({ previewVersion: preview.previewVersion })
        .expect(200),
    ),
  );
  for (const response of responses)
    assert.deepEqual(response.body.data.numbers, preview.numbers);
  assert.equal(await f.Winner.countDocuments({ draw: id }), 1);
  assert.equal(await f.Payout.countDocuments(), 1);
  assert.equal(await f.Rollover.countDocuments(), 1);
  const result = (await call('get', `/draws/${id}/me`, member).expect(200)).body
    .data;
  assert.equal(result.tier, 5);
  winner = result.winnerId;
  assert.equal(
    (await call('get', `/draws/${id}/me`, other)).body.data.status,
    'insufficient_scores',
  );
  const score = await f.Score.findOne({ user: member.record._id, value: 1 });
  await call('patch', '/scores/' + score._id, member)
    .send({ value: 44 })
    .expect(200);
  assert.deepEqual(
    (await call('get', `/draws/${id}/me`, member)).body.data,
    result,
  );
  assert.equal((await call('get', '/draws/latest')).body.data.id, id);
  await call('post', `/admin/draws/${id}/simulate`).send({}).expect(404);
});
test('private evidence validates content/ownership, tracks rejection and resubmission, and pays only once after approval', async () => {
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: '#00513b' },
  })
    .png()
    .toBuffer();
  await call('get', '/winnings/' + winner, other).expect(404);
  await call('post', `/winnings/${winner}/proof`, other)
    .set('Content-Type', 'image/png')
    .send(png)
    .expect(404);
  await call('post', `/winnings/${winner}/proof`, member)
    .set('Content-Type', 'image/png')
    .send(Buffer.from('invalid'))
    .expect(400);
  await call('post', `/winnings/${winner}/proof`, member)
    .set('Content-Type', 'image/png')
    .send(Buffer.alloc(5 * 1024 * 1024 + 1))
    .expect(413);
  await call('post', `/admin/winners/${winner}/payout`)
    .send({ mode: 'simulated', reference: 'test-demo-reference' })
    .expect(409);
  let claim = (
    await call('post', `/winnings/${winner}/proof`, member)
      .set('Content-Type', 'image/png')
      .send(png)
      .expect(200)
  ).body.data;
  assert.equal(claim.submissions[0].provider, 'local');
  assert.ok(!JSON.stringify(claim).includes('assetId'));
  assert.ok(!JSON.stringify(claim).includes('digital-heroes-proof/'));
  await call(
    'get',
    `/winnings/${winner}/proof/${claim.submissions[0].id}`,
    other,
  ).expect(404);
  await call(
    'get',
    `/winnings/${winner}/proof/${claim.submissions[0].id}`,
    member,
  )
    .expect('Content-Type', /image\/png/)
    .expect(200);
  const repeated = (
    await call('post', `/winnings/${winner}/proof`, member)
      .set('Content-Type', 'image/png')
      .send(png)
      .expect(200)
  ).body.data;
  assert.equal(repeated.submissions.length, 1);
  await call('post', `/admin/winners/${winner}/review`, member)
    .send({ decision: 'approved', revision: claim.revision })
    .expect(403);
  await call('post', `/admin/winners/${winner}/review`)
    .send({ decision: 'rejected', reason: '', revision: claim.revision })
    .expect(400);
  claim = (
    await call('post', `/admin/winners/${winner}/review`)
      .send({
        decision: 'rejected',
        reason: 'Please include the full scorecard.',
        revision: claim.revision,
      })
      .expect(200)
  ).body.data;
  assert.equal(claim.verification, 'rejected');
  await call('post', `/admin/winners/${winner}/payout`)
    .send({ mode: 'simulated', reference: 'test-demo-reference' })
    .expect(409);
  claim = (
    await call('post', `/winnings/${winner}/proof`, member)
      .set('Content-Type', 'image/png')
      .send(png)
      .expect(200)
  ).body.data;
  assert.equal(claim.submissions.length, 2);
  claim = (
    await call('post', `/admin/winners/${winner}/review`)
      .send({ decision: 'approved', revision: claim.revision })
      .expect(200)
  ).body.data;
  assert.equal(claim.verification, 'approved');
  const payments = await Promise.all(
    [1, 2].map(() =>
      call('post', `/admin/winners/${winner}/payout`).send({
        mode: 'simulated',
        reference: 'test-demo-reference',
      }),
    ),
  );
  assert.deepEqual(payments.map((row) => row.status).sort(), [200, 409]);
  claim = (await call('get', '/winnings/' + winner, member)).body.data;
  assert.equal(claim.payout.status, 'paid');
  assert.equal(claim.verification, 'approved');
  assert.equal(
    claim.timeline.filter((row) => row.kind === 'simulated_payout_paid').length,
    1,
  );
  const report = (await call('get', '/admin/reports').expect(200)).body.data;
  const total = report.totals.find((row) => row.currency === 'GBP');
  const published = await f.Draw.findById(id).lean();
  assert.equal(total.awardedMinor, published.preview.result.awardedMinor);
  assert.equal(total.paidMinor, claim.amountMinor);
  assert.equal(
    total.prizeAllocationMinor + published.preview.result.incomingRolloverMinor,
    total.awardedMinor +
      total.unclaimedThreeFourMinor +
      total.outstandingRolloverMinor,
  );
  await call('post', `/winnings/${winner}/proof`, member)
    .set('Content-Type', 'image/png')
    .send(png)
    .expect(409);
});
test('persistence failure cleans evidence and leaves verification unchanged; invalid images cannot hide behind a MIME header', async () => {
  const png = await sharp({
    create: { width: 10, height: 10, channels: 3, background: 'red' },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => validateEvidence(png, 'image/jpeg'), {
    code: 'INVALID_PROOF_TYPE',
  });
  const row = await f.Winner.findById(winner);
  row.verification = 'rejected';
  await row.save();
  const revision = row.revision;
  const real = createEvidenceStorage(f.Evidence, f.config);
  let staged;
  const storage = {
    ...real,
    upload: async (...args) => {
      staged = await real.upload(...args);
      await f.Winner.updateOne({ _id: winner }, { $inc: { revision: 1 } });
      return staged;
    },
  };
  const service = createWinnerService({ ...f, storage });
  await assert.rejects(
    () => service.submit(winner, member.record, png, 'image/png'),
    { code: 'PROOF_CHANGED' },
  );
  assert.equal(await f.Evidence.countDocuments({ _id: staged._id }), 0);
  assert.equal((await f.Winner.findById(winner)).revision, revision + 1);
  assert.equal((await f.Winner.findById(winner)).verification, 'rejected');
});
