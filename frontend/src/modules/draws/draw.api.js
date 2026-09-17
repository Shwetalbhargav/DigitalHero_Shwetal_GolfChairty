import { api } from '../../services/api.js';
export const getDraws = (page, signal) =>
  api(`/draws?page=${page}&limit=12`, { signal });
export const getDraw = (id, signal) => api('/draws/' + id, { signal });
export const getDrawResult = (id, signal) =>
  api('/draws/' + id + '/me', { signal });
