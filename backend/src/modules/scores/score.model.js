import { Schema } from 'mongoose';
const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, immutable: true },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 45,
      validate: Number.isInteger,
    },
    roundDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
schema.index({ user: 1, roundDate: -1 }, { unique: true });
export function createScoreModel(connection) {
  return connection.models.GolfScore || connection.model('GolfScore', schema);
}
export function publicScore(record) {
  return {
    id: String(record._id),
    value: record.value,
    roundDate: record.roundDate,
  };
}
