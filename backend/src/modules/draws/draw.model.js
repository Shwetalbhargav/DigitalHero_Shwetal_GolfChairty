import { Schema } from 'mongoose';
const options = { timestamps: true, strict: 'throw', bufferCommands: false };
const drawSchema = new Schema(
  {
    month: { type: String, unique: true, required: true },
    strategy: { type: String, enum: ['random', 'weighted'], required: true },
    currency: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    cutoffAt: Date,
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    version: { type: Number, default: 1 },
    preview: { type: Schema.Types.Mixed, default: null },
    publishedAt: Date,
  },
  options,
);
const stateSchema = new Schema(
  { _id: String, revision: { type: Number, default: 0 } },
  options,
);
const rolloverSchema = new Schema(
  {
    _id: String,
    amountMinor: { type: Number, default: 0 },
    lastMonth: String,
    sourceDraw: Schema.Types.ObjectId,
  },
  options,
);
export function createDrawModels(connection) {
  return {
    Draw: connection.models.Draw || connection.model('Draw', drawSchema),
    Rollover:
      connection.models.Rollover ||
      connection.model('Rollover', rolloverSchema),
    DrawState:
      connection.models.DrawState || connection.model('DrawState', stateSchema),
  };
}
export async function touchDrawState(connection, session) {
  const { DrawState } = createDrawModels(connection);
  await DrawState.updateOne(
    { _id: 'eligibility' },
    { $inc: { revision: 1 } },
    { upsert: true, session },
  );
}
