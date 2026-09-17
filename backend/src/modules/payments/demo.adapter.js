import { ApiError } from '../../utils/ApiError.js';
export function assertDemo(config) {
  if (config.nodeEnv === 'production' || config.paymentMode !== 'simulated')
    throw new ApiError(
      503,
      'PAYMENTS_UNAVAILABLE',
      'Simulated payments are disabled. No real payment provider is configured.',
    );
}
export function simulatePayment(config, scenario) {
  assertDemo(config);
  if (!['approve', 'decline'].includes(scenario))
    throw new ApiError(
      400,
      'INVALID_SCENARIO',
      'Choose a simulated approval or decline.',
    );
  return {
    status: scenario === 'approve' ? 'succeeded' : 'failed',
    failureReason:
      scenario === 'decline'
        ? 'Simulated decline. No money was charged.'
        : null,
  };
}
