import { ApiError } from '../../utils/ApiError.js';
import { validateBody } from '../auth/auth.validation.js';
export function parseScoreId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id))
    throw new ApiError(
      400,
      'INVALID_ID',
      'Score ID must be a 24-character hexadecimal ObjectId.',
    );
  return id;
}
export function validateScore(
  body,
  { partial = false, now = new Date() } = {},
) {
  validateBody(body, ['value', 'roundDate']);
  if (partial && Object.keys(body).length === 0)
    throw new ApiError(
      400,
      'INVALID_INPUT',
      'Supply a score or round date to update.',
    );
  const result = {};
  if (!partial || Object.hasOwn(body, 'value')) {
    if (!Number.isInteger(body.value) || body.value < 1 || body.value > 45)
      throw new ApiError(
        400,
        'INVALID_SCORE',
        'Stableford score must be a whole number from 1 to 45.',
      );
    result.value = body.value;
  }
  if (!partial || Object.hasOwn(body, 'roundDate')) {
    const date = body.roundDate;
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date < '0001-01-01' ||
      !Number.isFinite(Date.parse(date + 'T00:00:00Z')) ||
      new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date
    )
      throw new ApiError(
        400,
        'INVALID_ROUND_DATE',
        'Round date must be a real calendar date in YYYY-MM-DD format.',
      );
    if (date > now.toISOString().slice(0, 10))
      throw new ApiError(
        400,
        'FUTURE_ROUND_DATE',
        'Round date cannot be in the future (UTC).',
      );
    result.roundDate = date;
  }
  return result;
}
