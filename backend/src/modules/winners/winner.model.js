import { Schema } from 'mongoose';
const event = new Schema(
  { kind: String, at: Date, reason: String, submissionId: String },
  { _id: false },
);
const submission = new Schema(
  {
    id: String,
    at: Date,
    provider: String,
    assetId: String,
    format: String,
    bytes: Number,
    digest: String,
  },
  { _id: false },
);
const schema = new Schema(
  {
    draw: { type: Schema.Types.ObjectId, required: true, immutable: true },
    user: { type: Schema.Types.ObjectId, required: true, immutable: true },
    month: { type: String, required: true, immutable: true },
    tier: { type: Number, enum: [3, 4, 5], required: true, immutable: true },
    amountMinor: { type: Number, required: true, min: 0, immutable: true },
    currency: { type: String, required: true, immutable: true },
    entry: { type: Schema.Types.Mixed, required: true, immutable: true },
    verification: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    claimDeadline: Date,
    expiredAt: Date,
    submissions: { type: [submission], default: [] },
    timeline: { type: [event], default: [] },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
schema.index({ draw: 1, user: 1 }, { unique: true });
export function createWinnerModel(connection) {
  return connection.models.Winner || connection.model('Winner', schema);
}
