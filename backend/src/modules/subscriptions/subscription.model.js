import { Schema } from 'mongoose';
const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, unique: true },
    plan: { type: String, enum: ['monthly', 'yearly'], required: true },
    mode: {
      type: String,
      enum: ['simulated', 'manual-demo', 'stripe'],
      default: 'simulated',
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    payment: { type: Schema.Types.ObjectId },
    providerSubscriptionId: String,
    providerCustomerId: String,
    providerStatus: String,
    providerPaid: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
export function createSubscriptionModel(connection) {
  return (
    connection.models.Subscription || connection.model('Subscription', schema)
  );
}
export function subscriptionView(record, config, now = new Date()) {
  if (!record) return null;
  const enabled =
    record.mode === 'stripe' ? config.paymentMode === 'stripe' && record.providerStatus === 'active' && record.providerPaid : config.nodeEnv !== 'production' && config.paymentMode === 'simulated';
  const active = enabled && record.periodStart <= now && record.periodEnd > now;
  return {
    id: String(record._id),
    plan: record.plan,
    mode: record.mode,
    status: active ? 'active' : record.periodEnd <= now ? 'lapsed' : 'inactive',
    active,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    paymentId: record.payment ? String(record.payment) : null,
    renewalMode: record.mode === 'stripe' ? 'automatic' : 'manual-demo',
  };
}
