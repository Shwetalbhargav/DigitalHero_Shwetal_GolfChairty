import Stripe from 'stripe';
import { Schema } from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { createUserModel } from '../users/user.model.js';
import { createCharityModel } from '../charities/charity.model.js';
import { createPaymentModel } from './payment.model.js';
import { createSubscriptionModel } from '../subscriptions/subscription.model.js';
import { allocatePayment } from '../subscriptions/subscription.service.js';
import { touchDrawState } from '../draws/draw.model.js';
import { captureEligibility } from '../draws/eligibility.model.js';
import { validateKey } from './payment.service.js';
import { validateBody } from '../auth/auth.validation.js';

const idOf = (value) => typeof value === 'string' ? value : value?.id;
export function createStripeBilling(connection, config, { client } = {}) {
  const stripe = client || (config.stripeSecretKey ? new Stripe(config.stripeSecretKey, { apiVersion: '2025-06-30.basil', timeout: 10000, maxNetworkRetries: 1 }) : null);
  const User = createUserModel(connection), Charity = createCharityModel(connection), Payment = createPaymentModel(connection), Subscription = createSubscriptionModel(connection);
  const Event = connection.models.ProviderEvent || connection.model('ProviderEvent', new Schema({ _id: String, type: String, processedAt: Date }, { versionKey: false }));
  const Checkout = connection.models.ProviderCheckout || connection.model('ProviderCheckout', new Schema({ user: { type: Schema.Types.ObjectId, required: true }, key: { type: String, required: true }, purpose: String, plan: String, url: String, sessionId: String, expiresAt: Date }, { timestamps: true }).index({ user: 1, key: 1 }, { unique: true }));
  function available() { if (config.paymentMode !== 'stripe' || !stripe) throw new ApiError(503, 'BILLING_UNAVAILABLE', 'Payment provider is not configured.'); }
  async function checkout(user, body, key, purpose = 'subscription') {
    available(); validateKey(key); validateBody(body, purpose === 'subscription' ? ['plan'] : ['charityId', 'amountMinor']);
    const plan = body.plan;
    if (purpose === 'subscription' && !['monthly', 'yearly'].includes(plan)) throw new ApiError(400, 'INVALID_PLAN', 'Choose monthly or yearly.');
    const amount = purpose === 'subscription' ? (plan === 'yearly' ? config.yearlyPriceMinor : config.monthlyPriceMinor) : body.amountMinor;
    if (!Number.isSafeInteger(amount) || amount < 100 || amount > 1000000) throw new ApiError(400, 'INVALID_AMOUNT', 'Choose an amount between 1 and 10,000 currency units.');
    let result;
    await connection.transaction(async (session) => {
      await touchDrawState(connection, session);
      const existing = await Checkout.findOne({ user: user._id, key }).session(session);
      if (existing) {
        if (existing.plan !== plan || existing.purpose !== purpose) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Start a new checkout for this selection.');
        if (existing.expiresAt <= new Date()) throw new ApiError(409, 'CHECKOUT_EXPIRED', 'This checkout expired. Reload and start again.');
        result = { checkoutUrl: existing.url }; return;
      }
      if (purpose === 'subscription') {
        const active = await Subscription.findOne({ user: user._id, periodEnd: { $gt: new Date() } }).session(session);
        if (active) throw new ApiError(409, 'SUBSCRIPTION_ACTIVE', 'Manage your existing membership before starting another.');
        const open = await Checkout.findOne({ user: user._id, purpose, expiresAt: { $gt: new Date() } }).session(session);
        if (open) throw new ApiError(409, 'CHECKOUT_OPEN', 'A membership checkout is already open. Resume it or wait for it to expire.');
      }
      const charityId = purpose === 'donation' ? body.charityId : String(user.charity);
      if (!/^[a-f0-9]{24}$/i.test(charityId || '')) throw new ApiError(400, 'INVALID_CHARITY', 'Choose an active charity.');
      const charity = await Charity.findOneAndUpdate({ _id: charityId, active: true }, { $set: { hasReferences: true } }, { new: true, session });
      if (!charity) throw new ApiError(400, 'INVALID_CHARITY', 'Choose an active charity.');
      const metadata = { app: 'digital-heroes', userId: String(user._id), purpose, plan: plan || '', charityId, charityName: charity.name, contributionPercent: String(purpose === 'donation' ? 100 : user.contributionPercent), prizePercent: String(purpose === 'donation' ? 0 : config.prizePercent) };
      const remote = await stripe.checkout.sessions.create({ mode: purpose === 'subscription' ? 'subscription' : 'payment', customer_email: user.email, client_reference_id: String(user._id), metadata, ...(purpose === 'subscription' ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }), line_items: [{ price_data: { currency: config.currency.toLowerCase(), unit_amount: amount, product_data: { name: purpose === 'subscription' ? 'Digital Heroes ' + plan : 'Donation to ' + charity.name }, ...(purpose === 'subscription' ? { recurring: { interval: plan === 'yearly' ? 'year' : 'month' } } : {}) }, quantity: 1 }], success_url: config.clientOrigin + '/dashboard/subscription?checkout=complete', cancel_url: config.clientOrigin + '/dashboard/subscription?checkout=cancelled' }, { idempotencyKey: String(user._id) + ':' + key });
      await Checkout.create([{ user: user._id, key, purpose, plan, url: remote.url, sessionId: remote.id, expiresAt: new Date(remote.expires_at * 1000) }], { session });
      result = { checkoutUrl: remote.url };
    });
    return result;
  }
  async function portal(user) {
    available(); const sub = await Subscription.findOne({ user: user._id, mode: 'stripe' });
    if (!sub?.providerCustomerId) throw new ApiError(404, 'NO_BILLING_ACCOUNT', 'No provider billing account exists yet.');
    return { url: (await stripe.billingPortal.sessions.create({ customer: sub.providerCustomerId, return_url: config.clientOrigin + '/dashboard/subscription' })).url };
  }
  async function cancel(user) {
    available(); const sub = await Subscription.findOne({ user: user._id, mode: 'stripe' });
    if (!sub?.providerSubscriptionId) throw new ApiError(404, 'NO_SUBSCRIPTION', 'No provider subscription exists.');
    await stripe.subscriptions.update(sub.providerSubscriptionId, { cancel_at_period_end: true });
    await Subscription.updateOne({ _id: sub._id }, { $set: { cancelAtPeriodEnd: true } });
    return { cancelledAtPeriodEnd: true };
  }
  async function processEvent(event) {
    available();
    if (event.livemode) throw new ApiError(400, 'SANDBOX_ONLY', 'Only Stripe sandbox events are supported by this release.');
    if (await Event.exists({ _id: event.id })) return { received: true };
    const obj = event.data.object;
    let subscription, invoice, donation;
    if (event.type.startsWith('customer.subscription.')) subscription = await stripe.subscriptions.retrieve(obj.id, { expand: ['latest_invoice'] });
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      invoice = await stripe.invoices.retrieve(obj.id);
      const sid = idOf(invoice.parent?.subscription_details?.subscription || invoice.subscription);
      if (sid) subscription = await stripe.subscriptions.retrieve(sid, { expand: ['latest_invoice'] });
    }
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && obj.mode === 'payment') donation = await stripe.checkout.sessions.retrieve(obj.id);
    const metadata = subscription?.metadata || donation?.metadata;
    if (!metadata || metadata.app !== 'digital-heroes') return { received: true };
    if (!/^[a-f0-9]{24}$/i.test(metadata.userId || '') || !/^[a-f0-9]{24}$/i.test(metadata.charityId || '')) throw new ApiError(400, 'INVALID_PROVIDER_RECORD', 'Provider record does not match an account.');
    const owner = await User.findById(metadata.userId);
    if (!owner) throw new ApiError(400, 'INVALID_PROVIDER_RECORD', 'Provider account is missing.');
    const latest = subscription?.latest_invoice && typeof subscription.latest_invoice !== 'string' ? subscription.latest_invoice : null;
    if (subscription && !latest && subscription.latest_invoice) subscription.latest_invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
    const currentInvoice = typeof subscription?.latest_invoice === 'object' ? subscription.latest_invoice : null;
    await connection.transaction(async (session) => {
      await touchDrawState(connection, session);
      if (await Event.exists({ _id: event.id }).session(session)) return;
      async function credit(inv) {
        if (!inv || inv.status !== 'paid' || !Number.isSafeInteger(inv.amount_paid) || inv.amount_paid <= 0) return;
        const line = inv.lines?.data?.find((l) => l.period?.start && l.period?.end);
        if (!line) throw new ApiError(400, 'INVALID_PROVIDER_PERIOD', 'Invoice has no billing period.');
        const key = 'stripe-invoice-' + inv.id;
        if (await Payment.exists({ user: owner._id, key }).session(session)) return;
        const record = { user: owner._id, key, fingerprint: inv.id, purpose: 'subscription', mode: 'stripe', status: 'succeeded', amountMinor: inv.amount_paid, currency: inv.currency.toUpperCase(), charity: metadata.charityId, charityName: metadata.charityName, contributionPercent: Number(metadata.contributionPercent), prizePercent: Number(metadata.prizePercent), plan: metadata.plan, months: metadata.plan === 'yearly' ? 12 : 1, completedAt: new Date((inv.status_transitions?.paid_at || event.created) * 1000), providerInvoiceId: inv.id, receiptUrl: inv.hosted_invoice_url || null };
        if (![record.contributionPercent, record.prizePercent].every((n) => Number.isInteger(n) && n >= 0 && n <= 100) || record.contributionPercent + record.prizePercent > 100) throw new ApiError(400, 'INVALID_ALLOCATION', 'Provider contribution settings are invalid.');
        record.allocations = allocatePayment(record, new Date(line.period.start * 1000));
        await Payment.create([record], { session });
      }
      if (subscription) {
        await credit(invoice); await credit(currentInvoice);
        const item = subscription.items?.data?.[0];
        const start = item?.current_period_start || subscription.current_period_start, end = item?.current_period_end || subscription.current_period_end;
        if (!start || !end) throw new ApiError(400, 'INVALID_PROVIDER_PERIOD', 'Subscription has no billing period.');
        // Retrieve current provider state, not event ordering, before granting entitlement.
        const paid = currentInvoice?.status === 'paid' && subscription.status === 'active';
        await Subscription.findOneAndUpdate({ user: owner._id }, { $set: { mode: 'stripe', plan: metadata.plan, periodStart: new Date(start * 1000), periodEnd: new Date(end * 1000), cancelAtPeriodEnd: subscription.cancel_at_period_end, providerSubscriptionId: subscription.id, providerCustomerId: idOf(subscription.customer), providerStatus: subscription.status, providerPaid: paid } }, { upsert: true, new: true, runValidators: true, session });
        await Checkout.updateMany({ user: owner._id, purpose: 'subscription' }, { $set: { expiresAt: new Date(0) } }, { session });
        await captureEligibility(connection, owner._id, session);
      }
      if (donation?.payment_status === 'paid') {
        const key = 'stripe-donation-' + donation.id;
        if (!(await Payment.exists({ user: owner._id, key }).session(session))) await Payment.create([{ user: owner._id, key, fingerprint: donation.id, purpose: 'donation', mode: 'stripe', status: 'succeeded', amountMinor: donation.amount_total, currency: donation.currency.toUpperCase(), charity: metadata.charityId, charityName: metadata.charityName, contributionPercent: 100, prizePercent: 0, completedAt: new Date(event.created * 1000) }], { session });
      }
      await Event.create([{ _id: event.id, type: event.type, processedAt: new Date() }], { session });
    });
    return { received: true };
  }
  return { checkout, portal, cancel, processEvent, async webhook(raw, signature) {
    available(); let event;
    try { event = stripe.webhooks.constructEvent(raw, signature, config.stripeWebhookSecret); } catch { throw new ApiError(400, 'INVALID_SIGNATURE', 'Invalid payment signature.'); }
    return processEvent(event);
  } };
}
