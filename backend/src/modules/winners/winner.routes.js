import express, { Router } from 'express';
import { apiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { requireAdmin, pageQuery } from '../draws/draw.validation.js';
import { MAX_PROOF_BYTES } from './evidence.storage.js';
function winnerQuery(query, admin) {
  const { verification, payout, ...rest } = query;
  if (
    (!admin && (verification || payout)) ||
    (verification &&
      !['pending', 'approved', 'rejected', 'expired'].includes(verification)) ||
    (payout && !['pending', 'paid', 'expired'].includes(payout))
  )
    throw new ApiError(400, 'INVALID_QUERY', 'Invalid winner filters.');
  return { ...pageQuery(rest), verification, payout };
}
export function createWinnerRoutes(service, authenticate, admin = false) {
  const router = Router();
  router.use(authenticate);
  if (admin) router.use(requireAdmin);
  router.get('/', async (req, res) =>
    res.json(
      apiResponse(
        await service.list(req.user, winnerQuery(req.query, admin), admin),
        req.id,
      ),
    ),
  );
  router.get('/:id', async (req, res) =>
    res.json(
      apiResponse(await service.detail(req.params.id, req.user, admin), req.id),
    ),
  );
  router.get('/:id/proof/:submissionId', async (req, res) => {
    const data = await service.proof(
      req.params.id,
      req.user,
      req.params.submissionId,
      admin,
    );
    res
      .set('Content-Disposition', 'attachment; filename="winning-proof.png"')
      .type('image/png')
      .send(data);
  });
  if (admin) {
    router.post('/:id/expire', async (req, res) => res.json(apiResponse(await service.expire(req.params.id, req.body, req.user), req.id)));
    router.post('/:id/review', async (req, res) =>
      res.json(
        apiResponse(
          await service.review(req.params.id, req.body, req.user),
          req.id,
        ),
      ),
    );
    router.post('/:id/payout', async (req, res) =>
      res.json(
        apiResponse(
          await service.pay(req.params.id, req.body, req.user),
          req.id,
        ),
      ),
    );
  } else {
    router.post(
      '/:id/proof',
      async (req, _res, next) => {
        await service.get(req.params.id, req.user);
        next();
      },
      (req, res, next) =>
        express.raw({ type: () => true, limit: MAX_PROOF_BYTES })(
          req,
          res,
          (error) =>
            next(
              error?.type === 'entity.too.large'
                ? new ApiError(
                    413,
                    'PROOF_TOO_LARGE',
                    'Evidence must be no larger than 5 MB.',
                  )
                : error,
            ),
        ),
      async (req, res) =>
        res.json(
          apiResponse(
            await service.submit(
              req.params.id,
              req.user,
              req.body,
              req.get('Content-Type')?.split(';')[0],
            ),
            req.id,
          ),
        ),
    );
  }
  return router;
}
