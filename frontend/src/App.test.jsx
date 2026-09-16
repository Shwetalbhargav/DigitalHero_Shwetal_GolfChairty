import { expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';
import { api } from './services/api.js';
vi.mock('./services/api.js', () => ({ api: vi.fn() }));
beforeEach(() => window.history.replaceState({}, '', '/status'));
test('shows loading, failure and working retry before ready', async () => {
  api
    .mockRejectedValueOnce(new Error('Service is not ready.'))
    .mockResolvedValueOnce({ status: 'ready', database: 'connected' });
  render(<App />);
  expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
  expect(await screen.findByText('Service is not ready.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('Ready for what comes next.'),
  ).toBeInTheDocument();
});
test('unmount aborts in-flight request', () => {
  api.mockImplementation(() => new Promise(() => {}));
  const view = render(<App />);
  const signal = api.mock.calls.at(-1)[1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
});
test('member and admin shells expose previews and no private records', () => {
  window.history.replaceState({}, '', '/admin');
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Admin tools are not connected' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('navigation', { name: 'admin sidebar navigation' }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('main')).toHaveLength(1);
});
test('unknown URLs have a useful recovery route', () => {
  window.history.replaceState({}, '', '/does-not-exist');
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'This page does not exist' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Return to foundation' }),
  ).toHaveAttribute('href', '/');
});
