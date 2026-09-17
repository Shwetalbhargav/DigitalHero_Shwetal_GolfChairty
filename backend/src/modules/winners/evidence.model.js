import { Schema } from 'mongoose';
const schema = new Schema(
  {
    _id: String,
    winner: Schema.Types.ObjectId,
    charity: Schema.Types.ObjectId,
    kind: { type: String, enum: ['proof', 'charity'], default: 'proof' },
    provider: { type: String, enum: ['local', 'cloudinary'] },
    state: {
      type: String,
      enum: ['staged', 'attached', 'cleanup'],
      default: 'staged',
    },
    bytes: Number,
    format: String,
    digest: String,
    data: { type: Buffer, select: false },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
export function createEvidenceModel(connection) {
  return (
    connection.models.EvidenceAsset || connection.model('EvidenceAsset', schema)
  );
}
