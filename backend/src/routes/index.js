import { Router } from 'express';
import { createDrawModels } from '../modules/draws/draw.model.js';
import { createDrawService } from '../modules/draws/draw.service.js';
import { createDrawRoutes } from '../modules/draws/draw.routes.js';
import { createWinnerModel } from '../modules/winners/winner.model.js';
import { createPayoutModel } from '../modules/payouts/payout.model.js';
import { createEvidenceModel } from '../modules/winners/evidence.model.js';
import { createEvidenceStorage } from '../modules/winners/evidence.storage.js';
import { createWinnerService } from '../modules/winners/winner.service.js';
import { createWinnerRoutes } from '../modules/winners/winner.routes.js';
import { createAdminUserService } from '../modules/admin/admin-users.service.js';
import { createAdminCharityService } from '../modules/admin/admin-charities.service.js';
import { createReportService } from '../modules/admin/reports.service.js';
import { createAdminRoutes } from '../modules/admin/admin.routes.js';
import { ApiError } from '../utils/ApiError.js';
import { apiResponse } from '../utils/ApiResponse.js';
import { createCharityModel } from '../modules/charities/charity.model.js';
import { createCharityService } from '../modules/charities/charity.service.js';
import { createCharityRoutes } from '../modules/charities/charity.routes.js';
import { createUserModel } from '../modules/users/user.model.js';
import { createSubscriptionModel } from '../modules/subscriptions/subscription.model.js';
import { createSubscriptionService } from '../modules/subscriptions/subscription.service.js';
import { createSubscriptionRoutes } from '../modules/subscriptions/subscription.routes.js';
import { createScoreModel } from '../modules/scores/score.model.js';
import { createScoreService } from '../modules/scores/score.service.js';
import { createScoreRoutes } from '../modules/scores/score.routes.js';
import {
  createAuthMiddleware,
  createCsrfMiddleware,
} from '../middleware/auth.middleware.js';
import { createAuthService } from '../modules/auth/auth.service.js';
import { createAuthRoutes } from '../modules/auth/auth.routes.js';
import { createAccountSecurity } from '../modules/auth/account-security.js';
import { createMemberExperienceRoutes } from '../modules/users/member-experience.routes.js';
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
    const subscriptionService = createSubscriptionService(
      createSubscriptionModel(database.connection),
      createPaymentModel(database.connection),
      Charity,
      config,
    );
    const authenticate = createAuthMiddleware(
      User,
      config,
      subscriptionService,
    );
    const drawService = createDrawService({
      ...createDrawModels(database.connection),
      User,
      Score: createScoreModel(database.connection),
      Subscription: createSubscriptionModel(database.connection),
      Payment: createPaymentModel(database.connection),
      Winner: createWinnerModel(database.connection),
      Payout: createPayoutModel(database.connection),
      config,
    });
    router.use('/experience', createCsrfMiddleware(config), createMemberExperienceRoutes(database.connection, authenticate));
    router.use('/draws', createDrawRoutes(drawService, authenticate));
    router.use(
      '/admin/draws',
      createCsrfMiddleware(config),
      createDrawRoutes(drawService, authenticate, true),
    );
    const Evidence = createEvidenceModel(database.connection);
    const winnerService = createWinnerService({
      Winner: createWinnerModel(database.connection),
      Payout: createPayoutModel(database.connection),
      Evidence,
      storage: createEvidenceStorage(Evidence, config),
      config,
    });
    router.use(
      '/winnings',
      createCsrfMiddleware(config),
      createWinnerRoutes(winnerService, authenticate),
    );
    router.use(
      '/admin/winners',
      createCsrfMiddleware(config),
      createWinnerRoutes(winnerService, authenticate, true),
    );
    router.use(
      '/subscriptions',
      createCsrfMiddleware(config),
      createSubscriptionRoutes(subscriptionService, authenticate),
    );
    const scoreService = createScoreService(
      createScoreModel(database.connection),
      User,
      createSubscriptionModel(database.connection),
      config,
    );
    router.use(
      '/scores',
      createCsrfMiddleware(config),
      createScoreRoutes(scoreService, authenticate),
    );
    const paymentService = createPaymentService(
      createPaymentModel(database.connection),
      Charity,
      config,
    );
    const adminCharities = createAdminCharityService({
      Charity,
      User,
      Payment: createPaymentModel(database.connection),
      Evidence,
      storage: createEvidenceStorage(Evidence, config),
      config,
    });
    router.get('/charities/:id/media/:mediaId', async (req, res) =>
      res
        .type('image/png')
        .send(await adminCharities.media(req.params.id, req.params.mediaId)),
    );
    router.use(
      '/admin',
      createCsrfMiddleware(config),
      createAdminRoutes(
        {
          users: createAdminUserService({
            User,
            Charity,
            config,
            scores: scoreService,
            subscriptions: subscriptionService,
          }),
          charities: adminCharities,
          reports: createReportService({
            ...createDrawModels(database.connection),
            User,
            Subscription: createSubscriptionModel(database.connection),
            Payment: createPaymentModel(database.connection),
            Winner: createWinnerModel(database.connection),
            Payout: createPayoutModel(database.connection),
            config,
          }),
        },
        authenticate,
      ),
    );
    router.use(
      '/users',
      createCsrfMiddleware(config),
      createUserRoutes(
        createUserService(User, Charity, config, {
          Score: createScoreModel(database.connection),
          subscriptions: subscriptionService,
          draws: drawService,
          winners: winnerService,
        }),
        authenticate,
      ),
    );
    router.use(
      '/payments',
      createCsrfMiddleware(config),
      createPaymentRoutes(paymentService, authenticate, subscriptionService),
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
        createAccountSecurity(User, config),
      ),
    );
  }
  return router;
}
