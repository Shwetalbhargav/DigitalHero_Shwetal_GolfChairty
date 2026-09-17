import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { fixture } from '../test-support/fixture.js';
import { createAccountSecurity } from '../src/modules/auth/account-security.js';

test('recovery links expire, are single use, revoke sessions, and never expose tokens from user reads', async () => {
  const f = await fixture();
  try {
    const member = await f.user('Recovery');
    await f.User.updateOne({ _id: member.record._id }, { $set: { passwordHash: await bcrypt.hash('old-test-password', 12) } });
    let now = new Date();
    const security = createAccountSecurity(f.User, { ...f.config, emailMode: 'demo' }, { now: () => now });
    const existing = await security.forgot({ email: member.record.email });
    const missing = await security.forgot({ email: 'nobody@example.test' });
    assert.deepEqual(existing, missing);
    const firstToken = new URLSearchParams(new URL(security.inbox()[0].link).hash.slice(1)).get('token');
    now = new Date(now.getTime() + 31 * 60000);
    await assert.rejects(security.reset({ token: firstToken, password: 'new-test-password' }), { code: 'INVALID_LINK' });
    await security.forgot({ email: member.record.email });
    const token = new URLSearchParams(new URL(security.inbox()[0].link).hash.slice(1)).get('token');
    const hidden = await f.User.findById(member.record._id).lean();
    assert.equal(hidden.resetHash, undefined);
    const results = await Promise.allSettled([security.reset({ token, password: 'new-test-password' }), security.reset({ token, password: 'other-test-password' })]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    await request(f.app).get('/api/auth/me').set('Cookie', member.cookie).expect(401);
    await assert.rejects(security.reset({ token, password: 'new-test-password' }), { code: 'INVALID_LINK' });
  } finally { await f.stop(); }
});

test('email change needs current password and verification; password change invalidates pending email links', async () => {
  const f = await fixture();
  try {
    const member = await f.user('Emailchange');
    await f.User.updateOne({ _id: member.record._id }, { $set: { passwordHash: await bcrypt.hash('old-test-password', 12) } });
    const user = await f.User.findById(member.record._id).select('+tokenVersion');
    const security = createAccountSecurity(f.User, { ...f.config, emailMode: 'demo' });
    await assert.rejects(security.requestEmail(user, { currentPassword: 'wrong', email: 'new@example.test' }), { code: 'CURRENT_PASSWORD' });
    await security.requestEmail(user, { currentPassword: 'old-test-password', email: 'new@example.test' });
    assert.equal((await f.User.findById(user._id)).email, member.record.email);
    const token = new URLSearchParams(new URL(security.inbox()[0].link).hash.slice(1)).get('token');
    await security.changePassword(user, { currentPassword: 'old-test-password', password: 'new-test-password' });
    await assert.rejects(security.confirmEmail({ token }), { code: 'INVALID_LINK' });
    const refreshed = await f.User.findById(user._id).select('+tokenVersion');
    await security.requestEmail(refreshed, { currentPassword: 'new-test-password', email: 'new@example.test' });
    const next = new URLSearchParams(new URL(security.inbox()[0].link).hash.slice(1)).get('token');
    await security.confirmEmail({ token: next });
    assert.equal((await f.User.findById(user._id)).email, 'new@example.test');
    await assert.rejects(security.confirmEmail({ token: next }), { code: 'INVALID_LINK' });
  } finally { await f.stop(); }
});
