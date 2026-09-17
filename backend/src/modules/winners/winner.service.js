import { randomUUID } from 'node:crypto';
import { ApiError } from '../../utils/ApiError.js';
import { drawId } from '../draws/draw.validation.js';
import { validateBody } from '../auth/auth.validation.js';
import { validateEvidence } from './evidence.storage.js';
import { recordAudit } from '../admin/audit.model.js';
import { createUserModel } from '../users/user.model.js';
import { createDrawModels, touchDrawState } from '../draws/draw.model.js';
export function winnerView(winner, payout, config) {
  return {
    id: String(winner._id),
    drawId: String(winner.draw),
    month: winner.month,
    tier: winner.tier,
    amountMinor: winner.amountMinor,
    currency: winner.currency,
    entry: winner.entry,
    verification: winner.verification,
    rejectionReason: winner.rejectionReason,
    claimDeadline: winner.claimDeadline || null,
    expiredAt: winner.expiredAt || null,
    revision: winner.revision,
    submissions: winner.submissions.map((row) => ({
      id: row.id,
      at: row.at,
      bytes: row.bytes,
      format: row.format,
      provider: row.provider,
    })),
    timeline: winner.timeline.map((row) => ({
      kind: row.kind,
      at: row.at,
      reason: row.reason || null,
      submissionId: row.submissionId || null,
    })),
    payout: {
      status: payout?.status || 'pending',
      paidAt: payout?.paidAt || null,
      mode: 'simulated',
      reference: payout?.reference || null,
    },
    proofStorage: config.proofStorage,
    canSubmit:
      config.proofStorage !== 'disabled' &&
      winner.verification !== 'expired' &&
      (!winner.claimDeadline || winner.claimDeadline > new Date()) &&
      winner.submissions.length < 5 &&
      (winner.submissions.length === 0 || winner.verification === 'rejected'),
  };
}
export function createWinnerService(
  { Winner, Payout, Evidence, storage, config },
  { now = () => new Date() } = {},
) {
  async function get(id, user, admin = false) {
    const winner = await Winner.findOne({
      _id: drawId(id),
      ...(admin ? {} : { user: user._id }),
    });
    if (!winner)
      throw new ApiError(404, 'WINNER_NOT_FOUND', 'Winning entry not found.');
    return winner;
  }
  async function detail(id, user, admin = false) {
    const winner = await get(id, user, admin);
    const view = winnerView(
      winner,
      await Payout.findOne({ winner: winner._id }),
      config,
    );
    if (admin) view.member = await createUserModel(Winner.db).findById(winner.user).select('name email').lean();
    return view;
  }
  return {
    get,
    detail,
    async list(user, { page, limit, verification, payout }, admin = false) {
      const filter = admin ? {} : { user: user._id };
      if (admin && verification) filter.verification = verification;
      if (admin && payout)
        filter._id = {
          $in: (
            await Payout.find({ status: payout }).select('winner').lean()
          ).map((row) => row.winner),
        };
      const rows = await Winner.find(filter)
        .sort({ month: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit);
      const items = await Promise.all(
        rows.map(async (row) => ({ ...winnerView(row, await Payout.findOne({ winner: row._id }), config), ...(admin ? { member: await createUserModel(Winner.db).findById(row.user).select('name email').lean() } : {}) })),
      );
      return { items, page, limit, total: await Winner.countDocuments(filter) };
    },
    async submit(id, user, buffer, mime) {
      const winner = await get(id, user);
      if (winner.verification === 'expired' || (winner.claimDeadline && winner.claimDeadline <= now())) throw new ApiError(409, 'CLAIM_DEADLINE', 'The claim deadline has passed. Contact the review team.');
      storage.available();
      const evidence = await validateEvidence(buffer, mime);
      if (
        winner.verification === 'pending' &&
        winner.submissions.at(-1)?.digest === evidence.digest
      )
        return detail(id, user);
      if (
        winner.verification === 'approved' ||
        (winner.verification === 'pending' && winner.submissions.length) ||
        winner.submissions.length >= 5
      )
        throw new ApiError(
          409,
          'PROOF_STATE',
          'Proof is already under review, approved, or the five-submission limit was reached.',
        );
      const submissionId = randomUUID();
      const asset = await storage.upload(
        { id: 'digital-heroes-proof/' + submissionId, winner: winner._id },
        evidence,
      );
      try {
        await Winner.db.transaction(async (session) => {
          const updated = await Winner.findOneAndUpdate(
            { _id: winner._id, user: user._id, revision: winner.revision },
            {
              $set: { verification: 'pending', rejectionReason: null },
              $inc: { revision: 1 },
              $push: {
                submissions: {
                  id: submissionId,
                  at: now(),
                  provider: asset.provider,
                  assetId: asset._id,
                  format: evidence.format,
                  bytes: evidence.bytes,
                  digest: evidence.digest,
                },
                timeline: { kind: 'proof_submitted', at: now(), submissionId },
              },
            },
            { session, new: true },
          );
          if (!updated)
            throw new ApiError(
              409,
              'PROOF_CHANGED',
              'This claim changed during upload. Refresh before trying again.',
            );
          await Evidence.updateOne(
            { _id: asset._id, state: 'staged' },
            { $set: { state: 'attached' } },
            { session },
          );
        });
      } catch (error) {
        try {
          await storage.cleanup(asset);
        } catch {
          /* Retained cleanup job is safe to retry. */
        }
        if (error instanceof ApiError) throw error;
        throw new ApiError(
          503,
          'PROOF_SAVE_FAILED',
          'Evidence could not be attached. Verification was not changed. Please retry.',
        );
      }
      return detail(id, user);
    },
    async proof(id, user, submissionId, admin = false) {
      const winner = await get(id, user, admin);
      const submission = winner.submissions.find(
        (row) => row.id === submissionId,
      );
      if (!submission)
        throw new ApiError(404, 'PROOF_NOT_FOUND', 'Evidence not found.');
      return storage.read(submission.assetId);
    },
    async review(id, body, actor) {
      validateBody(body, ['decision', 'reason', 'revision']);
      if (
        !['approved', 'rejected'].includes(body.decision) ||
        !Number.isInteger(body.revision)
      )
        throw new ApiError(
          400,
          'INVALID_DECISION',
          'Use approved or rejected and the reviewed revision.',
        );
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (
        (body.decision === 'rejected' && reason.length < 3) ||
        reason.length > 1000
      )
        throw new ApiError(
          400,
          'INVALID_REASON',
          'A rejection needs a reason of 3–1000 characters.',
        );
      let winner;
      await Winner.db.transaction(async (session) => {
        const before = await Winner.findById(drawId(id))
          .session(session)
          .lean();
        winner = await Winner.findOneAndUpdate(
          {
            _id: drawId(id),
            verification: 'pending',
            revision: body.revision,
            'submissions.0': { $exists: true },
          },
          {
            $set: {
              verification: body.decision,
              rejectionReason: body.decision === 'rejected' ? reason : null,
              ...(body.decision === 'rejected' ? { claimDeadline: new Date(Math.max(before.claimDeadline?.getTime() || 0, now().getTime() + 7 * 86400000)) } : {}),
            },
            $inc: { revision: 1 },
            $push: {
              timeline: {
                kind: body.decision,
                at: now(),
                reason: body.decision === 'rejected' ? reason : null,
              },
            },
          },
          { new: true, session },
        );
        if (!winner)
          throw new ApiError(
            409,
            'VERIFICATION_STATE',
            'Review the latest submitted proof; this decision is stale or not allowed.',
          );
        if (actor)
          await recordAudit(
            Winner.db,
            {
              actor,
              reason: reason || 'Winning proof approved',
              action: 'winner.' + body.decision,
              entity: 'winner',
              entityId: id,
              before: {
                verification: before.verification,
                revision: before.revision,
              },
              after: {
                verification: winner.verification,
                revision: winner.revision,
                reason,
              },
            },
            session,
          );
      });
      return detail(id, null, true);
    },
    async expire(id, body, actor) {
      validateBody(body, ['reason']);
      if (typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.length > 1000) throw new ApiError(400, 'INVALID_REASON', 'Record why this claim is being closed.');
      await Winner.db.transaction(async (session) => {
        await touchDrawState(Winner.db, session);
        const winner = await Winner.findOne({ _id: drawId(id), verification: { $in: ['pending', 'rejected'] }, claimDeadline: { $lte: now() } }).session(session);
        if (!winner || (winner.verification === 'pending' && winner.submissions.length)) throw new ApiError(409, 'CLAIM_NOT_EXPIRABLE', 'Only overdue unsubmitted or rejected claims can expire. Submitted proof under review stays protected.');
        const payout = await Payout.findOneAndUpdate({ winner: winner._id, status: 'pending' }, { $set: { status: 'expired' } }, { new: true, session });
        if (!payout) throw new ApiError(409, 'CLAIM_CHANGED', 'This claim has already been settled.');
        if (winner.tier === 5) {
          const { Rollover } = createDrawModels(Winner.db);
          await Rollover.updateOne({ _id: winner.currency }, { $inc: { amountMinor: winner.amountMinor } }, { upsert: true, session });
        }
        winner.verification = 'expired'; winner.expiredAt = now(); winner.revision++;
        winner.timeline.push({ kind: 'expired', at: now(), reason: body.reason.trim() }); await winner.save({ session });
        await recordAudit(Winner.db, { actor, reason: body.reason.trim(), action: 'winner.expired', entity: 'winner', entityId: id, before: { payout: 'pending' }, after: { payout: 'expired', returnedToJackpot: winner.tier === 5 ? winner.amountMinor : 0 } }, session);
      });
      return detail(id, null, true);
    },
    async pay(id, body, actor) {
      validateBody(body, ['mode', 'reference']);
      if (
        typeof body.reference !== 'string' ||
        body.reference.trim().length < 3 ||
        body.reference.length > 120
      )
        throw new ApiError(
          400,
          'PAYOUT_REFERENCE_REQUIRED',
          'Supply a settlement reference of 3–120 characters.',
        );
      if (
        body.mode !== 'simulated' ||
        config.nodeEnv === 'production' ||
        config.paymentMode !== 'simulated'
      )
        throw new ApiError(
          503,
          'PAYOUT_DISABLED',
          'Only explicitly simulated payouts are supported in this environment.',
        );
      await Winner.db.transaction(async (session) => {
        const winner = await Winner.findOneAndUpdate(
          { _id: drawId(id), verification: 'approved' },
          { $inc: { revision: 1 } },
          { session, new: true },
        );
        if (!winner)
          throw new ApiError(
            409,
            'PAYOUT_NOT_APPROVED',
            'Approve the winning proof before payout.',
          );
        const payout = await Payout.findOneAndUpdate(
          { winner: winner._id, status: 'pending' },
          {
            $set: {
              status: 'paid',
              paidAt: now(),
              reference: body.reference.trim(),
              actor: actor?._id,
            },
          },
          { new: true, session },
        );
        if (!payout)
          throw new ApiError(
            409,
            'PAYOUT_ALREADY_PAID',
            'This payout has already completed.',
          );
        winner.timeline.push({ kind: 'simulated_payout_paid', at: now() });
        await winner.save({ session });
        if (actor)
          await recordAudit(
            Winner.db,
            {
              actor,
              reason:
                'Recorded manual/demo settlement ' + body.reference.trim(),
              action: 'payout.recorded',
              entity: 'winner',
              entityId: id,
              before: { status: 'pending' },
              after: {
                status: 'paid',
                reference: payout.reference,
                amountMinor: payout.amountMinor,
                mode: 'simulated',
              },
            },
            session,
          );
      });
      return detail(id, null, true);
    },
    async summary(user) {
      const rows = await Winner.find({ user: user._id, verification: { $ne: 'expired' } }).lean();
      const payouts = await Payout.find({
        user: user._id,
        status: 'paid',
      }).lean();
      const currencies = [
        ...new Set([...rows, ...payouts].map((row) => row.currency)),
      ];
      return {
        mode: 'simulated',
        totals: currencies.map((currency) => ({
          currency,
          wonMinor: rows
            .filter((row) => row.currency === currency)
            .reduce((sum, row) => sum + row.amountMinor, 0),
          paidMinor: payouts
            .filter((row) => row.currency === currency)
            .reduce((sum, row) => sum + row.amountMinor, 0),
        })),
        count: rows.length,
        needsProof: rows.filter((row) => row.verification === 'rejected' || (row.verification === 'pending' && !row.submissions.length)).map((row) => String(row._id)),
      };
    },
  };
}
