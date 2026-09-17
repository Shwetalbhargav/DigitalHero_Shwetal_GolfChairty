import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminDrawDetailPage } from './AdminDrawsPage.jsx';
import { AdminWinnerDetailPage } from './AdminWinnersPage.jsx';
import { api } from '../../services/api.js';
vi.mock('../../services/api.js', () => ({ api: vi.fn() }));
afterEach(() => vi.clearAllMocks());
const draw = {
  id: 'draw1',
  month: '2026-09',
  strategy: 'weighted',
  scheduledAt: '2026-09-17T10:00:00Z',
  status: 'draft',
  version: 1,
  previewVersion: 'review-v1',
  numbers: [1, 2, 3, 4, 5],
  entryCount: 1,
  cutoff: '2026-09-17T10:00:00Z',
  currency: 'GBP',
  poolMinor: 100,
  incomingRolloverMinor: 0,
  rolloverMinor: 40,
  unclaimedMinor: 60,
  tiers: [
    { tier: 3, percentage: 25, amountMinor: 25, winnerCount: 0 },
    { tier: 4, percentage: 35, amountMinor: 35, winnerCount: 0 },
    { tier: 5, percentage: 40, amountMinor: 40, winnerCount: 0 },
  ],
};
function mount(path, route, element) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}
test('admin draw cancellation sends no publication; stale publish retains reviewed version and surfaces conflict', async () => {
  api.mockImplementation((_path, options) =>
    options?.method
      ? Promise.reject(new Error('Eligibility changed. Simulate again.'))
      : Promise.resolve(draw),
  );
  const user = userEvent.setup();
  mount('/admin/draws/draw1', '/admin/draws/:id', <AdminDrawDetailPage />);
  await screen.findByRole('heading', { name: 'Versioned review preview' });
  await user.click(
    screen.getByRole('button', { name: 'Publish reviewed preview' }),
  );
  await user.click(screen.getByRole('button', { name: 'Cancel publication' }));
  expect(api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(
    0,
  );
  await user.click(
    screen.getByRole('button', { name: 'Publish reviewed preview' }),
  );
  await user.click(screen.getByRole('button', { name: 'Confirm publication' }));
  expect(await screen.findAllByRole('alert')).toHaveLength(2);
  expect(api).toHaveBeenCalledWith('/admin/draws/draw1/publish', {
    method: 'POST',
    body: JSON.stringify({ previewVersion: 'review-v1' }),
  });
});
test('admin payout requires reference and submits no client-controlled amount or paid flag', async () => {
  const claim = {
    id: 'w1',
    month: '2026-09',
    tier: 5,
    amountMinor: 123,
    currency: 'GBP',
    verification: 'approved',
    revision: 2,
    entry: { scores: [{ value: 1 }], matches: [1] },
    submissions: [],
    timeline: [],
    payout: { status: 'pending' },
  };
  api.mockResolvedValue(claim);
  const user = userEvent.setup();
  mount('/admin/winners/w1', '/admin/winners/:id', <AdminWinnerDetailPage />);
  await screen.findByRole('textbox', { name: 'Settlement reference' });
  await user.click(
    screen.getByRole('button', { name: 'Record payout', exact: true }),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.type(
    screen.getByRole('textbox', { name: 'Settlement reference' }),
    'DEMO-REFERENCE-1',
  );
  await user.click(
    screen.getByRole('button', { name: 'Record payout', exact: true }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Confirm recorded payout' }),
  );
  expect(api).toHaveBeenCalledWith('/admin/winners/w1/payout', {
    method: 'POST',
    body: JSON.stringify({ mode: 'simulated', reference: 'DEMO-REFERENCE-1' }),
  });
});
