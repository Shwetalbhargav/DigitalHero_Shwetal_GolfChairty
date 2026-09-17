import { ApiError } from '../utils/ApiError.js';
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin')
    throw new ApiError(
      403,
      'ADMIN_REQUIRED',
      'Administrator access is required.',
    );
  next();
}
