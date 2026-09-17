import { Schema } from 'mongoose';
import { createUserModel } from '../users/user.model.js';
import { createScoreModel } from '../scores/score.model.js';
import { createSubscriptionModel } from '../subscriptions/subscription.model.js';
const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true },
    at: { type: Date, required: true },
    state: { type: Schema.Types.Mixed, required: true },
  },
  { strict: 'throw', bufferCommands: false },
);
schema.index({ user: 1, at: -1 });
export function createEligibilityModel(connection) {
  return (
    connection.models.EligibilitySnapshot ||
    connection.model('EligibilitySnapshot', schema)
  );
}
export async function captureEligibility(
  connection,
  userId,
  session,
  at = new Date(),
) {
  const user = await createUserModel(connection)
    .findById(userId)
    .session(session)
    .lean();
  if (!user) return;
  const subscription = await createSubscriptionModel(connection)
    .findOne({ user: userId })
    .session(session)
    .lean();
  const scores = await createScoreModel(connection)
    .find({ user: userId })
    .sort({ roundDate: -1 })
    .session(session)
    .lean();
  const state = {
    suspended: user.suspended,
    role: user.role,
    scores: scores.map((row) => ({
      id: String(row._id),
      value: row.value,
      roundDate: row.roundDate,
    })),
    subscription: subscription
      ? {
          id: String(subscription._id),
          periodStart: subscription.periodStart,
          periodEnd: subscription.periodEnd,
          plan: subscription.plan,
          mode: subscription.mode,
          providerStatus: subscription.providerStatus,
          providerPaid: subscription.providerPaid,
          paymentId: subscription.payment ? String(subscription.payment) : null,
        }
      : null,
  };
  await createEligibilityModel(connection).create(
    [{ user: userId, at, state }],
    { session },
  );
}
