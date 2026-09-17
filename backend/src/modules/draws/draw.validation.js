import { ApiError } from '../../utils/ApiError.js';
import { validateBody } from '../auth/auth.validation.js';
export function drawId(id) {
  if (!/^[a-f0-9]{24}$/i.test(id))
    throw new ApiError(400, 'INVALID_ID', 'Use a valid record ID.');
  return id;
}
export function drawConfig(body, currency) {
  validateBody(body, ['month', 'strategy', 'scheduledAt', 'cutoffAt']);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) || body.month < '2000-01')
    throw new ApiError(
      400,
      'INVALID_MONTH',
      'Use a month in YYYY-MM format from 2000 onward.',
    );
  if (!['random', 'weighted'].includes(body.strategy))
    throw new ApiError(400, 'INVALID_STRATEGY', 'Choose random or weighted.');
  const date = new Date(body.scheduledAt);
  if (
    typeof body.scheduledAt !== 'string' ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 7) !== body.month
  )
    throw new ApiError(
      400,
      'INVALID_SCHEDULE',
      'Schedule a valid UTC instant within the draw month.',
    );
  const cutoffAt = body.cutoffAt ? new Date(body.cutoffAt) : null;
  if (
    cutoffAt &&
    (!Number.isFinite(cutoffAt.getTime()) ||
      cutoffAt.toISOString().slice(0, 7) !== body.month ||
      cutoffAt > date)
  )
    throw new ApiError(
      400,
      'INVALID_CUTOFF',
      'Cutoff must be a valid instant in the draw month, no later than the scheduled draw.',
    );
  return {
    month: body.month,
    strategy: body.strategy,
    scheduledAt: date,
    currency,
    cutoffAt,
  };
}
export function requireAdmin(req, _res, next) {
  if (req.user.role !== 'admin')
    throw new ApiError(403, 'ADMIN_REQUIRED', 'Administrator access required.');
  next();
}
export function pageQuery(query) {
  if (Object.keys(query).some((key) => !['page', 'limit'].includes(key)))
    throw new ApiError(
      400,
      'INVALID_QUERY',
      'Only page and limit are supported.',
    );
  const page = Number(query.page || 1),
    limit = Number(query.limit || 12);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    (query.page && !/^\d+$/.test(query.page)) ||
    (query.limit && !/^\d+$/.test(query.limit))
  )
    throw new ApiError(
      400,
      'INVALID_QUERY',
      'Use page 1–10000 and limit 1–50.',
    );
  return { page, limit };
}
