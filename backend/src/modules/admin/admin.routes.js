import express, { Router } from 'express';
import { apiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { requireAdmin } from '../draws/draw.validation.js';
import { MAX_PROOF_BYTES } from '../winners/evidence.storage.js';
export function createAdminRoutes({ users, charities, reports }, authenticate) {
  const router = Router();
  router.use(authenticate, requireAdmin);
  router.get('/overview', async (req, res) => res.json(apiResponse(await reports.overview(), req.id)));
  router.get('/users', async (req, res) =>
    res.json(apiResponse(await users.list(req.query), req.id)),
  );
  router.get('/users/:id', async (req, res) =>
    res.json(apiResponse(await users.detail(req.params.id), req.id)),
  );
  router.patch('/users/:id', async (req, res) =>
    res.json(
      apiResponse(
        await users.update(req.params.id, req.body, req.user),
        req.id,
      ),
    ),
  );
  router.patch('/users/:id/scores/:scoreId', async (req, res) =>
    res.json(
      apiResponse(
        await users.correctScore(
          req.params.id,
          req.params.scoreId,
          req.body,
          req.user,
        ),
        req.id,
      ),
    ),
  );
  router.patch('/users/:id/subscription', async (req, res) =>
    res.json(
      apiResponse(
        await users.subscription(req.params.id, req.body, req.user),
        req.id,
      ),
    ),
  );
  router.get('/charities', async (req, res) =>
    res.json(apiResponse(await charities.list(req.query), req.id)),
  );
  router.post('/charities', async (req, res) =>
    res
      .status(201)
      .json(
        apiResponse(await charities.save(null, req.body, req.user), req.id),
      ),
  );
  router.get('/charities/:id', async (req, res) =>
    res.json(apiResponse(await charities.detail(req.params.id), req.id)),
  );
  router.patch('/charities/:id', async (req, res) =>
    res.json(
      apiResponse(
        await charities.save(req.params.id, req.body, req.user),
        req.id,
      ),
    ),
  );
  router.delete('/charities/:id', async (req, res) =>
    res.json(
      apiResponse(
        await charities.remove(req.params.id, req.body, req.user),
        req.id,
      ),
    ),
  );
  router.post(
    '/charities/:id/media',
    (req, res, next) =>
      express.raw({ type: () => true, limit: MAX_PROOF_BYTES })(
        req,
        res,
        (error) =>
          next(
            error?.type === 'entity.too.large'
              ? new ApiError(
                  413,
                  'MEDIA_TOO_LARGE',
                  'Images must be no larger than 5 MB.',
                )
              : error,
          ),
      ),
    async (req, res) =>
      res.json(
        apiResponse(
          await charities.upload(
            req.params.id,
            req.body,
            req.get('Content-Type')?.split(';')[0],
            req.query.alt,
            req.query.reason,
            req.user,
          ),
          req.id,
        ),
      ),
  );
  router.get('/reports', async (req, res) =>
    res.json(apiResponse(await reports.report(req.query), req.id)),
  );
  return router;
}
