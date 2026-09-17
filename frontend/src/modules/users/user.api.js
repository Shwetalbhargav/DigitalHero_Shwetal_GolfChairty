import { api } from '../../services/api.js';
export const getDashboard = (signal) => api('/users/me/dashboard', { signal });
export const updateProfile = (body) =>
  api('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
