import { ApiError } from '../../utils/ApiError.js';
import { touchDrawState } from '../draws/draw.model.js';
import { captureEligibility } from '../draws/eligibility.model.js';
import { auditReason, recordAudit } from '../admin/audit.model.js';
import { validateBody, validateContribution } from '../auth/auth.validation.js';
import { parseCharityId } from '../charities/charity.validation.js';
import { assertDemo, simulatePayment } from '../payments/demo.adapter.js';
import {
  fingerprint,
  insertPayment,
  validateKey,
} from '../payments/payment.service.js';
import { publicPayment } from '../payments/payment.model.js';
import { subscriptionView } from './subscription.model.js';
import { createStripeBilling } from '../payments/stripe.service.js';
// Calendar months preserve UTC time and clamp Jan 31 / Feb 29 to valid month ends.
export function addMonths(date, months) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}
export function allocatePayment(payment, start) {
  const months = payment.months;
  const base = Math.floor(payment.amountMinor / months),
    remainder = payment.amountMinor % months;
  return Array.from({ length: months }, (_, index) => {
    const revenueMinor = base + (index < remainder ? 1 : 0);
    const charityMinor = Math.floor(
      (revenueMinor * payment.contributionPercent) / 100,
    );
    const prizeMinor = Math.floor((revenueMinor * payment.prizePercent) / 100);
    return {
      period: addMonths(start, index).toISOString().slice(0, 7),
      revenueMinor,
      charityMinor,
      prizeMinor,
      platformMinor: revenueMinor - charityMinor - prizeMinor,
    };
  });
}
export function createSubscriptionService(
  Subscription,
  Payment,
  Charity,
  config,
  { now = () => new Date() } = {},
) {
  function plans() {
    return {
      mode: config.paymentMode,
      available:
        config.paymentMode === 'stripe' || (config.paymentMode === 'simulated' && config.nodeEnv !== 'production'),
      currency: config.currency,
      prizePercent: config.prizePercent,
      minContributionPercent: 10,
      maxContributionPercent: config.maxContributionPercent,
      plans: [
        { id: 'monthly', months: 1, amountMinor: config.monthlyPriceMinor },
        { id: 'yearly', months: 12, amountMinor: config.yearlyPriceMinor },
      ],
    };
  }
  async function current(user) {
    return subscriptionView(
      await Subscription.findOne({ user: user._id }),
      config,
      now(),
    );
  }
  async function checkout(user, body, key, renewal = false) {
    if (config.paymentMode === 'stripe') return createStripeBilling(Subscription.db, config).checkout(user, body, key);
    assertDemo(config);
    validateBody(body, ['plan']);
    validateKey(key);
    const plan = plans().plans.find((item) => item.id === body.plan);
    if (!plan)
      throw new ApiError(400, 'INVALID_PLAN', 'Choose monthly or yearly.');
    const hash = fingerprint({
      purpose: 'subscription',
      plan: plan.id,
      renewal,
    });
    const existing = await Payment.findOne({ user: user._id, key });
    if (existing) {
      if (existing.fingerprint !== hash)
        throw new ApiError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This key belongs to another checkout.',
        );
      return publicPayment(existing);
    }
    const subscription = await current(user);
    if (subscription?.active)
      throw new ApiError(
        409,
        'SUBSCRIPTION_ACTIVE',
        'Your current period is still active. Renew after its end.',
      );
    if (renewal && !subscription)
      throw new ApiError(
        409,
        'NO_SUBSCRIPTION',
        'Choose an initial subscription first.',
      );
    validateContribution(
      user.contributionPercent,
      config.maxContributionPercent,
    );
    const charity = await Charity.findOneAndUpdate(
      { _id: user.charity, active: true },
      { $set: { hasReferences: true } },
      { new: true },
    );
    if (!charity)
      throw new ApiError(
        400,
        'INVALID_CHARITY',
        'Choose an active charity before checkout.',
      );
    await Subscription.init();
    return publicPayment(
      await insertPayment(
        Payment,
        user,
        key,
        {
          purpose: 'subscription',
          plan: plan.id,
          months: plan.months,
          amountMinor: plan.amountMinor,
          currency: config.currency,
          charity: charity._id,
          charityName: charity.name,
          contributionPercent: user.contributionPercent,
          prizePercent: config.prizePercent,
          expiresAt: new Date(now().getTime() + 24 * 60 * 60 * 1000),
        },
        hash,
      ),
    );
  }
  async function process(user, id, body) {
    validateBody(body, ['scenario']);
    const outcome = simulatePayment(config, body.scenario);
    parseCharityId(id);
    let result;
    try {
      // Payment status, allocation and entitlement commit together or not at all.
      await Subscription.db.transaction(async (session) => {
        await touchDrawState(Subscription.db, session);
        const payment = await Payment.findOne({
          _id: id,
          user: user._id,
        }).session(session);
        if (!payment)
          throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
        if (payment.purpose !== 'subscription')
          throw new ApiError(
            409,
            'WRONG_PAYMENT_PURPOSE',
            'This is not a subscription payment.',
          );
        if (payment.status !== 'pending') {
          result = publicPayment(payment);
          return;
        }
        if (payment.expiresAt <= now())
          throw new ApiError(
            409,
            'CHECKOUT_EXPIRED',
            'This checkout expired. Start a new checkout.',
          );
        const currentRecord = await Subscription.findOne({
          user: user._id,
        }).session(session);
        if (subscriptionView(currentRecord, config, now())?.active)
          throw new ApiError(
            409,
            'SUBSCRIPTION_ACTIVE',
            'Another payment has already activated your current period.',
          );
        const timestamp = now();
        if (outcome.status === 'succeeded') {
          await Subscription.findOneAndUpdate(
            { user: user._id },
            {
              $set: {
                plan: payment.plan,
                mode: 'simulated',
                periodStart: timestamp,
                periodEnd: addMonths(timestamp, payment.months),
                cancelAtPeriodEnd: false,
                payment: payment._id,
              },
            },
            { upsert: true, new: true, session, runValidators: true },
          );
          payment.allocations = allocatePayment(payment, timestamp);
          await captureEligibility(Subscription.db, user._id, session);
        }
        payment.status = outcome.status;
        payment.failureReason = outcome.failureReason;
        payment.completedAt = timestamp;
        payment.attempts++;
        await payment.save({ session });
        result = publicPayment(payment);
      });
    } catch (error) {
      if (error.code === 20 || error.codeName === 'IllegalOperation')
        throw new ApiError(
          503,
          'BILLING_DATABASE_UNAVAILABLE',
          'Subscription processing requires MongoDB with replica-set transactions.',
        );
      if (error.code === 11000)
        throw new ApiError(
          409,
          'SUBSCRIPTION_CONFLICT',
          'Another checkout changed this subscription. Refresh its status.',
        );
      throw error;
    }
    return result;
  }
  async function cancel(user, body) {
    validateBody(body, []);
    if (config.paymentMode === 'stripe') return createStripeBilling(Subscription.db, config).cancel(user);
    const record = await Subscription.findOneAndUpdate(
      { user: user._id },
      { $set: { cancelAtPeriodEnd: true } },
      { new: true },
    );
    if (!record)
      throw new ApiError(
        404,
        'SUBSCRIPTION_NOT_FOUND',
        'No subscription exists.',
      );
    return subscriptionView(record, config, now());
  }
  async function history(user) {
    return (
      await Payment.find({ user: user._id, purpose: 'subscription' })
        .sort({ createdAt: -1 })
        .limit(20)
    ).map(publicPayment);
  }
  async function adjust(user, body, actor) {
    validateBody(body, [
      'plan',
      'periodStart',
      'periodEnd',
      'cancelAtPeriodEnd',
      'reason',
    ]);
    const reason = auditReason(body.reason);
    if (actor?.role !== 'admin')
      throw new ApiError(
        403,
        'ADMIN_REQUIRED',
        'Administrator access required.',
      );
    assertDemo(config);
    const start = new Date(body.periodStart),
      end = new Date(body.periodEnd);
    if (
      !['monthly', 'yearly'].includes(body.plan) ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start ||
      end - start > 366 * 86400000 ||
      typeof body.cancelAtPeriodEnd !== 'boolean'
    )
      throw new ApiError(
        400,
        'INVALID_ADJUSTMENT',
        'Supply a plan, valid start/end period of at most 366 days, and a cancellation flag.',
      );
    await Subscription.db.transaction(async (session) => {
      await touchDrawState(Subscription.db, session);
      const before = await Subscription.findOne({ user: user._id })
        .session(session)
        .lean();
      const after = await Subscription.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            plan: body.plan,
            periodStart: start,
            periodEnd: end,
            cancelAtPeriodEnd: body.cancelAtPeriodEnd,
            mode: 'manual-demo',
          },
          $unset: { payment: 1 },
        },
        { upsert: true, new: true, session, runValidators: true },
      );
      await captureEligibility(Subscription.db, user._id, session);
      await recordAudit(
        Subscription.db,
        {
          actor,
          reason,
          action: 'subscription.manual-demo',
          entity: 'user',
          entityId: user._id,
          before,
          after: after.toObject(),
        },
        session,
      );
    });
    return current(user);
  }
  return { plans, current, checkout, process, cancel, history, adjust, portal: (user) => createStripeBilling(Subscription.db, config).portal(user) };
}
