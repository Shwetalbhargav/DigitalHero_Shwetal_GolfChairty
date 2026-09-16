import { Router } from 'express';
import { apiResponse } from '../../utils/ApiResponse.js';
export function createPaymentRoutes(service, authenticate) {
  const router = Router();
  router.use(authenticate);
  router.get('/:id', async (req, res) =>
    res.json(
      apiResponse(await service.detail(req.user, req.params.id), req.id),
    ),
  );
  router.post('/:id/process', async (req, res) =>
    res.json(
      apiResponse(
        await service.processDonation(req.user, req.params.id, req.body),
        req.id,
      ),
    ),
  );
  router.post('/:id/retry', async (req, res) =>
    res.json(apiResponse(await service.retry(req.user, req.params.id), req.id)),
  );
  return router;
}
export function createDonationRoutes(service, authenticate) {
  const router = Router();
  router.use(authenticate);
  router.post('/', async (req, res) =>
    res
      .status(201)
      .json(
        apiResponse(
          await service.donation(
            req.user,
            req.body,
            req.get('Idempotency-Key'),
          ),
          req.id,
        ),
      ),
  );
  return router;
}
