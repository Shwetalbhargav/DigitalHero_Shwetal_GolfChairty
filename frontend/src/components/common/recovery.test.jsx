import { expect, test, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import ErrorBoundary from './ErrorBoundary.jsx';
import AuthProvider, { AuthContext } from '../../modules/auth/AuthContext.jsx';
import { notifySessionLoss } from '../../services/session.js';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
test('render boundary focuses safe recovery without exposing the thrown message', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken() {
    throw new Error('private-stack-secret');
  }
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
  expect(
    screen.getByRole('heading', { name: 'This page could not be displayed' }),
  ).toHaveFocus();
  expect(screen.queryByText(/private-stack-secret/)).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Return to homepage' }),
  ).toHaveAttribute('href', '/');
});
test('session loss removes cached private content; login failures and ordinary forbidden responses do not', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          user: { id: 'private-member' },
          subscription: { status: 'active' },
        },
      }),
    }),
  );
  function View() {
    const auth = useContext(AuthContext);
    return <p>{auth.user ? 'Private score cache' : 'Signed out'}</p>;
  }
  render(
    <AuthProvider>
      <View />
    </AuthProvider>,
  );
  await screen.findByText('Private score cache');
  notifySessionLoss(401, 'INVALID_CREDENTIALS', '/auth/login');
  notifySessionLoss(403, 'ADMIN_REQUIRED', '/admin/users');
  expect(screen.getByText('Private score cache')).toBeInTheDocument();
  notifySessionLoss(401, 'UNAUTHENTICATED', '/scores');
  await waitFor(() =>
    expect(screen.getByText('Signed out')).toBeInTheDocument(),
  );
  expect(screen.queryByText('Private score cache')).not.toBeInTheDocument();
});
