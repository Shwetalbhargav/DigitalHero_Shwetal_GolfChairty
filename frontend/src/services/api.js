export class ApiClientError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', requestId } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}
export async function api(path, { signal, ...options } = {}) {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new ApiClientError('API path must start with a single slash.', {
      code: 'INVALID_PATH',
    });
  const timeout = AbortSignal.timeout(8000);
  try {
    const response = await fetch(
      (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '') + path,
      {
        ...options,
        credentials: 'include',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(!['GET', 'HEAD'].includes(options.method || 'GET')
            ? { 'X-CSRF-Protection': '1' }
            : {}),
          ...options.headers,
        },
      },
    );
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new ApiClientError('The server returned an invalid response.', {
        status: response.status,
        code: 'INVALID_RESPONSE',
      });
    }
    if (!response.ok)
      throw new ApiClientError(
        payload.error?.message || 'The request failed.',
        {
          status: response.status,
          code: payload.error?.code || 'HTTP_ERROR',
          requestId: payload.requestId,
        },
      );
    if (payload.success !== true || !Object.hasOwn(payload, 'data'))
      throw new ApiClientError('The server returned an invalid response.', {
        status: response.status,
        code: 'INVALID_RESPONSE',
      });
    return payload.data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError(
      timeout.aborted
        ? 'The request timed out. Please try again.'
        : 'Unable to reach the service. Please try again.',
      { code: timeout.aborted ? 'TIMEOUT' : 'NETWORK_ERROR' },
    );
  }
}
