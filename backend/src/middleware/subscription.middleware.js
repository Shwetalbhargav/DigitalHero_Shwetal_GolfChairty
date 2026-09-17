import { ApiError } from '../utils/ApiError.js';
export function requireSubscription(req, _res, next) {
  if (!req.subscription?.active)
    throw new ApiError(
      403,
      'SUBSCRIPTION_REQUIRED',
      'An active subscription is required. Manage your membership to continue.',
    );
  next();
}
