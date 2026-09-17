import { ApiError } from '../../utils/ApiError.js';
export function reportRange(query, now = new Date()) {
  if (Object.keys(query).some((key) => !['from', 'to'].includes(key)))
    throw new ApiError(400, 'INVALID_RANGE', 'Only from and to are supported.');
  const today = now.toISOString().slice(0, 10);
  const from = query.from || today.slice(0, 7) + '-01',
    to = query.to || today;
  for (const value of [from, to])
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value + 'T00:00:00Z')) ||
      new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value
    )
      throw new ApiError(
        400,
        'INVALID_RANGE',
        'Use real date-only YYYY-MM-DD boundaries.',
      );
  const start = new Date(from + 'T00:00:00Z'),
    end = new Date(to + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 1);
  if (end <= start || end - start > 3660 * 86400000)
    throw new ApiError(
      400,
      'INVALID_RANGE',
      'Use an ordered range no longer than ten years.',
    );
  return { from, to, start, end };
}
export function createReportService({
  User,
  Subscription,
  Payment,
  Draw,
  Winner,
  Payout,
  Rollover,
  config,
}) {
  return {
    async overview() {
      const now = new Date();
      const active = await Subscription.find({ periodStart: { $lte: now }, periodEnd: { $gt: now } }).select('user').lean();
      const approved = await Winner.find({ verification: 'approved' }).select('_id').lean();
      return {
        activeMembers: await User.countDocuments({ _id: { $in: active.map((s) => s.user) }, role: 'member', suspended: false }),
        pendingProofs: await Winner.countDocuments({ verification: 'pending', 'submissions.0': { $exists: true } }),
        awaitingProof: await Winner.countDocuments({ verification: { $in: ['pending', 'rejected'] }, 'submissions.0': { $exists: false } }),
        unpaidAwards: await Payout.countDocuments({ status: 'pending', winner: { $in: approved.map((w) => w._id) } }),
        nextDraw: await Draw.findOne({ status: { $ne: 'published' }, scheduledAt: { $gt: now } }).sort({ scheduledAt: 1 }).select('month scheduledAt').lean(),
        rollovers: await Rollover.find({}).lean(),
      };
    },
    async report(query) {
      const now = new Date(),
        range = reportRange(query, now);
      const within = (date) =>
        new Date(date) >= range.start && new Date(date) < range.end;
      // Read all ledgers at one database snapshot so concurrent publish/pay cannot split totals.
      let result;
      await User.db.transaction(async (session) => {
        const payments = await Payment.find({ status: 'succeeded' })
          .session(session)
          .lean();
        const draws = await Draw.find({
          status: 'published',
          publishedAt: { $gte: range.start, $lt: range.end },
        })
          .session(session)
          .lean();
        const winners = await Winner.find({
          draw: { $in: draws.map((row) => row._id) },
        })
          .session(session)
          .lean();
        const paid = await Payout.find({
          status: 'paid',
          paidAt: { $gte: range.start, $lt: range.end },
        })
          .session(session)
          .lean();
        const rollovers = await Rollover.find({}).session(session).lean();
        const currencies = [
          ...new Set([
            config.currency,
            ...payments.map((row) => row.currency),
            ...winners.map((row) => row.currency),
            ...paid.map((row) => row.currency),
            ...rollovers.map((row) => row._id),
          ]),
        ];
        const totals = currencies.map((currency) => {
          const subs = payments
            .filter(
              (row) =>
                row.currency === currency && row.purpose === 'subscription',
            )
            .flatMap((payment) =>
              payment.allocations
                .filter((row) => within(row.period + '-01T00:00:00Z'))
                .map((row) => ({
                  ...row,
                  charityId: String(payment.charity),
                  charityName: payment.charityName,
                })),
            );
          const donations = payments.filter(
            (row) =>
              row.currency === currency &&
              row.purpose === 'donation' &&
              within(row.completedAt),
          );
          const sum = (rows, key) =>
            rows.reduce((total, row) => total + row[key], 0);
          const charityIds = [
            ...new Set([
              ...subs.map((row) => row.charityId),
              ...donations.map((row) => String(row.charity)),
            ]),
          ];
          return {
            currency,
            months: [...new Set([...subs.map((s) => s.period), ...donations.map((d) => d.completedAt.toISOString().slice(0, 7))])].sort().map((month) => ({ month, subscriptionMinor: sum(subs.filter((s) => s.period === month), 'revenueMinor'), charityMinor: sum(subs.filter((s) => s.period === month), 'charityMinor'), donationMinor: sum(donations.filter((d) => d.completedAt.toISOString().slice(0, 7) === month), 'amountMinor') })),
            subscriptionRevenueMinor: sum(subs, 'revenueMinor'),
            subscriptionCharityMinor: sum(subs, 'charityMinor'),
            prizeAllocationMinor: sum(subs, 'prizeMinor'),
            platformAllocationMinor: sum(subs, 'platformMinor'),
            donationsMinor: sum(donations, 'amountMinor'),
            awardedMinor: sum(
              winners.filter((row) => row.currency === currency),
              'amountMinor',
            ),
            paidMinor: sum(
              paid.filter((row) => row.currency === currency),
              'amountMinor',
            ),
            outstandingRolloverMinor:
              rollovers.find((row) => row._id === currency)?.amountMinor || 0,
            unclaimedThreeFourMinor: draws
              .filter((row) => row.currency === currency)
              .reduce((sum, row) => sum + row.preview.result.unclaimedMinor, 0),
            charities: charityIds.map((id) => ({
              id,
              name:
                subs.find((row) => row.charityId === id)?.charityName ||
                donations.find((row) => String(row.charity) === id)
                  ?.charityName,
              subscriptionMinor: sum(
                subs.filter((row) => row.charityId === id),
                'charityMinor',
              ),
              donationMinor: sum(
                donations.filter((row) => String(row.charity) === id),
                'amountMinor',
              ),
            })),
          };
        });
        const activeIds = (
          await Subscription.find({
            periodStart: { $lte: now },
            periodEnd: { $gt: now },
          })
            .session(session)
            .select('user')
            .lean()
        ).map((row) => row.user);
        result = {
          from: range.from,
          to: range.to,
          asOf: now,
          mode: 'simulated',
          users: await User.countDocuments({}).session(session),
          usersCreated: await User.countDocuments({
            createdAt: { $gte: range.start, $lt: range.end },
          }).session(session),
          activeSubscriptions:
            config.paymentMode === 'simulated'
              ? await User.countDocuments({
                  _id: { $in: activeIds },
                  suspended: false,
                  role: 'member',
                }).session(session)
              : 0,
          publishedDraws: draws.length,
          entries: draws.reduce(
            (sum, row) => sum + row.preview.entries.length,
            0,
          ),
          winningEntries: winners.length,
          totals,
          definitions: {
            range:
              'Inclusive UTC dates; the end date is converted to the next exclusive midnight.',
            users:
              'Current accounts; usersCreated uses the selected creation-date range.',
            activeSubscriptions:
              'Current active, unsuspended member accounts; includes explicit manual-demo overrides, which create no revenue.',
            subscriptionAllocation:
              'Successful subscription ledger rows dated at the first UTC day of their allocation month. Annual payment revenue is counted once across twelve rows; future rows are scheduled allocations.',
            donations:
              'Successful independent donations by completedAt; not subscription revenue and not prize allocation.',
            awarded:
              'Winner awards from draws published in the selected range.',
            paid: 'Simulated/manual settlement records paid within the selected range, which may belong to older draws.',
            rollover:
              'Current outstanding jackpot balance, independent of the date range; never added to prize allocation or revenue.',
            unclaimed:
              'Published unclaimed three/four-tier funds in the range; not carried into the jackpot.',
          },
        };
      });
      return result;
    },
  };
}
