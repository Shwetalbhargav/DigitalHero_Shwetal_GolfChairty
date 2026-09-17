import { Router } from 'express';
import { Schema } from 'mongoose';
import { apiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { createPaymentModel } from '../payments/payment.model.js';
import { createWinnerModel } from '../winners/winner.model.js';
import { createSubscriptionModel } from '../subscriptions/subscription.model.js';
import { createDrawModels } from '../draws/draw.model.js';
export function createMemberExperienceRoutes(connection, authenticate) {
  const router = Router();
  const Payment = createPaymentModel(connection), Winner = createWinnerModel(connection), Subscription = createSubscriptionModel(connection), { Draw } = createDrawModels(connection);
  const Read = connection.models.NotificationRead || connection.model('NotificationRead', new Schema({ user: { type: Schema.Types.ObjectId, required: true }, key: { type: String, required: true } }, { timestamps: true }).index({ user: 1, key: 1 }, { unique: true }));
  router.use(authenticate);
  router.get('/giving', async (req, res) => {
    const payments = await Payment.find({ user: req.user._id, status: 'succeeded' }).sort({ completedAt: -1 }).lean();
    const items = payments.flatMap((p) => p.purpose === 'donation' ? [{ id: String(p._id), date: p.completedAt, charity: p.charityName, currency: p.currency, amountMinor: p.amountMinor, kind: 'Independent donation', scheduled: false }] : p.allocations.map((a, index) => ({ id: p._id + '-' + index, date: a.period + '-01', charity: p.charityName, currency: p.currency, amountMinor: a.charityMinor, kind: 'Membership contribution', scheduled: a.period > new Date().toISOString().slice(0, 7) })));
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(apiResponse({ items, totals: [...new Set(items.map((i) => i.currency))].map((currency) => ({ currency, recordedMinor: items.filter((i) => i.currency === currency && !i.scheduled).reduce((n, i) => n + i.amountMinor, 0), scheduledMinor: items.filter((i) => i.currency === currency && i.scheduled).reduce((n, i) => n + i.amountMinor, 0) })) }, req.id));
  });
  router.get('/notifications', async (req, res) => {
    const [winners, sub, failures, read, draws] = await Promise.all([
      Winner.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(), Subscription.findOne({ user: req.user._id }).lean(), Payment.find({ user: req.user._id, status: 'failed' }).sort({ updatedAt: -1 }).limit(10).lean(), Read.find({ user: req.user._id }).lean(), Draw.find({ status: 'published' }).sort({ month: -1 }).limit(12).lean(),
    ]);
    const items = winners.flatMap((w) => w.timeline.map((event, index) => ({ id: w._id + '-' + index, title: ({ winner_declared: 'You have a winning entry — submit your scorecard', proof_submitted: 'Your proof is under review', rejected: 'Your proof needs another look', approved: 'Your proof was approved', simulated_payout_paid: 'Your demo payout was recorded' })[event.kind] || event.kind.replaceAll('_', ' '), message: event.reason || w.month + ' · ' + w.tier + '-match award', at: event.at, href: '/dashboard/winnings/' + w._id })));
    for (const draw of draws) items.push({ id: 'draw-' + draw._id, title: 'Monthly draw results published', message: draw.month + ' results are ready to view.', at: draw.publishedAt, href: '/dashboard/draws/' + draw._id });
    for (const payment of failures) items.push({ id: 'payment-' + payment._id + '-' + payment.attempts, title: 'Payment needs attention', message: payment.failureReason || 'Review your payment and retry.', at: payment.updatedAt, href: '/payments/' + payment._id });
    if (sub && sub.periodEnd <= new Date(Date.now() + 7 * 86400000)) items.push({ id: 'renewal-' + sub._id + '-' + sub.periodEnd.toISOString(), title: sub.periodEnd <= new Date() ? 'Your membership has ended' : 'Your membership period ends soon', message: 'Review your subscription to keep your membership active.', at: sub.periodEnd, href: '/dashboard/subscription' });
    const seen = new Set(read.map((r) => r.key));
    res.json(apiResponse({ items: items.sort((a, b) => new Date(b.at) - new Date(a.at)).map((i) => ({ ...i, read: seen.has(i.id) })) }, req.id));
  });
  router.post('/notifications/read', async (req, res) => {
    const key = req.body?.id;
    if (typeof key !== 'string' || key.length > 180 || !/^[a-zA-Z0-9:.-]+$/.test(key)) throw new ApiError(400, 'INVALID_NOTIFICATION', 'Choose a valid notification.');
    await Read.updateOne({ user: req.user._id, key }, { $setOnInsert: { user: req.user._id, key } }, { upsert: true });
    res.json(apiResponse({ read: true }, req.id));
  });
  return router;
}
