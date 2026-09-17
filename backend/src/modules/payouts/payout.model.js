import { Schema } from 'mongoose';
const schema = new Schema(
  {
    winner: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      immutable: true,
    },
    user: { type: Schema.Types.ObjectId, required: true, immutable: true },
    amountMinor: { type: Number, required: true, immutable: true },
    currency: { type: String, required: true, immutable: true },
    status: { type: String, enum: ['pending', 'paid', 'expired'], default: 'pending' },
    mode: { type: String, enum: ['simulated'], default: 'simulated' },
    paidAt: Date,
    reference: { type: String, unique: true, sparse: true },
    actor: Schema.Types.ObjectId,
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
export function createPayoutModel(connection) {
  return connection.models.Payout || connection.model('Payout', schema);
}
