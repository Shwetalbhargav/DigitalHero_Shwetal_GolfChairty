import { afterEach, expect, test, vi } from 'vitest';
import { api } from './api.js';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
test('timeouts include stalled body reads and writes carry CSRF and JSON headers', async () => {
  const controller = new AbortController();
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      controller.abort();
      throw new DOMException('Timed out', 'TimeoutError');
    },
  });
  vi.stubGlobal('fetch', fetch);
  await expect(
    api('/auth/login', { method: 'POST', body: '{}' }),
  ).rejects.toMatchObject({ code: 'TIMEOUT' });
  expect(fetch).toHaveBeenCalledWith(
    '/api/auth/login',
    expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-CSRF-Protection': '1',
      }),
    }),
  );
});
test('API includes credentials and unwraps success', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { status: 'alive' } }),
  });
  vi.stubGlobal('fetch', fetch);
  expect(await api('/health')).toEqual({ status: 'alive' });
  expect(fetch).toHaveBeenCalledWith(
    '/api/health',
    expect.objectContaining({ credentials: 'include' }),
  );
});
test('HTTP errors preserve envelope metadata', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service is not ready.',
        },
        requestId: 'r1',
      }),
    }),
  );
  await expect(api('/ready')).rejects.toMatchObject({
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    requestId: 'r1',
  });
});
test('invalid JSON and malformed success are rejected', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error();
      },
    }),
  );
  await expect(api('/ready')).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  });
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
  );
  await expect(api('/ready')).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  });
});
test('network failures and caller cancellation remain distinguishable', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  );
  await expect(api('/ready')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  const controller = new AbortController();
  controller.abort();
  await expect(
    api('/ready', { signal: controller.signal }),
  ).rejects.toBeInstanceOf(TypeError);
  await expect(api('//external')).rejects.toMatchObject({
    code: 'INVALID_PATH',
  });
});
test.each([401, 403, 404, 409, 422, 500])(
  'HTTP %i never automatically retries a payment or draw write',
  async (status) => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({
        success: false,
        error: {
          code: 'INJECTED_ERROR',
          message: 'Check the action status before retrying.',
        },
      }),
    });
    vi.stubGlobal('fetch', fetch);
    await expect(
      api('/admin/draws/id/publish', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);
