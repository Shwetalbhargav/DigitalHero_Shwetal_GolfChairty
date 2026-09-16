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
export function createAuthRoutes(service, authenticate, config) {
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
      }),
    ),
  );
  router.post('/logout', authenticate, async (req, res) => {
    await service.logout(req.user);
    const options = cookieOptions(config);
    delete options.maxAge;
    res.clearCookie(SESSION_COOKIE, options);
    res.json(apiResponse({ loggedOut: true }, req.id));
  });
  return router;
}
