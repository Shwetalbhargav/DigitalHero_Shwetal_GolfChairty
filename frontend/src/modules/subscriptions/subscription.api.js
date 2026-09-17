import { api } from '../../services/api.js';
export const getPlans = (signal) => api('/subscriptions/plans', { signal });
export const getSubscription = (signal) => api('/subscriptions/me', { signal });
export const checkout = (plan, key, renewal = false) =>
  api('/subscriptions/' + (renewal ? 'renew' : 'checkout'), {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify({ plan }),
  });
export const cancelSubscription = () =>
  api('/subscriptions/cancel', { method: 'POST', body: '{}' });
