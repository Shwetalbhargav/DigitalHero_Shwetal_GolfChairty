import { Schema } from 'mongoose';
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    displayDateFormat: {
      type: String,
      enum: ['day-first', 'iso'],
      default: 'day-first',
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    resetHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
    resetVersion: { type: Number, select: false },
    pendingEmail: { type: String, select: false },
    emailHash: { type: String, select: false },
    emailExpires: { type: Date, select: false },
    emailVersion: { type: Number, select: false },
    emailVerifiedAt: Date,
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    suspended: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0, select: false },
    scoreRevision: { type: Number, default: 0, select: false },
    charity: { type: Schema.Types.ObjectId, ref: 'Charity', required: true },
    contributionPercent: { type: Number, required: true, min: 10, max: 100 },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
export function createUserModel(connection) {
  return connection.models.User || connection.model('User', schema);
}
export function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    displayDateFormat: user.displayDateFormat || 'day-first',
    email: user.email,
    role: user.role,
    charityId: String(user.charity),
    contributionPercent: user.contributionPercent,
  };
}
