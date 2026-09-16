import { Router } from 'express';
import { apiResponse } from '../../utils/ApiResponse.js';
export function createUserRoutes(service, authenticate) {
  const router = Router();
  router.use(authenticate);
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
