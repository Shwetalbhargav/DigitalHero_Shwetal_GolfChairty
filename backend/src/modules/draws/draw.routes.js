import { Router } from 'express';
import { apiResponse } from '../../utils/ApiResponse.js';
import { requireAdmin, pageQuery } from './draw.validation.js';
export function createDrawRoutes(service, authenticate, admin = false) {
  const router = Router();
  if (admin) {
    router.use(authenticate, requireAdmin);
    router.get('/', async (req, res) =>
      res.json(
        apiResponse(await service.list(pageQuery(req.query), true), req.id),
      ),
    );
    router.post('/', async (req, res) =>
      res
        .status(201)
        .json(apiResponse(await service.create(req.body, req.user), req.id)),
    );
    router.get('/:id', async (req, res) =>
      res.json(apiResponse(await service.detail(req.params.id, true), req.id)),
    );
    router.patch('/:id', async (req, res) =>
      res.json(
        apiResponse(
          await service.configure(req.params.id, req.body, req.user),
          req.id,
        ),
      ),
    );
    for (const action of ['simulate', 'publish'])
      router.post('/:id/' + action, async (req, res) =>
        res.json(
          apiResponse(
            await service[action](req.params.id, req.body, req.user),
            req.id,
          ),
        ),
      );
  } else {
    router.get('/', async (req, res) =>
      res.json(apiResponse(await service.list(pageQuery(req.query)), req.id)),
    );
    router.get('/latest', async (_req, res) =>
      res.json(apiResponse(await service.latest(), _req.id)),
    );
    router.get('/:id/me', authenticate, async (req, res) =>
      res.json(
        apiResponse(await service.ownedResult(req.params.id, req.user), req.id),
      ),
    );
    router.get('/:id', async (req, res) =>
      res.json(apiResponse(await service.detail(req.params.id), req.id)),
    );
  }
  return router;
}
