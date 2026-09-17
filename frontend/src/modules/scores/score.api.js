import { api } from '../../services/api.js';
export const getScores = (signal) => api('/scores', { signal });
export const createScore = (body) =>
  api('/scores', { method: 'POST', body: JSON.stringify(body) });
export const updateScore = (id, body) =>
  api('/scores/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
export const deleteScore = (id) =>
  api('/scores/' + encodeURIComponent(id), { method: 'DELETE' });
