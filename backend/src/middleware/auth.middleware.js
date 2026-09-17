import { ApiError } from '../utils/ApiError.js';
import { SESSION_COOKIE, verifyToken } from '../utils/generateToken.js';
export function createAuthMiddleware(User, config, subscriptionService) {
  return async function authenticate(req, _res, next) {
    const token = req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(SESSION_COOKIE + '='))
      ?.slice(SESSION_COOKIE.length + 1);
    let claims;
    try {
      claims = verifyToken(token, config.authSecret);
    } catch {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    if (!/^[a-f0-9]{24}$/i.test(claims.sub))
      throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    const user = await User.findById(claims.sub).select('+tokenVersion');
    if (!user || user.tokenVersion !== claims.version)
      throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    if (user.suspended)
      throw new ApiError(
        403,
        'ACCOUNT_SUSPENDED',
        'This account is suspended.',
      );
    req.user = user;
    req.subscription = subscriptionService
      ? await subscriptionService.current(user)
      : null;
    next();
  };
}
// Origin plus a non-simple header blocks cross-site form submissions and forces CORS preflight.
export function createCsrfMiddleware(config) {
  return function csrf(req, _res, next) {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('Origin') !== config.clientOrigin ||
        req.get('X-CSRF-Protection') !== '1')
    )
      throw new ApiError(
        403,
        'CSRF_REJECTED',
        'Request origin and CSRF header are required.',
      );
    next();
  };
}
