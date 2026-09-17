import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import useAuth from '../../hooks/useAuth.js';
import { getScores, deleteScore } from '../../modules/scores/score.api.js';
import ScoreCard from '../../components/scores/ScoreCard.jsx';
import ScoreProgress from '../../components/scores/ScoreProgress.jsx';
import ScoreForm from '../../components/scores/ScoreForm.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Button from '../../components/common/Button.jsx';
export default function ScoresPage() {
  const { user } = useAuth();
  const result = useFetch(getScores);
  const location = useLocation();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const pending = useRef(false);
  const heading = useRef(null);
  const returnFocus = useRef(null);
  function open(type, score) {
    returnFocus.current = null;
    setError('');
    setDialog({ type, score });
  }
  function changed(message) {
    // The deleted trigger may disappear; let dialog cleanup restore a stable target.
    returnFocus.current = heading.current;
    setDialog(null);
    setNotice(message);
    result.retry();
  }
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await deleteScore(dialog.score.id);
      changed('Score deleted. Your latest scores have been refreshed.');
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="stack-form">
      <p className="eyebrow">YOUR SCORECARD</p>
      <h1 ref={heading} tabIndex={-1}>
        Golf scores
      </h1>
      <p>
        Keep your latest five rounds, newest first. Adding a newer sixth score
        replaces the oldest. A date older than a full retained set is rejected.
        Changes never rewrite historical draw snapshots.
      </p>
      {notice && <p role="status">{notice}</p>}
      {result.status === 'loading' && <Loader label="Loading scores…" />}
      {result.status === 'error' && (
        <ErrorState message={result.error.message} onRetry={result.retry} />
      )}
      {result.data && (
        <>
          <ScoreProgress
            count={result.data.count}
            active={result.data.subscription?.active}
          />
          {result.data.subscription?.active ? (
            <Link className="button button--primary" to="/dashboard/scores/new">
              Add score
            </Link>
          ) : (
            <p>
              <Link to="/dashboard/subscription">Manage subscription</Link> to
              add, edit or delete scores. Existing scores remain readable.
            </p>
          )}
          {result.data.items.length ? (
            <div className="score-grid">
              {result.data.items.map((score) => (
                <ScoreCard
                  key={score.id}
                  score={score}
                  dateFormat={user.displayDateFormat}
                  active={result.data.subscription?.active}
                  onEdit={(record) => open('edit', record)}
                  onDelete={(record) => open('delete', record)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No rounds recorded yet"
              description="Your next round is a place to start. Record one score per date."
            />
          )}
        </>
      )}
      <Modal
        returnFocusRef={returnFocus}
        open={!!dialog}
        title={
          dialog?.type === 'edit' ? 'Edit your score' : 'Delete this score?'
        }
        onClose={() => {
          if (!busy) setDialog(null);
        }}
      >
        {dialog?.type === 'edit' ? (
          <ScoreForm
            key={dialog.score.id}
            score={dialog.score}
            today={result.data?.today || new Date().toISOString().slice(0, 10)}
            onBusyChange={setBusy}
            onSaved={() =>
              changed('Score updated. Your latest scores have been refreshed.')
            }
          />
        ) : (
          dialog && (
            <>
              <p>
                This removes the score from {dialog.score.roundDate}. Historical
                draw snapshots stay unchanged.
              </p>
              {error && <p role="alert">{error}</p>}
              <div className="button-row">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Keep score
                </Button>
                <Button variant="danger" loading={busy} onClick={remove}>
                  Confirm deletion
                </Button>
              </div>
            </>
          )
        )}
      </Modal>
    </section>
  );
}
