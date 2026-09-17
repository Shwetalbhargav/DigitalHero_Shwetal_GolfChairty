import { ApiError } from '../../utils/ApiError.js';
import { validateBody, validateContribution } from '../auth/auth.validation.js';
import { validateProfile } from '../users/user.validation.js';
import { publicUser } from '../users/user.model.js';
import { drawId, pageQuery } from '../draws/draw.validation.js';
import { escapeSearch } from '../charities/charity.validation.js';
import { touchDrawState } from '../draws/draw.model.js';
import { captureEligibility } from '../draws/eligibility.model.js';
import { createAuditModel, auditReason, recordAudit } from './audit.model.js';
import { createSubscriptionModel, subscriptionView } from '../subscriptions/subscription.model.js';
export function adminUserView(user) {
  return { ...publicUser(user), suspended: user.suspended };
}
export function adminQuery(query, extra = []) {
  const allowed = ['page', 'limit', 'q', ...extra];
  if (
    Object.keys(query).some(
      (key) => !allowed.includes(key) || typeof query[key] !== 'string',
    )
  )
    throw new ApiError(
      400,
      'INVALID_QUERY',
      'Unsupported or repeated search parameters.',
    );
  const { page, limit } = pageQuery({ page: query.page, limit: query.limit });
  const q = query.q?.trim() || '';
  if (q.length > 100)
    throw new ApiError(
      400,
      'INVALID_QUERY',
      'Search is limited to 100 characters.',
    );
  return { page, limit, q };
}
export function createAdminUserService({
  User,
  Charity,
  config,
  scores,
  subscriptions,
}) {
  const Audit = createAuditModel(User.db);
  async function get(id) {
    const user = await User.findById(drawId(id));
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Account not found.');
    return user;
  }
  return {
    async list(query) {
      const { page, limit, q } = adminQuery(query, ['role', 'status', 'subscription']);
      for (const [key, values] of [['role', ['member', 'admin']], ['status', ['active', 'suspended']], ['subscription', ['active', 'lapsed', 'none']]]) if (query[key] && !values.includes(query[key])) throw new ApiError(400, 'INVALID_QUERY', 'Invalid member filter.');
      const filter = q
        ? {
            $or: [
              { name: { $regex: escapeSearch(q), $options: 'i' } },
              { email: { $regex: escapeSearch(q), $options: 'i' } },
            ],
          }
        : {};
      if (query.role) filter.role = query.role;
      if (query.status) filter.suspended = query.status === 'suspended';
      const Sub = createSubscriptionModel(User.db);
      if (query.subscription) {
        const at = new Date();
        const matching = await Sub.find(query.subscription === 'active' ? { periodStart: { $lte: at }, periodEnd: { $gt: at } } : query.subscription === 'lapsed' ? { periodEnd: { $lte: at } } : {}).select('user').lean();
        filter._id = { [query.subscription === 'none' ? '$nin' : '$in']: matching.map((s) => s.user) };
      }
      const rows = await User.find(filter).sort({ name: 1, _id: 1 }).skip((page - 1) * limit).limit(limit);
      const memberships = await Sub.find({ user: { $in: rows.map((u) => u._id) } });
      return {
        items: rows.map((u) => ({ ...adminUserView(u), subscription: subscriptionView(memberships.find((s) => String(s.user) === String(u._id)), config) })),
        page,
        limit,
        total: await User.countDocuments(filter),
      };
    },
    async detail(id) {
      const user = await get(id);
      return {
        user: adminUserView(user),
        subscription: await subscriptions.current(user),
        scores: (await scores.list(user)).items,
        audit: await Audit.find({ entity: 'user', entityId: String(user._id) })
          .sort({ at: -1, _id: -1 })
          .limit(100)
          .lean(),
      };
    },
    async update(id, body, actor) {
      validateBody(body, [
        'name',
        'displayDateFormat',
        'charityId',
        'contributionPercent',
        'role',
        'suspended',
        'reason',
      ]);
      const reason = auditReason(body.reason);
      const fields = {};
      if (body.name !== undefined || body.displayDateFormat !== undefined)
        Object.assign(
          fields,
          validateProfile({
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.displayDateFormat !== undefined
              ? { displayDateFormat: body.displayDateFormat }
              : {}),
          }),
        );
      if (body.charityId !== undefined) fields.charity = drawId(body.charityId);
      if (body.contributionPercent !== undefined)
        fields.contributionPercent = validateContribution(
          body.contributionPercent,
          config.maxContributionPercent,
        );
      if (body.role !== undefined) {
        if (!['member', 'admin'].includes(body.role))
          throw new ApiError(400, 'INVALID_ROLE', 'Use member or admin.');
        fields.role = body.role;
      }
      if (body.suspended !== undefined) {
        if (typeof body.suspended !== 'boolean')
          throw new ApiError(
            400,
            'INVALID_STATUS',
            'Suspended must be boolean.',
          );
        fields.suspended = body.suspended;
      }
      if (!Object.keys(fields).length)
        throw new ApiError(400, 'INVALID_INPUT', 'Supply an editable field.');
      await User.db.transaction(async (session) => {
        await touchDrawState(User.db, session);
        const user = await User.findById(drawId(id)).session(session);
        if (!user)
          throw new ApiError(404, 'USER_NOT_FOUND', 'Account not found.');
        if (fields.suspended && String(actor._id) === String(user._id))
          throw new ApiError(
            409,
            'SELF_SUSPENSION',
            'You cannot suspend your own account.',
          );
        if (
          user.role === 'admin' &&
          !user.suspended &&
          (fields.suspended || fields.role === 'member') &&
          (await User.countDocuments({
            role: 'admin',
            suspended: false,
          }).session(session)) <= 1
        )
          throw new ApiError(
            409,
            'FINAL_ADMIN',
            'The final usable administrator cannot be disabled or demoted.',
          );
        if (
          fields.charity &&
          !(await Charity.findOneAndUpdate(
            { _id: fields.charity, active: true },
            { $set: { hasReferences: true } },
          ).session(session))
        )
          throw new ApiError(
            400,
            'INVALID_CHARITY',
            'Choose an active charity.',
          );
        const before = adminUserView(user);
        user.set(fields);
        if (fields.suspended !== undefined || fields.role !== undefined)
          user.tokenVersion =
            (
              await User.findById(user._id)
                .select('+tokenVersion')
                .session(session)
            ).tokenVersion + 1;
        await user.save({ session });
        await captureEligibility(User.db, user._id, session);
        await recordAudit(
          User.db,
          {
            actor,
            reason,
            action: 'user.update',
            entity: 'user',
            entityId: id,
            before,
            after: adminUserView(user),
          },
          session,
        );
      });
      return this.detail(id);
    },
    async correctScore(id, scoreId, body, actor) {
      validateBody(body, ['value', 'roundDate', 'reason']);
      const reason = auditReason(body.reason);
      const user = await get(id);
      const fields = {};
      if (body.value !== undefined) fields.value = body.value;
      if (body.roundDate !== undefined) fields.roundDate = body.roundDate;
      return scores.update(user, drawId(scoreId), fields, { actor, reason });
    },
    async subscription(id, body, actor) {
      return subscriptions.adjust(await get(id), body, actor);
    },
  };
}
