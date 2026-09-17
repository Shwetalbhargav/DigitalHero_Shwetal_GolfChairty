import { Router } from 'express';
import { apiResponse } from '../../utils/ApiResponse.js';
export function createSubscriptionRoutes(service, authenticate) {
  const router = Router();
  router.get('/plans', (req, res) =>
    res.json(apiResponse(service.plans(), req.id)),
  );
  router.use(authenticate);
  router.post('/portal', async (req, res) => res.json(apiResponse(await service.portal(req.user), req.id)));
  router.get('/me', async (req, res) =>
    res.json(
      apiResponse(
        {
          subscription: await service.current(req.user),
          payments: await service.history(req.user),
        },
        req.id,
      ),
    ),
  );
  for (const action of ['checkout', 'renew'])
    router.post('/' + action, async (req, res) =>
      res
        .status(201)
        .json(
          apiResponse(
            await service.checkout(
              req.user,
              req.body,
              req.get('Idempotency-Key'),
              action === 'renew',
            ),
            req.id,
          ),
        ),
    );
  router.post('/cancel', async (req, res) =>
    res.json(apiResponse(await service.cancel(req.user, req.body), req.id)),
  );
  return router;
}
