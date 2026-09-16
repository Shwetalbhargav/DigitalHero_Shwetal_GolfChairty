import { Router } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { apiResponse } from '../utils/ApiResponse.js';
import { createCharityModel } from '../modules/charities/charity.model.js';
import { createCharityService } from '../modules/charities/charity.service.js';
import { createCharityRoutes } from '../modules/charities/charity.routes.js';
import { createUserModel } from '../modules/users/user.model.js';
import {
  createAuthMiddleware,
  createCsrfMiddleware,
} from '../middleware/auth.middleware.js';
import { createAuthService } from '../modules/auth/auth.service.js';
import { createAuthRoutes } from '../modules/auth/auth.routes.js';
import { createUserService } from '../modules/users/user.service.js';
import { createUserRoutes } from '../modules/users/user.routes.js';
import { createPaymentModel } from '../modules/payments/payment.model.js';
import { createPaymentService } from '../modules/payments/payment.service.js';
import {
  createPaymentRoutes,
  createDonationRoutes,
} from '../modules/payments/payment.routes.js';
export function createRoutes({
  database,
  isShuttingDown = () => false,
  queryTimeoutMs = 3000,
  config,
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
  if (database.connection) {
    const User = createUserModel(database.connection);
    const authenticate = createAuthMiddleware(User, config);
    const paymentService = createPaymentService(
      createPaymentModel(database.connection),
      Charity,
      config,
    );
    router.use(
      '/users',
      createCsrfMiddleware(config),
      createUserRoutes(createUserService(User, Charity, config), authenticate),
    );
    router.use(
      '/payments',
      createCsrfMiddleware(config),
      createPaymentRoutes(paymentService, authenticate),
    );
    router.use(
      '/donations',
      createCsrfMiddleware(config),
      createDonationRoutes(paymentService, authenticate),
    );
    router.use(
      '/auth',
      createCsrfMiddleware(config),
      createAuthRoutes(
        createAuthService(User, Charity, config),
        authenticate,
        config,
      ),
    );
  }
  return router;
}
