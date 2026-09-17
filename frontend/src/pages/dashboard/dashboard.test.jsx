import { expect, test, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../modules/auth/AuthContext.jsx';
import DashboardPage from './DashboardPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import { getDashboard, updateProfile } from '../../modules/users/user.api.js';
vi.mock('../../modules/users/user.api.js', () => ({
  getDashboard: vi.fn(),
  updateProfile: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const auth = {
  user: {
    id: 'u1',
    name: 'Alex',
    email: 'alex@example.com',
    displayDateFormat: 'iso',
  },
  refresh: vi.fn().mockResolvedValue({}),
  signOut: vi.fn(),
};
const wrap = (content) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>{content}</AuthContext.Provider>
    </MemoryRouter>,
  );
test('dashboard shows authoritative scores and unavailable future features while a section fails', async () => {
  getDashboard.mockResolvedValue({
    subscription: { status: 'ready', data: null },
    scores: {
      status: 'ready',
      data: {
        count: 1,
        remaining: 4,
        items: [{ id: 's1', value: 45, roundDate: '2026-09-01' }],
      },
    },
    charity: {
      status: 'error',
      data: null,
      message: 'Charity service unavailable',
    },
    upcomingDraw: {
      status: 'unavailable',
      message: 'Draw scheduling is not connected yet.',
    },
    participation: {
      status: 'unavailable',
      count: null,
      message: 'Participation unavailable',
    },
    winnings: {
      status: 'unavailable',
      amountMinor: null,
      message: 'Winnings unavailable',
    },
  });
  wrap(<DashboardPage />);
  expect(await screen.findByText('45 points')).toBeInTheDocument();
  expect(screen.getByText('2026-09-01')).toBeInTheDocument();
  expect(screen.getByText('Charity service unavailable')).toBeInTheDocument();
  expect(screen.getAllByText('Unavailable')).toHaveLength(3);
  expect(
    screen.getByRole('link', { name: 'Manage subscription' }),
  ).toBeInTheDocument();
});
test('profile submits only name and actual date display preference and preserves failed input', async () => {
  updateProfile
    .mockRejectedValueOnce(new Error('Unable to save'))
    .mockResolvedValueOnce({ user: { ...auth.user, name: 'Taylor' } });
  wrap(<ProfilePage />);
  const name = screen.getByLabelText(/Display name/);
  await userEvent.clear(name);
  await userEvent.type(name, 'Taylor');
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save');
  expect(name).toHaveValue('Taylor');
  expect(updateProfile).toHaveBeenLastCalledWith({
    name: 'Taylor',
    displayDateFormat: 'iso',
  });
  expect(screen.getByLabelText(/Email address/)).toHaveAttribute('readonly');
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(await screen.findByRole('status')).toHaveTextContent('saved');
});
