import { api } from '../../services/api.js';
export const getPayment = (id, signal) =>
  api('/payments/' + encodeURIComponent(id), { signal });
export const donate = (body, key) =>
  api('/donations', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify(body),
  });
export const processPayment = (id, scenario) =>
  api('/payments/' + encodeURIComponent(id) + '/process', {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  });
export const retryPayment = (id) =>
  api('/payments/' + encodeURIComponent(id) + '/retry', {
    method: 'POST',
    body: '{}',
  });
export const money = (amount, currency) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(
    amount / 100,
  );
