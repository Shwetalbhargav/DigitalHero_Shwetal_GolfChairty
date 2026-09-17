import { Schema } from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
const schema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    reason: { type: String, required: true },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    at: { type: Date, required: true },
  },
  { strict: 'throw', bufferCommands: false },
);
schema.index({ entity: 1, entityId: 1, at: -1 });
export function createAuditModel(connection) {
  return connection.models.AuditEvent || connection.model('AuditEvent', schema);
}
export function auditReason(value) {
  if (
    typeof value !== 'string' ||
    value.trim().length < 3 ||
    value.trim().length > 1000
  )
    throw new ApiError(
      400,
      'REASON_REQUIRED',
      'Supply a reason of 3–1000 characters.',
    );
  return value.trim();
}
export async function recordAudit(
  connection,
  { actor, action, entity, entityId, reason, before, after },
  session,
) {
  if (!actor || actor.role !== 'admin')
    throw new ApiError(403, 'ADMIN_REQUIRED', 'Administrator access required.');
  await createAuditModel(connection).create(
    [
      {
        actor: actor._id,
        action,
        entity,
        entityId: String(entityId),
        reason: auditReason(reason),
        before: before ?? null,
        after: after ?? null,
        at: new Date(),
      },
    ],
    { session },
  );
}
