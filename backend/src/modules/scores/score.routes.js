import { Router } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { apiResponse } from '../../utils/ApiResponse.js';
import { requireSubscription } from '../../middleware/subscription.middleware.js';
export function createScoreRoutes(service, authenticate) {
  const router = Router();
  router.use(authenticate);
  router.get('/', async (req, res) => {
    if (Object.keys(req.query).length)
      throw new ApiError(
        400,
        'INVALID_QUERY',
        'Score listing does not accept query parameters.',
      );
    res.json(apiResponse(await service.list(req.user), req.id));
  });
  router.post('/', requireSubscription, async (req, res) =>
    res
      .status(201)
      .json(apiResponse(await service.create(req.user, req.body), req.id)),
  );
  router.patch('/:id', requireSubscription, async (req, res) =>
    res.json(
      apiResponse(
        await service.update(req.user, req.params.id, req.body),
        req.id,
      ),
    ),
  );
  router.delete('/:id', requireSubscription, async (req, res) =>
    res.json(
      apiResponse(await service.remove(req.user, req.params.id), req.id),
    ),
  );
  return router;
}
