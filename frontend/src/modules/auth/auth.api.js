import { api } from '../../services/api.js';
export const getSession = (signal) => api('/auth/me', { signal });
export const getPolicy = (signal) => api('/auth/policy', { signal });
export const login = (body) =>
  api('/auth/login', { method: 'POST', body: JSON.stringify(body) });
export const register = (body) =>
  api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
export const logout = () => api('/auth/logout', { method: 'POST', body: '{}' });
