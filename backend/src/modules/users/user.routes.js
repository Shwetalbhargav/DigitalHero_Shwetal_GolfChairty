import { Router } from 'express';
import { apiResponse } from '../../utils/ApiResponse.js';
export function createUserRoutes(service, authenticate) {
  const router = Router();
  router.use(authenticate);
  router.get('/me/dashboard', async (req, res) =>
    res.json(apiResponse(await service.dashboard(req.user), req.id)),
  );
  router.patch('/me', async (req, res) =>
    res.json(
      apiResponse(
        { user: await service.updateProfile(req.user, req.body) },
        req.id,
      ),
    ),
  );
  router.patch('/me/charity', async (req, res) =>
    res.json(
      apiResponse(
        { user: await service.updateCharity(req.user, req.body) },
        req.id,
      ),
    ),
  );
  return router;
}
