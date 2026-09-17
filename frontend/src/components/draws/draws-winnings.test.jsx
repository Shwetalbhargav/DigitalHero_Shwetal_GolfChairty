import { test, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DrawNumber, ScoreComparison, PrizeTier } from './DrawComponents.jsx';
import ProofUpload, { validateProofFile } from '../winnings/ProofUpload.jsx';
import VerificationTimeline from '../winnings/VerificationTimeline.jsx';
import { uploadProof } from '../../modules/winnings/winnings.api.js';
vi.mock('../../modules/winnings/winnings.api.js', () => ({
  uploadProof: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
test('match text is accessible and authoritative prizes are displayed without recomputation', () => {
  render(
    <MemoryRouter>
      <DrawNumber value={12} matched />
      <PrizeTier
        tier={{ tier: 5, percentage: 40, amountMinor: 101, winnerCount: 2 }}
        currency="GBP"
      />
      <ScoreComparison
        numbers={[1, 2, 3, 4, 5]}
        result={{
          status: 'eligible',
          scores: [1, 2, 3, 8, 9].map((value) => ({ value })),
          matches: [1, 2, 3],
          tier: 3,
          amountMinor: 37,
          currency: 'GBP',
          winnerId: 'winner',
        }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText('12, matched')).toBeInTheDocument();
  expect(screen.getByText('£1.01')).toBeInTheDocument();
  expect(screen.getByText('£0.37')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'View winnings and submit proof' }),
  ).toHaveAttribute('href', '/dashboard/winnings/winner');
});
test('insufficient and ineligible states do not pretend a current score creates an entry', () => {
  render(
    <ScoreComparison result={{ status: 'insufficient_scores' }} numbers={[]} />,
  );
  expect(screen.getByText('Five scores were required')).toBeInTheDocument();
  expect(screen.queryByText(/Prize awarded/)).not.toBeInTheDocument();
});
test('proof validates size/type and preserves selected input after failure for explicit retry', async () => {
  expect(validateProofFile({ type: 'application/pdf', size: 20 })).toMatch(
    /PNG/,
  );
  expect(
    validateProofFile({ type: 'image/png', size: 6 * 1024 * 1024 }),
  ).toMatch(/5 MB/);
  uploadProof
    .mockRejectedValueOnce(new Error('Storage unavailable'))
    .mockResolvedValueOnce({});
  const saved = vi.fn();
  const user = userEvent.setup();
  render(
    <ProofUpload
      winning={{ id: 'owned', verification: 'rejected', proofStorage: 'local' }}
      onSaved={saved}
    />,
  );
  const file = new File(['fixture'], 'proof.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('Winning scorecard proof'), file);
  await user.click(
    screen.getByRole('button', { name: 'Submit proof for review' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Storage unavailable',
  );
  expect(screen.getByLabelText('Winning scorecard proof').files[0]).toBe(file);
  expect(saved).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole('button', { name: 'Submit proof for review' }),
  );
  expect(saved).toHaveBeenCalledTimes(1);
});
test('verification rejection and settlement are separate timeline events', () => {
  render(
    <VerificationTimeline
      events={[
        {
          kind: 'rejected',
          at: '2026-01-01T00:00:00Z',
          reason: 'Image is blurred',
        },
        { kind: 'simulated_payout_paid', at: '2026-01-02T00:00:00Z' },
      ]}
    />,
  );
  expect(screen.getByText('Verification rejected')).toBeInTheDocument();
  expect(screen.getByText('Image is blurred')).toBeInTheDocument();
  expect(screen.getByText('Simulated payout recorded')).toBeInTheDocument();
});
