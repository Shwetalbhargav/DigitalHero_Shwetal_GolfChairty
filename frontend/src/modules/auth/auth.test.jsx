import { afterEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './AuthContext.jsx';
import useAuth from '../../hooks/useAuth.js';
import AuthForm, { safeReturnTo } from './AuthForm.jsx';
import AdminRoute from '../../routes/AdminRoute.jsx';
import * as api from './auth.api.js';
vi.mock('./auth.api.js', () => ({
  getSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  getPolicy: vi.fn().mockResolvedValue({ maxContributionPercent: 50 }),
}));
vi.mock('../charities/charity.api.js', () => ({
  getCharities: vi
    .fn()
    .mockResolvedValue({
      items: [
        {
          id: 'a'.repeat(24),
          name: 'Demo charity',
          category: 'youth',
          isDemo: true,
        },
      ],
      pagination: { hasNextPage: false, hasPreviousPage: false },
    }),
}));
afterEach(() => vi.clearAllMocks());
const user = { id: 'member1', name: 'Alex', role: 'member' };
function SessionView() {
  const auth = useAuth();
  return (
    <>
      <p>{auth.user?.name || auth.status}</p>
      <button onClick={auth.signOut}>Logout</button>
    </>
  );
}
test('session bootstraps on reload and logout clears identity', async () => {
  api.getSession.mockResolvedValue({ user });
  api.logout.mockResolvedValue({ loggedOut: true });
  const view = render(
    <AuthProvider>
      <SessionView />
    </AuthProvider>,
  );
  expect(await screen.findByText('Alex')).toBeInTheDocument();
  view.unmount();
  render(
    <AuthProvider>
      <SessionView />
    </AuthProvider>,
  );
  expect(await screen.findByText('Alex')).toBeInTheDocument();
  await userEvent.click(screen.getByText('Logout'));
  await waitFor(() =>
    expect(screen.queryByText('Alex')).not.toBeInTheDocument(),
  );
  expect(api.getSession).toHaveBeenCalledTimes(2);
});
test('admin guard rejects authenticated members', async () => {
  api.getSession.mockResolvedValue({ user });
  render(
    <MemoryRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/" element={<p>Private admin records</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByText('Administrator access required'),
  ).toBeInTheDocument();
  expect(screen.queryByText('Private admin records')).not.toBeInTheDocument();
});
test('invalid credentials remain accessible and preserve email; external return URLs rejected', async () => {
  api.getSession.mockRejectedValue({ status: 401 });
  api.login.mockRejectedValue(new Error('Email or password is incorrect.'));
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthForm />
      </AuthProvider>
    </MemoryRouter>,
  );
  await userEvent.type(
    screen.getByLabelText(/Email address/),
    'alex@example.com',
  );
  await userEvent.type(screen.getByLabelText(/^Password/), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Email or password',
  );
  expect(screen.getByLabelText(/Email address/)).toHaveValue(
    'alex@example.com',
  );
  expect(safeReturnTo('//evil.test')).toBe('/dashboard');
  expect(safeReturnTo('/dashboard/charity')).toBe('/dashboard/charity');
});
test('contribution below minimum receives a labelled field error', async () => {
  api.getSession.mockRejectedValue({ status: 401 });
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthForm registration />
      </AuthProvider>
    </MemoryRouter>,
  );
  await screen.findByText('Demo charity');
  const contribution = screen.getByLabelText(/Charity contribution/);
  await userEvent.clear(contribution);
  await userEvent.type(contribution, '9');
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(contribution).toHaveAttribute('aria-invalid', 'true');
  expect(contribution).toHaveAccessibleDescription(
    /Choose a whole percentage from 10 to 50/,
  );
  expect(api.register).not.toHaveBeenCalled();
});
