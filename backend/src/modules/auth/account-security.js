import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { ApiError } from '../../utils/ApiError.js';
import { validateBody, validateCredentials } from './auth.validation.js';

const digest = (token) => createHash('sha256').update(token).digest('hex');
const generic = { message: 'If this account can receive email, a reset link has been sent. Check your inbox.' };
export function createAccountSecurity(User, config, { fetcher = fetch, now = () => new Date() } = {}) {
  const inbox = [];
  const demo = config.nodeEnv === 'test' && config.emailMode === 'demo';
  function available() {
    if (!demo && config.emailMode !== 'resend') throw new ApiError(503, 'EMAIL_UNAVAILABLE', 'Email delivery is not configured. Please contact support.');
  }
  async function send(to, subject, link) {
    available();
    if (demo) { inbox.unshift({ to, subject, link, at: now(), expiresAt: new Date(now().getTime() + 1800000) }); inbox.splice(50); return; }
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + config.resendApiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ from: config.emailFrom, to: [to], subject, text: subject + '\n\nOpen this link within 30 minutes:\n' + link + '\n\nIf you did not request this, ignore this message.' }),
    });
    if (!response.ok) throw new ApiError(503, 'EMAIL_UNAVAILABLE', 'Email delivery is temporarily unavailable.');
  }
  function password(value) { validateCredentials({ email: 'validation@example.test', password: value, name: 'Validation', charityId: '000000000000000000000001', contributionPercent: 10 }, true); return value; }
  function email(value) { return validateCredentials({ email: value, password: 'check' }).email; }
  async function verified(user, currentPassword) {
    const row = await User.findById(user._id).select('+passwordHash +tokenVersion');
    if (!row || row.suspended || row.tokenVersion !== user.tokenVersion || typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, row.passwordHash)))
      throw new ApiError(400, 'CURRENT_PASSWORD', 'Your current password is incorrect.');
    return row;
  }
  const clear = { resetHash: 1, resetExpires: 1, resetVersion: 1, emailHash: 1, emailExpires: 1, emailVersion: 1, pendingEmail: 1 };
  return {
    inbox() { return demo ? inbox.filter((m) => m.expiresAt > now()) : []; },
    async forgot(body) {
      validateBody(body, ['email']); available();
      const address = email(body.email);
      const user = await User.findOne({ email: address, suspended: false }).select('+tokenVersion');
      if (user) {
        const token = randomBytes(32).toString('hex');
        await User.updateOne({ _id: user._id, tokenVersion: user.tokenVersion }, { $set: { resetHash: digest(token), resetExpires: new Date(now().getTime() + 1800000), resetVersion: user.tokenVersion } });
        try { await send(address, 'Reset your Digital Heroes password', config.clientOrigin + '/reset-password#token=' + token); }
        catch { /* Generic response prevents revealing whether this account exists. */ }
      }
      return generic;
    },
    async reset(body) {
      validateBody(body, ['token', 'password']); password(body.password);
      if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) throw new ApiError(400, 'INVALID_LINK', 'This link is invalid or has expired. Request a new one.');
      const hash = await bcrypt.hash(body.password, 12);
      const updated = await User.findOneAndUpdate({ resetHash: digest(body.token), resetExpires: { $gt: now() }, suspended: false, $expr: { $eq: ['$resetVersion', '$tokenVersion'] } }, { $set: { passwordHash: hash }, $inc: { tokenVersion: 1 }, $unset: clear });
      if (!updated) throw new ApiError(400, 'INVALID_LINK', 'This link is invalid or has expired. Request a new one.');
      return { message: 'Password updated. Sign in with your new password. All previous sessions have ended.' };
    },
    async changePassword(user, body) {
      validateBody(body, ['currentPassword', 'password']); password(body.password);
      const row = await verified(user, body.currentPassword);
      const updated = await User.findOneAndUpdate({ _id: row._id, tokenVersion: row.tokenVersion, passwordHash: row.passwordHash, suspended: false }, { $set: { passwordHash: await bcrypt.hash(body.password, 12) }, $inc: { tokenVersion: 1 }, $unset: clear });
      if (!updated) throw new ApiError(409, 'ACCOUNT_CHANGED', 'Your account changed. Sign in again.');
      return { message: 'Password changed. Sign in again on your devices.' };
    },
    async requestEmail(user, body) {
      validateBody(body, ['currentPassword', 'email']); available();
      const address = email(body.email);
      const row = await verified(user, body.currentPassword);
      if (address === row.email || await User.exists({ email: address })) throw new ApiError(409, 'EMAIL_UNAVAILABLE', 'Choose a different available email address.');
      const token = randomBytes(32).toString('hex');
      const updated = await User.updateOne({ _id: row._id, tokenVersion: row.tokenVersion, suspended: false }, { $set: { pendingEmail: address, emailHash: digest(token), emailExpires: new Date(now().getTime() + 1800000), emailVersion: row.tokenVersion } });
      if (!updated.matchedCount) throw new ApiError(409, 'ACCOUNT_CHANGED', 'Your account changed. Sign in again.');
      await send(address, 'Verify your new Digital Heroes email', config.clientOrigin + '/verify-email#token=' + token);
      return { message: 'Check your new email address for a verification link. Your current address works until verification.' };
    },
    async confirmEmail(body) {
      validateBody(body, ['token']);
      if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) throw new ApiError(400, 'INVALID_LINK', 'This link is invalid or expired.');
      const filter = { emailHash: digest(body.token), emailExpires: { $gt: now() }, suspended: false, $expr: { $eq: ['$emailVersion', '$tokenVersion'] } };
      const row = await User.findOne(filter).select('+pendingEmail');
      if (!row) throw new ApiError(400, 'INVALID_LINK', 'This link is invalid or expired.');
      try {
        const updated = await User.findOneAndUpdate({ ...filter, _id: row._id }, { $set: { email: row.pendingEmail, emailVerifiedAt: now() }, $inc: { tokenVersion: 1 }, $unset: clear });
        if (!updated) throw new ApiError(400, 'INVALID_LINK', 'This link was already used.');
      } catch (error) { if (error.code === 11000) throw new ApiError(409, 'EMAIL_UNAVAILABLE', 'That email address is no longer available.'); throw error; }
      return { message: 'Email verified. Sign in with your new email address.' };
    },
  };
}
