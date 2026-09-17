import { ApiError } from '../../utils/ApiError.js';
import { touchDrawState } from '../draws/draw.model.js';
import { captureEligibility } from '../draws/eligibility.model.js';
import { recordAudit, auditReason } from '../admin/audit.model.js';
import { validateScore, parseScoreId } from './score.validation.js';
import { publicScore } from './score.model.js';
import { subscriptionView } from '../subscriptions/subscription.model.js';
export function createScoreService(
  Score,
  User,
  Subscription,
  config,
  { now = () => new Date() } = {},
) {
  async function list(user) {
    const items = await Score.find({ user: user._id })
      .sort({ roundDate: -1 })
      .limit(5)
      .lean();
    const subscription = subscriptionView(
      await Subscription.findOne({ user: user._id }).lean(),
      config,
      now(),
    );
    return {
      items: items.map(publicScore),
      count: items.length,
      remaining: 5 - items.length,
      subscription,
      today: now().toISOString().slice(0, 10),
    };
  }
  async function mutate(user, operation, body, id, context) {
    if (context) {
      if (context.actor?.role !== 'admin')
        throw new ApiError(
          403,
          'ADMIN_REQUIRED',
          'Administrator access required.',
        );
      auditReason(context.reason);
    }
    const values =
      operation === 'delete'
        ? null
        : validateScore(body, { partial: operation === 'update', now: now() });
    if (id) id = parseScoreId(id).toLowerCase();
    await Score.init();
    let result;
    try {
      await Score.db.transaction(async (session) => {
        await touchDrawState(Score.db, session);
        // Every writer first changes the same user document. MongoDB retries competing
        // transactions, preventing write skew where two inserts both observe four rows.
        const locked = await User.findOneAndUpdate(
          { _id: user._id, ...(context ? {} : { suspended: false }) },
          { $inc: { scoreRevision: 1 } },
          { new: true, session },
        );
        if (!locked)
          throw new ApiError(
            403,
            'ACCOUNT_UNAVAILABLE',
            'Your account is unavailable.',
          );
        const subscription = await Subscription.findOne({
          user: user._id,
        }).session(session);
        if (!context && !subscriptionView(subscription, config, now())?.active)
          throw new ApiError(
            403,
            'SUBSCRIPTION_REQUIRED',
            'An active subscription is required to change scores.',
          );
        const rows = await Score.find({ user: user._id })
          .sort({ roundDate: -1 })
          .session(session);
        const before = rows.map(publicScore);
        const existing = id ? rows.find((row) => String(row._id) === id) : null;
        if (id && !existing)
          throw new ApiError(404, 'SCORE_NOT_FOUND', 'Score not found.');
        if (operation === 'delete') {
          await Score.deleteOne(
            { _id: existing._id, user: user._id },
            { session },
          );
          result = { deletedId: id };
          await captureEligibility(Score.db, user._id, session);
          if (context)
            await recordAudit(
              Score.db,
              {
                ...context,
                action: 'score.delete',
                entity: 'user',
                entityId: user._id,
                before,
                after: before.filter((row) => row.id !== id),
              },
              session,
            );
          return;
        }
        const next = existing
          ? { value: existing.value, roundDate: existing.roundDate, ...values }
          : values;
        if (
          rows.some(
            (row) => row.roundDate === next.roundDate && String(row._id) !== id,
          )
        )
          throw new ApiError(
            409,
            'DUPLICATE_ROUND_DATE',
            'You already have a score for this round date. Edit that score instead.',
          );
        if (rows.length >= 5 && next.roundDate < rows.at(-1).roundDate)
          throw new ApiError(
            400,
            'ROUND_TOO_OLD',
            'This date is older than your full retained set of five scores.',
          );
        if (existing) {
          existing.set(next);
          await existing.save({ session });
          result = { score: publicScore(existing), evictedId: null };
        } else {
          const [created] = await Score.create([{ ...next, user: user._id }], {
            session,
          });
          let evictedId = null;
          if (rows.length >= 5) {
            const oldest = rows.at(-1);
            await Score.deleteOne({ _id: oldest._id }, { session });
            evictedId = String(oldest._id);
          }
          result = { score: publicScore(created), evictedId };
        }
        await captureEligibility(Score.db, user._id, session);
        if (context)
          await recordAudit(
            Score.db,
            {
              ...context,
              action: 'score.' + operation,
              entity: 'user',
              entityId: user._id,
              before,
              after: (
                await Score.find({ user: user._id })
                  .sort({ roundDate: -1 })
                  .session(session)
              ).map(publicScore),
            },
            session,
          );
      });
    } catch (error) {
      if (error.code === 11000)
        throw new ApiError(
          409,
          'DUPLICATE_ROUND_DATE',
          'You already have a score for this round date.',
        );
      if (error.code === 20 || error.codeName === 'IllegalOperation')
        throw new ApiError(
          503,
          'SCORE_DATABASE_UNAVAILABLE',
          'Score changes require MongoDB with replica-set transactions.',
        );
      throw error;
    }
    return result;
  }
  return {
    list,
    create: (user, body) => mutate(user, 'create', body),
    update: (user, id, body, context) =>
      mutate(user, 'update', body, id, context),
    remove: (user, id) => mutate(user, 'delete', null, id),
  };
}
