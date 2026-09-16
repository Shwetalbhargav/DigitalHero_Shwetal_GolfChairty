import { expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';
import { api } from './services/api.js';
vi.mock('./services/api.js', () => ({ api: vi.fn() }));
test('shows loading, failure and working retry before ready', async () => {
  api
    .mockRejectedValueOnce(new Error('Service is not ready.'))
    .mockResolvedValueOnce({ status: 'ready', database: 'connected' });
  render(<App />);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(await screen.findByText('Service is not ready.')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Check connection again' }),
  );
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
