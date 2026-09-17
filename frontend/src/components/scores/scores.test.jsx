import { expect, test, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreForm from './ScoreForm.jsx';
import ScoreProgress from './ScoreProgress.jsx';
import { displayRoundDate } from './ScoreCard.jsx';
import { createScore, updateScore } from '../../modules/scores/score.api.js';
vi.mock('../../modules/scores/score.api.js', () => ({
  createScore: vi.fn(),
  updateScore: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
test('score form validates boundaries and preserves date-only values without conversion', async () => {
  render(<ScoreForm today="2026-09-17" onSaved={vi.fn()} />);
  const value = screen.getByLabelText(/Stableford score/);
  const date = screen.getByLabelText(/Round date/);
  for (const invalid of ['0', '46', '1.5']) {
    await userEvent.clear(value);
    await userEvent.type(value, invalid);
    await userEvent.click(screen.getByRole('button', { name: 'Save score' }));
    expect(value).toHaveAttribute('aria-invalid', 'true');
  }
  expect(createScore).not.toHaveBeenCalled();
  expect(date).toHaveValue('2026-09-17');
  expect(displayRoundDate('2024-03-01')).toBe('01/03/2024');
  expect(displayRoundDate('2024-02-29')).toBe('29/02/2024');
});
test('duplicate date response labels date and retains typed input', async () => {
  createScore.mockRejectedValue({
    code: 'DUPLICATE_ROUND_DATE',
    message: 'You already have a score for this round date.',
  });
  render(<ScoreForm today="2026-09-17" onSaved={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/Stableford score/), '45');
  fireEvent.change(screen.getByLabelText(/Round date/), {
    target: { value: '2026-09-10' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Save score' }));
  expect(
    await screen.findByText('You already have a score for this round date.'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/Round date/)).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(screen.getByLabelText(/Stableford score/)).toHaveValue(45);
  expect(screen.getByLabelText(/Round date/)).toHaveValue('2026-09-10');
});
test('edit uses owned ID; pending submission blocks duplicates and network error preserves values', async () => {
  let reject;
  updateScore.mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  render(
    <ScoreForm
      score={{ id: 's1', value: 1, roundDate: '2026-09-01' }}
      today="2026-09-17"
      onSaved={vi.fn()}
    />,
  );
  const button = screen.getByRole('button', { name: 'Save score changes' });
  fireEvent.submit(button.closest('form'));
  fireEvent.submit(button.closest('form'));
  expect(updateScore).toHaveBeenCalledTimes(1);
  expect(updateScore).toHaveBeenCalledWith('s1', {
    value: 1,
    roundDate: '2026-09-01',
  });
  reject(new Error('Connection lost'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
  expect(screen.getByLabelText(/Stableford score/)).toHaveValue(1);
});
test('progress explains remaining scores without inventing draw entry', () => {
  render(<ScoreProgress count={3} active={false} />);
  expect(screen.getByText(/2 more scores needed/)).toBeInTheDocument();
  expect(screen.getByText(/does not create a draw entry/)).toBeInTheDocument();
});
