import { createHash } from 'node:crypto';
import { ApiError } from '../../utils/ApiError.js';
import { validateBody } from '../auth/auth.validation.js';
import { parseCharityId } from '../charities/charity.validation.js';
import { publicPayment } from './payment.model.js';
import { assertDemo, simulatePayment } from './demo.adapter.js';
export function validateKey(key) {
  if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(key))
    throw new ApiError(
      400,
      'INVALID_IDEMPOTENCY_KEY',
      'Supply an Idempotency-Key of 16–100 letters, digits, underscores or hyphens.',
    );
  return key;
}
export function fingerprint(fields) {
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
export async function insertPayment(Payment, user, key, fields, hash) {
  await Payment.init();
  let record;
  try {
    record = await Payment.findOneAndUpdate(
      { user: user._id, key },
      { $setOnInsert: { ...fields, user: user._id, key, fingerprint: hash } },
      { upsert: true, new: true, runValidators: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    record = await Payment.findOne({ user: user._id, key });
  }
  if (!record || record.fingerprint !== hash)
    throw new ApiError(
      409,
      'IDEMPOTENCY_CONFLICT',
      'This request key belongs to different payment details.',
    );
  return record;
}
export function createPaymentService(Payment, Charity, config) {
  async function getOwned(user, id) {
    const record = await Payment.findOne({
      _id: parseCharityId(id),
      user: user._id,
    });
    if (!record)
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    return record;
  }
  async function donation(user, body, key) {
    assertDemo(config);
    validateBody(body, ['charityId', 'amountMinor']);
    validateKey(key);
    const charityId = parseCharityId(body.charityId);
    if (
      !Number.isSafeInteger(body.amountMinor) ||
      body.amountMinor < 100 ||
      body.amountMinor > 1000000
    )
      throw new ApiError(
        400,
        'INVALID_AMOUNT',
        'Demo donations must be between 100 and 1000000 minor units.',
      );
    const hash = fingerprint({
      purpose: 'donation',
      charityId,
      amountMinor: body.amountMinor,
    });
    const existing = await Payment.findOne({ user: user._id, key });
    if (existing) {
      if (existing.fingerprint !== hash)
        throw new ApiError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This request key belongs to different payment details.',
        );
      return publicPayment(existing);
    }
    const charity = await Charity.findOne({ _id: charityId, active: true });
    if (!charity)
      throw new ApiError(400, 'INVALID_CHARITY', 'Choose an active charity.');
    return publicPayment(
      await insertPayment(
        Payment,
        user,
        key,
        {
          purpose: 'donation',
          amountMinor: body.amountMinor,
          currency: config.currency,
          charity: charity._id,
          charityName: charity.name,
          contributionPercent: 100,
        },
        hash,
      ),
    );
  }
  async function processDonation(user, id, body) {
    validateBody(body, ['scenario']);
    const result = simulatePayment(config, body.scenario);
    const payment = await getOwned(user, id);
    if (payment.purpose !== 'donation')
      throw new ApiError(
        409,
        'WRONG_PAYMENT_PURPOSE',
        'Use subscription processing for this payment.',
      );
    // Only a pending record can be finalized: repeats cannot create another credit.
    if (payment.status !== 'pending') return publicPayment(payment);
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'pending' },
      {
        $set: {
          ...result,
          completedAt: new Date(),
          allocations:
            result.status === 'succeeded'
              ? [
                  {
                    period: new Date().toISOString().slice(0, 7),
                    revenueMinor: payment.amountMinor,
                    charityMinor: payment.amountMinor,
                    prizeMinor: 0,
                    platformMinor: 0,
                  },
                ]
              : [],
        },
        $inc: { attempts: 1 },
      },
      { new: true },
    );
    return publicPayment(updated || (await getOwned(user, id)));
  }
  async function retry(user, id) {
    assertDemo(config);
    const payment = await getOwned(user, id);
    // An explicit retry reopens a failed attempt; it never reopens a success.
    return publicPayment(
      (await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'failed' },
        { $set: { status: 'pending', failureReason: null, completedAt: null } },
        { new: true },
      )) || payment,
    );
  }
  return {
    getOwned,
    donation,
    processDonation,
    retry,
    async detail(user, id) {
      return publicPayment(await getOwned(user, id));
    },
  };
}
