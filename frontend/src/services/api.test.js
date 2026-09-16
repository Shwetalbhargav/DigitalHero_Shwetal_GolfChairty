import { afterEach, expect, test, vi } from 'vitest';
import { api } from './api.js';
afterEach(() => vi.unstubAllGlobals());
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
