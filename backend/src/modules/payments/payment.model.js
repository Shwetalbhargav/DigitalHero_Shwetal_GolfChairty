import { Schema } from 'mongoose';
const allocation = new Schema(
  {
    period: String,
    revenueMinor: Number,
    charityMinor: Number,
    prizeMinor: Number,
    platformMinor: Number,
  },
  { _id: false },
);
const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, index: true },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['donation', 'subscription'],
      required: true,
    },
    mode: { type: String, enum: ['simulated', 'stripe'], default: 'simulated' },
    providerInvoiceId: String,
    receiptUrl: String,
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending',
    },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    charity: { type: Schema.Types.ObjectId, required: true },
    charityName: { type: String, required: true },
    contributionPercent: { type: Number, required: true },
    prizePercent: { type: Number, default: 0 },
    plan: { type: String, enum: ['monthly', 'yearly'] },
    months: Number,
    attempts: { type: Number, default: 0 },
    completedAt: Date,
    expiresAt: Date,
    failureReason: String,
    allocations: { type: [allocation], default: [] },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
schema.index({ user: 1, key: 1 }, { unique: true });
export function createPaymentModel(connection) {
  return connection.models.Payment || connection.model('Payment', schema);
}
export function publicPayment(record) {
  return {
    id: String(record._id),
    purpose: record.purpose,
    mode: record.mode,
    receiptUrl: record.receiptUrl || null,
    status: record.status,
    amountMinor: record.amountMinor,
    currency: record.currency,
    charityId: String(record.charity),
    charityName: record.charityName,
    contributionPercent: record.contributionPercent,
    prizePercent: record.prizePercent,
    plan: record.plan,
    months: record.months,
    attempts: record.attempts,
    completedAt: record.completedAt || null,
    failureReason: record.failureReason || null,
    allocations: record.allocations.map((row) => ({
      period: row.period,
      revenueMinor: row.revenueMinor,
      charityMinor: row.charityMinor,
      prizeMinor: row.prizeMinor,
      platformMinor: row.platformMinor,
    })),
  };
}
