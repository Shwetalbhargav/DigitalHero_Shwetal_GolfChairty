import { ApiError } from '../../utils/ApiError.js';
import { validateBody } from '../auth/auth.validation.js';
export function validateProfile(body) {
  validateBody(body, ['name', 'displayDateFormat']);
  if (!Object.keys(body).length)
    throw new ApiError(
      400,
      'INVALID_INPUT',
      'Supply a profile field to update.',
    );
  const fields = {};
  if (Object.hasOwn(body, 'name')) {
    if (
      typeof body.name !== 'string' ||
      body.name.trim().length < 2 ||
      body.name.trim().length > 120
    )
      throw new ApiError(
        400,
        'INVALID_NAME',
        'Name must contain 2–120 characters.',
      );
    fields.name = body.name.trim();
  }
  if (Object.hasOwn(body, 'displayDateFormat')) {
    if (!['day-first', 'iso'].includes(body.displayDateFormat))
      throw new ApiError(
        400,
        'INVALID_DATE_FORMAT',
        'Choose day-first or ISO date display.',
      );
    fields.displayDateFormat = body.displayDateFormat;
  }
  return fields;
}
