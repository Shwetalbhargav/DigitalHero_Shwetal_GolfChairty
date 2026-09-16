import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import useFetch from './useFetch.js';
import { getFeaturedCharities } from '../modules/charities/charity.api.js';
test('obsolete results cannot replace new state; retry recovers errors', async () => {
  let resolveOld;
  const old = vi.fn(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const next = vi
    .fn()
    .mockRejectedValueOnce(new Error('Timed out'))
    .mockResolvedValue([]);
  const hook = renderHook(({ load }) => useFetch(load), {
    initialProps: { load: old },
  });
  await waitFor(() => expect(old).toHaveBeenCalled());
  hook.rerender({ load: next });
  await waitFor(() => expect(hook.result.current.status).toBe('error'));
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.data).toEqual([]));
  await act(async () => resolveOld(['stale']));
  expect(hook.result.current.data).toEqual([]);
  expect(old.mock.calls[0][0].aborted).toBe(true);
});
test('API seed DTO maps ID navigation and demo labels without invented images', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            items: [
              {
                id: 'a'.repeat(24),
                name: 'Demo: Golf',
                description: 'A demo charity',
                category: 'youth',
                isDemo: true,
                images: [],
              },
            ],
          },
        }),
      }),
  );
  try {
    const cards = await getFeaturedCharities();
    expect(cards[0]).toMatchObject({
      href: '/charities/' + 'a'.repeat(24),
      image: null,
      isExample: true,
    });
  } finally {
    vi.unstubAllGlobals();
  }
});
