import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../../utils/ApiError.js';
import { calculateDraw } from './draw.engine.js';
import { touchDrawState } from './draw.model.js';
import { drawConfig, drawId } from './draw.validation.js';
import { validateBody } from '../auth/auth.validation.js';
import { recordAudit } from '../admin/audit.model.js';
import {
  createEligibilityModel,
  captureEligibility,
} from './eligibility.model.js';
const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function publicDraw(draw) {
  const preview = draw.preview;
  const result = preview?.result;
  return {
    id: String(draw._id),
    month: draw.month,
    strategy: draw.strategy,
    currency: draw.currency,
    scheduledAt: draw.scheduledAt,
    cutoffAt: draw.cutoffAt || null,
    status: draw.status,
    version: draw.version,
    publishedAt: draw.publishedAt || null,
    ...(result
      ? {
          cutoff: preview.cutoff,
          previewVersion: preview.id,
          entryCount: preview.entries.length,
          numbers: result.numbers,
          tiers: result.tiers,
          poolMinor: result.poolMinor,
          incomingRolloverMinor: result.incomingRolloverMinor,
          rolloverMinor: result.rolloverMinor,
          unclaimedMinor: result.unclaimedMinor,
          awardedMinor: result.awardedMinor,
          mode: 'simulated',
          ruleVersion: preview.ruleVersion,
          eligibility: { considered: preview.members.length, eligible: preview.entries.length, excluded: preview.members.filter((m) => m.reason !== 'eligible').reduce((totals, m) => { const reason = m.reason === 'insufficient_scores' ? 'Fewer than five scores at cutoff' : m.suspended ? 'Account suspended' : !m.subscription ? 'No membership at cutoff' : 'Membership inactive at cutoff'; totals[reason] = (totals[reason] || 0) + 1; return totals; }, {}) },
        }
      : {}),
  };
}
export function createDrawService(
  {
    Draw,
    Rollover,
    User,
    Score,
    Subscription,
    Payment,
    Winner,
    Payout,
    config,
  },
  { now = () => new Date(), integer } = {},
) {
  async function transaction(work) {
    let result;
    try {
      await Draw.db.transaction(async (session) => {
        await touchDrawState(Draw.db, session);
        result = await work(session);
      });
    } catch (error) {
      if (error.code === 11000)
        throw new ApiError(
          409,
          'DRAW_CONFLICT',
          'This month or result already exists. Refresh and retry.',
        );
      if (error.code === 20)
        throw new ApiError(
          503,
          'DRAW_DATABASE_UNAVAILABLE',
          'Draws require replica-set transactions.',
        );
      throw error;
    }
    return result;
  }
  async function source(draw, cutoff, session, checkAt = cutoff) {
    if (draw.cutoffAt) checkAt = cutoff;
    const users = await User.find({
      createdAt: { $lte: cutoff },
    })
      .select('+scoreRevision')
      .sort({ _id: 1 })
      .session(session)
      .lean();
    if (users.length > 1000)
      throw new ApiError(
        503,
        'DRAW_CAPACITY',
        'This deployment supports at most 1000 member snapshots per draw.',
      );
    const subscriptions = await Subscription.find({})
      .sort({ _id: 1 })
      .session(session)
      .lean();
    const scores = await Score.find({
      roundDate: { $lte: cutoff.toISOString().slice(0, 10) },
    })
      .sort({ roundDate: -1, _id: 1 })
      .session(session)
      .lean();
    const liveMembers = users.map((user) => {
      const sub = subscriptions.find(
        (row) => String(row.user) === String(user._id),
      );
      const rounds = scores
        .filter((row) => String(row.user) === String(user._id))
        .slice(0, 5)
        .map((row) => ({
          id: String(row._id),
          value: row.value,
          roundDate: row.roundDate,
        }));
      const active =
        (config.paymentMode === 'simulated' || (config.paymentMode === 'stripe' && sub?.mode === 'stripe' && sub.providerPaid && sub.providerStatus === 'active')) &&
        sub &&
        sub.periodStart <= cutoff &&
        sub.periodEnd > cutoff &&
        sub.periodEnd > checkAt;
      const reason = user.suspended
        ? 'ineligible'
        : !active
          ? 'ineligible'
          : rounds.length !== 5
            ? 'insufficient_scores'
            : 'eligible';
      return {
        user: String(user._id),
        revision: user.scoreRevision,
        updatedAt: user.updatedAt,
        role: user.role,
        suspended: user.suspended,
        reason,
        scores: rounds,
        subscription: sub
          ? {
              id: String(sub._id),
              periodStart: sub.periodStart,
              periodEnd: sub.periodEnd,
              plan: sub.plan,
              updatedAt: sub.updatedAt,
              mode: sub.mode,
              paymentId: sub.payment ? String(sub.payment) : null,
            }
          : null,
      };
    });
    let members = liveMembers.filter((member) => member.role === 'member');
    if (draw.cutoffAt) {
      const history = await createEligibilityModel(Draw.db)
        .find({ at: { $lte: cutoff } })
        .sort({ at: -1, _id: -1 })
        .session(session)
        .lean();
      members = users
        .map((user) => {
          const snapshot = history.find(
            (row) => String(row.user) === String(user._id),
          );
          if (!snapshot)
            return {
              user: String(user._id),
              reason: 'ineligible',
              role: user.role,
              scores: [],
              subscription: null,
            };
          const state = snapshot.state;
          const rounds = state.scores
            .filter((row) => row.roundDate <= cutoff.toISOString().slice(0, 10))
            .slice(0, 5);
          const sub = state.subscription;
          const active =
            (config.paymentMode === 'simulated' || (config.paymentMode === 'stripe' && sub?.mode === 'stripe' && sub.providerPaid && sub.providerStatus === 'active')) &&
            sub &&
            new Date(sub.periodStart) <= cutoff &&
            new Date(sub.periodEnd) > cutoff;
          return {
            user: String(user._id),
            role: state.role,
            scores: rounds,
            subscription: sub,
            reason:
              state.suspended || !active
                ? 'ineligible'
                : rounds.length !== 5
                  ? 'insufficient_scores'
                  : 'eligible',
          };
        })
        .filter((member) => member.role === 'member');
    }
    const payments = await Payment.find({
      purpose: 'subscription',
      status: 'succeeded',
      currency: draw.currency,
      completedAt: { $lte: cutoff },
    })
      .sort({ _id: 1 })
      .session(session)
      .lean();
    const ledger = payments.flatMap((payment) =>
      payment.allocations.flatMap((allocation, index) =>
        allocation.period === draw.month
          ? [
              {
                paymentId: String(payment._id),
                index,
                prizeMinor: allocation.prizeMinor,
                currency: payment.currency,
                mode: payment.mode,
              },
            ]
          : [],
      ),
    );
    const poolMinor = ledger.reduce((sum, row) => sum + row.prizeMinor, 0);
    const rollover = await Rollover.findById(draw.currency)
      .session(session)
      .lean();
    if (rollover?.lastMonth >= draw.month)
      throw new ApiError(
        409,
        'DRAW_ORDER',
        'Publish months in chronological order; a later month has already been published.',
      );
    const state = {
      members,
      liveMembers,
      ledger,
      rollover: rollover
        ? {
            amountMinor: rollover.amountMinor,
            lastMonth: rollover.lastMonth,
            sourceDraw: String(rollover.sourceDraw),
          }
        : null,
      strategy: draw.strategy,
      currency: draw.currency,
      version: draw.version,
      scheduledAt: draw.scheduledAt,
      cutoffAt: draw.cutoffAt || null,
    };
    return {
      members,
      ledger,
      poolMinor,
      rolloverMinor: rollover?.amountMinor || 0,
      fingerprint: hash(state),
    };
  }
  async function ownedResult(id, user) {
    const draw = await Draw.findOne({
      _id: drawId(id),
      status: 'published',
    }).lean();
    if (!draw)
      throw new ApiError(404, 'DRAW_NOT_FOUND', 'Published draw not found.');
    const member = draw.preview.members.find(
      (entry) => entry.user === String(user._id),
    );
    const outcome = draw.preview.result.outcomes.find(
      (entry) => entry.user === String(user._id),
    );
    const winner = await Winner.findOne({ draw: draw._id, user: user._id })
      .select('_id')
      .lean();
    return {
      drawId: id,
      status: member?.reason || 'ineligible',
      scores: member?.reason === 'eligible' ? member.scores : [],
      matches: outcome?.matches || [],
      tier: outcome?.tier || null,
      amountMinor: outcome?.amountMinor || 0,
      currency: draw.currency,
      winnerId: winner ? String(winner._id) : null,
      cutoff: draw.preview.cutoff,
    };
  }
  return {
    async create(body, actor) {
      const fields = drawConfig(body, config.currency);
      if (fields.cutoffAt && fields.cutoffAt < now())
        throw new ApiError(
          400,
          'PAST_CUTOFF',
          'Configure a future cutoff; historical cutoff reconstruction begins when a draft is configured.',
        );
      if (fields.month < now().toISOString().slice(0, 7))
        throw new ApiError(
          400,
          'PAST_DRAW',
          'Backdated draws are not supported.',
        );
      await Promise.all([Draw.init(), Winner.init(), Payout.init()]);
      return transaction(async (session) => {
        if (fields.cutoffAt) {
          const users = await User.find({}).select('_id').session(session);
          if (users.length > 1000)
            throw new ApiError(
              503,
              'DRAW_CAPACITY',
              'This deployment supports at most 1000 member snapshots.',
            );
          for (const user of users)
            await captureEligibility(Draw.db, user._id, session, now());
        }
        const draw = (await Draw.create([fields], { session }))[0];
        if (actor)
          await recordAudit(
            Draw.db,
            {
              actor,
              action: 'draw.create',
              entity: 'draw',
              entityId: draw._id,
              reason: 'Configured monthly draw',
              after: publicDraw(draw),
            },
            session,
          );
        return publicDraw(draw);
      });
    },
    async configure(id, body, actor) {
      const fields = drawConfig(body, config.currency);
      return transaction(async (session) => {
        const draw = await Draw.findOne({
          _id: drawId(id),
          status: 'draft',
        }).session(session);
        if (!draw)
          throw new ApiError(404, 'DRAW_NOT_FOUND', 'Draft not found.');
        if (fields.month !== draw.month)
          throw new ApiError(
            400,
            'IMMUTABLE_MONTH',
            'The draw month cannot change.',
          );
        if (
          fields.cutoffAt &&
          fields.cutoffAt < now() &&
          String(fields.cutoffAt) !== String(draw.cutoffAt)
        )
          throw new ApiError(
            400,
            'PAST_CUTOFF',
            'A changed cutoff must be in the future.',
          );
        if (fields.cutoffAt && !draw.cutoffAt)
          for (const user of await User.find({}).select('_id').session(session))
            await captureEligibility(Draw.db, user._id, session, now());
        const before = publicDraw(draw);
        draw.set(fields);
        draw.version++;
        draw.preview = null;
        await draw.save({ session });
        if (actor)
          await recordAudit(
            Draw.db,
            {
              actor,
              action: 'draw.configure',
              entity: 'draw',
              entityId: id,
              reason: 'Changed draft configuration',
              before,
              after: publicDraw(draw),
            },
            session,
          );
        return publicDraw(draw);
      });
    },
    async simulate(id, body, actor) {
      validateBody(body, []);
      return transaction(async (session) => {
        const draw = await Draw.findOne({
          _id: drawId(id),
          status: 'draft',
        }).session(session);
        if (!draw)
          throw new ApiError(404, 'DRAW_NOT_FOUND', 'Draft not found.');
        const cutoff = draw.cutoffAt || now();
        if (
          draw.month !== now().toISOString().slice(0, 7) ||
          draw.scheduledAt > now() ||
          cutoff > now()
        )
          throw new ApiError(
            409,
            'DRAW_NOT_DUE',
            'Simulate only a due draw in the current UTC month.',
          );
        const input = await source(draw, cutoff, session);
        const entries = input.members.filter(
          (row) => row.reason === 'eligible',
        );
        const result = calculateDraw(
          {
            entries,
            poolMinor: input.poolMinor,
            rolloverMinor: input.rolloverMinor,
            strategy: draw.strategy,
          },
          integer,
        );
        draw.preview = {
          id: randomUUID(),
          version: draw.version,
          cutoff,
          ruleVersion: 'distinct-5-v1',
          fingerprint: input.fingerprint,
          entries,
          members: input.members,
          ledger: input.ledger,
          result,
        };
        await draw.save({ session });
        if (actor)
          await recordAudit(
            Draw.db,
            {
              actor,
              action: 'draw.simulate',
              entity: 'draw',
              entityId: id,
              reason: 'Generated versioned review preview',
              after: publicDraw(draw),
            },
            session,
          );
        return publicDraw(draw);
      });
    },
    async publish(id, body, actor) {
      validateBody(body, ['previewVersion']);
      if (typeof body.previewVersion !== 'string')
        throw new ApiError(
          400,
          'PREVIEW_REQUIRED',
          'Supply the reviewed preview version.',
        );
      return transaction(async (session) => {
        const draw = await Draw.findById(drawId(id)).session(session);
        if (!draw) throw new ApiError(404, 'DRAW_NOT_FOUND', 'Draw not found.');
        if (!draw.preview || draw.preview.id !== body.previewVersion)
          throw new ApiError(
            409,
            'STALE_PREVIEW',
            'Simulate and review the current preview before publishing.',
          );
        if (draw.status === 'published') return publicDraw(draw);
        if (draw.month !== now().toISOString().slice(0, 7))
          throw new ApiError(
            409,
            'STALE_PREVIEW',
            'The preview month has closed.',
          );
        const current = await source(
          draw,
          new Date(draw.preview.cutoff),
          session,
          now(),
        );
        if (current.fingerprint !== draw.preview.fingerprint)
          throw new ApiError(
            409,
            'STALE_PREVIEW',
            'Eligibility, funding or configuration changed. Simulate again.',
          );
        for (const outcome of draw.preview.result.outcomes.filter(
          (row) => row.tier,
        )) {
          const entry = draw.preview.entries.find(
            (row) => row.user === outcome.user,
          );
          const [winner] = await Winner.create(
            [
              {
                draw: draw._id,
                user: outcome.user,
                month: draw.month,
                tier: outcome.tier,
                amountMinor: outcome.amountMinor,
                currency: draw.currency,
                claimDeadline: new Date(now().getTime() + 30 * 86400000),
                entry: {
                  ...entry,
                  numbers: draw.preview.result.numbers,
                  matches: outcome.matches,
                },
                timeline: [{ kind: 'winner_declared', at: now() }],
              },
            ],
            { session },
          );
          await Payout.create(
            [
              {
                winner: winner._id,
                user: winner.user,
                amountMinor: winner.amountMinor,
                currency: winner.currency,
              },
            ],
            { session },
          );
        }
        await Rollover.findOneAndUpdate(
          { _id: draw.currency },
          {
            $set: {
              amountMinor: draw.preview.result.rolloverMinor,
              lastMonth: draw.month,
              sourceDraw: draw._id,
            },
          },
          { upsert: true, session },
        );
        draw.status = 'published';
        draw.publishedAt = now();
        await draw.save({ session });
        if (actor)
          await recordAudit(
            Draw.db,
            {
              actor,
              action: 'draw.publish',
              entity: 'draw',
              entityId: id,
              reason:
                'Explicitly published reviewed preview ' + body.previewVersion,
              after: publicDraw(draw),
            },
            session,
          );
        return publicDraw(draw);
      });
    },
    async list({ page, limit }, admin = false) {
      const filter = admin ? {} : { status: 'published' };
      const [rows, total] = await Promise.all([
        Draw.find(filter)
          .sort({ month: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Draw.countDocuments(filter),
      ]);
      return { items: rows.map(publicDraw), page, limit, total };
    },
    async latest() {
      const draw = await Draw.findOne({ status: 'published' })
        .sort({ month: -1 })
        .lean();
      return draw ? publicDraw(draw) : null;
    },
    async detail(id, admin = false) {
      const draw = await Draw.findOne({
        _id: drawId(id),
        ...(admin ? {} : { status: 'published' }),
      }).lean();
      if (!draw) throw new ApiError(404, 'DRAW_NOT_FOUND', 'Draw not found.');
      return publicDraw(draw);
    },
    ownedResult,
    async dashboard(user) {
      const upcoming = await Draw.findOne({
        status: 'draft',
        scheduledAt: { $gt: now() },
      })
        .sort({ scheduledAt: 1 })
        .select('month scheduledAt')
        .lean();
      const count = await Draw.countDocuments({
        status: 'published',
        'preview.entries.user': String(user._id),
      });
      return {
        upcomingDraw: {
          status: 'ready',
          data: upcoming
            ? { month: upcoming.month, scheduledAt: upcoming.scheduledAt }
            : null,
        },
        participation: { status: 'ready', count },
      };
    },
  };
}
