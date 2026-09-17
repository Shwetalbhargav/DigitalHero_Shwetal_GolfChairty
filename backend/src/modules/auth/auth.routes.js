import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../../utils/ApiError.js';
import { apiResponse } from '../../utils/ApiResponse.js';
import {
  generateToken,
  SESSION_COOKIE,
  cookieOptions,
} from '../../utils/generateToken.js';
import { publicUser } from '../users/user.model.js';
export function createAuthRoutes(service, authenticate, config, security) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_req, _res, next) {
      next(
        new ApiError(
          429,
          'RATE_LIMITED',
          'Too many attempts. Try again in 15 minutes.',
        ),
      );
    },
  });
  for (const action of ['register', 'login'])
    router.post('/' + action, limiter, async (req, res) => {
      const user = await service[action](req.body);
      res.cookie(
        SESSION_COOKIE,
        generateToken(user, config.authSecret),
        cookieOptions(config),
      );
      res
        .status(action === 'register' ? 201 : 200)
        .json(apiResponse({ user: publicUser(user) }, req.id));
    });
  router.get('/me', authenticate, (req, res) =>
    res.json(
      apiResponse(
        { user: publicUser(req.user), subscription: req.subscription || null },
        req.id,
      ),
    ),
  );
  router.get('/policy', (_req, res) =>
    res.json(
      apiResponse({
        minContributionPercent: 10,
        maxContributionPercent: config.maxContributionPercent,
        demoInbox: config.nodeEnv === 'test' && config.emailMode === 'demo',
        emailAvailable: ['demo', 'resend'].includes(config.emailMode),
      }),
    ),
  );
  if (security) {
    for (const [path, method] of [['forgot-password', 'forgot'], ['reset-password', 'reset'], ['verify-email', 'confirmEmail']]) router.post('/' + path, limiter, async (req, res) => res.json(apiResponse(await security[method](req.body), req.id)));
    for (const [path, method] of [['password', 'changePassword'], ['email', 'requestEmail']]) router.post('/' + path, limiter, authenticate, async (req, res) => res.json(apiResponse(await security[method](req.user, req.body), req.id)));
    if (config.nodeEnv === 'test' && config.emailMode === 'demo') router.get('/demo-inbox', (req, res) => {
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) throw new ApiError(403, 'LOCAL_ONLY', 'The test inbox is available only on this computer.');
      res.json(apiResponse({ items: security.inbox() }, req.id));
    });
  }
  router.post('/logout', authenticate, async (req, res) => {
    await service.logout(req.user);
    const options = cookieOptions(config);
    delete options.maxAge;
    res.clearCookie(SESSION_COOKIE, options);
    res.json(apiResponse({ loggedOut: true }, req.id));
  });
  return router;
}
