// A session loss unmounts private routes; their in-memory query state cannot leak
// into a later account. Failed login attempts do not invalidate an existing session.
export function notifySessionLoss(status, code, path = '') {
  if (
    (status === 401 && !['/auth/login', '/auth/register'].includes(path)) ||
    code === 'ACCOUNT_SUSPENDED'
  )
    window.dispatchEvent(new Event('digital-heroes:session-lost'));
}
