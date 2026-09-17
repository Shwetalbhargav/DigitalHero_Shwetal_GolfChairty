import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import {
  getWinning,
  downloadProof,
} from '../../modules/winnings/winnings.api.js';
import {
  NumberRow,
  formatMoney,
} from '../../components/draws/DrawComponents.jsx';
import VerificationTimeline from '../../components/winnings/VerificationTimeline.jsx';
import ProofUpload from '../../components/winnings/ProofUpload.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
export default function WinningDetailPage() {
  const { id } = useParams();
  const load = useCallback((signal) => getWinning(id, signal), [id]);
  const state = useFetch(load);
  const [error, setError] = useState('');
  const row = state.data;
  async function download(submission) {
    setError('');
    try {
      await downloadProof(id, submission);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section className="stack-form">
      <Link to="/dashboard/winnings">All winnings</Link>
      <h1>Winning entry & proof</h1>
      {state.status === 'loading' && <Loader label="Loading claim…" />}
      {state.status === 'error' && (
        <ErrorState message={state.error.message} onRetry={state.retry} />
      )}{' '}
      {row && (
        <>
          <h2>
            {row.month} · {row.tier}-match award
          </h2>
          <p className="prize-amount">
            {formatMoney(row.amountMinor, row.currency)}
          </p>
          <p>
            Verification: <strong>{row.verification}</strong>
          </p>
          {row.claimDeadline && <p>Submit your claim by {new Date(row.claimDeadline).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC. Proof submitted on time remains protected during review. If rejected, you have at least seven days to resubmit.</p>}
          {row.verification === 'expired' && <p>This claim has expired. Any five-match award has been returned to the jackpot.</p>}
          {row.rejectionReason && (
            <p role="status">Rejection reason: {row.rejectionReason}</p>
          )}
          <p>
            Payout: <strong>{row.payout.status}</strong> · simulated settlement,
            not a bank transfer
          </p>
          <Link to={'/dashboard/draws/' + row.drawId}>
            View immutable draw result
          </Link>
          <NumberRow
            numbers={row.entry.scores.map((score) => score.value)}
            matches={row.entry.matches}
          />
          {row.canSubmit ? (
            <ProofUpload winning={row} onSaved={state.retry} />
          ) : (
            <p>
              {row.verification === 'approved'
                ? 'Proof is approved. Settlement is handled by an administrator.'
                : row.proofStorage === 'disabled'
                  ? 'Evidence storage is currently unavailable.'
                  : row.submissions.length >= 5
                    ? 'The submission limit has been reached. Contact an administrator.'
                    : 'Your proof is under review. No further submission is needed.'}
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          {row.submissions.map((submission, index) => (
            <div key={submission.id}>
              <Button
                variant="secondary"
                onClick={() => download(submission.id)}
              >
                Download your proof {index + 1}
              </Button>
              <span>
                {' '}
                {submission.provider === 'local'
                  ? 'Local development evidence'
                  : 'Private evidence'}
              </span>
            </div>
          ))}
          <VerificationTimeline events={row.timeline} />
        </>
      )}
    </section>
  );
}
