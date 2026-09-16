import { Router } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { apiResponse } from '../utils/ApiResponse.js';
export function createRoutes({ database, isShuttingDown = () => false }) {
  const router = Router();
  router.get('/health', (req, res) =>
    res.json(apiResponse({ status: 'alive' }, req.id)),
  );
  router.get('/ready', async (req, res) => {
    if (isShuttingDown() || !(await database.isReady()) || isShuttingDown())
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service is not ready.');
    res.json(apiResponse({ status: 'ready', database: 'connected' }, req.id));
  });
  return router;
}
