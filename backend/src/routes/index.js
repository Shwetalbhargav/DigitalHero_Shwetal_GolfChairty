import { Router } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { apiResponse } from '../utils/ApiResponse.js';
import { createCharityModel } from '../modules/charities/charity.model.js';
import { createCharityService } from '../modules/charities/charity.service.js';
import { createCharityRoutes } from '../modules/charities/charity.routes.js';
export function createRoutes({
  database,
  isShuttingDown = () => false,
  queryTimeoutMs = 3000,
}) {
  const router = Router();
  router.get('/health', (req, res) =>
    res.json(apiResponse({ status: 'alive' }, req.id)),
  );
  router.get('/ready', async (req, res) => {
    if (isShuttingDown() || !(await database.isReady()) || isShuttingDown())
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service is not ready.');
    res.json(apiResponse({ status: 'ready', database: 'connected' }, req.id));
  });
  const Charity = database.connection
    ? createCharityModel(database.connection)
    : null;
  router.use(
    '/charities',
    createCharityRoutes(
      createCharityService(Charity, { timeoutMs: queryTimeoutMs }),
    ),
  );
  return router;
}
