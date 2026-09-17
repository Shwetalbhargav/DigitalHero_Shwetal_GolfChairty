import { ApiError } from '../../utils/ApiError.js';
import { parseCharityId } from '../charities/charity.validation.js';
export function validateBody(body, allowed) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !allowed.includes(key))
  )
    throw new ApiError(
      400,
      'INVALID_INPUT',
      'Request contains unsupported fields.',
    );
}
export function validateContribution(value, maximum = 50) {
  if (!Number.isInteger(value) || value < 10 || value > maximum)
    throw new ApiError(
      400,
      'INVALID_CONTRIBUTION',
      `Contribution must be a whole percentage between 10 and ${maximum}.`,
    );
  return value;
}
export function validateCredentials(body, registration = false, maximum = 50) {
  validateBody(
    body,
    registration
      ? ['name', 'email', 'password', 'charityId', 'contributionPercent']
      : ['email', 'password'],
  );
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  if (
    typeof body.password !== 'string' ||
    body.password.length < (registration ? 12 : 1) ||
    Buffer.byteLength(body.password) > 72
  )
    throw new ApiError(
      400,
      'INVALID_PASSWORD',
      'Password must contain at least 12 characters and at most 72 bytes.',
    );
  if (!registration) return { email, password: body.password };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 120)
    throw new ApiError(
      400,
      'INVALID_NAME',
      'Name must contain 2–120 characters.',
    );
  return {
    email,
    password: body.password,
    name,
    charity: parseCharityId(body.charityId),
    contributionPercent: validateContribution(
      body.contributionPercent,
      maximum,
    ),
  };
}
