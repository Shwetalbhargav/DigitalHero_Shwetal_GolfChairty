import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  NumberRow,
  formatMoney,
} from '../../components/draws/DrawComponents.jsx';
import { downloadProof, proofUrl } from '../../modules/winnings/winnings.api.js';
import VerificationTimeline from '../../components/winnings/VerificationTimeline.jsx';
import { useAdminAction } from '../../modules/admin/useAdminAction.js';
import { AdminLoad, ActionNotice, Paging } from './AdminCommon.jsx';
export function AdminWinnersPage() {
  const [params] = useSearchParams();
  const [page, setPage] = useState(1),
    [verification, setVerification] = useState(params.get('verification') || ''),
    [payout, setPayout] = useState(params.get('payout') || '');
  const load = useCallback(
    (signal) =>
      api(
        `/admin/winners?page=${page}&verification=${verification}&payout=${payout}`,
        { signal },
      ),
    [page, verification, payout],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <h1>Winner verification & payouts</h1>
      <div className="button-row">
        <label>
          Verification filter
          <select
            value={verification}
            onChange={(e) => {
              setVerification(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All decisions</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <label>
          Payout filter
          <select
            value={payout}
            onChange={(e) => {
              setPayout(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All payouts</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="expired">Expired</option>
          </select>
        </label>
      </div>
      <AdminLoad state={state}>
        {state.data && (
          <>
            <div className="draw-grid">
              {state.data.items.map((row) => (
                <article className="card" key={row.id}>
                  <h2>
                    {row.month} · {row.tier} matches
                  </h2>
                  <p>{formatMoney(row.amountMinor, row.currency)}</p>
                  <p>{row.member?.name} · {row.member?.email}</p><p>{row.submissions.length ? 'Submitted ' + new Date(row.submissions.at(-1).at).toLocaleString('en-GB') : 'Awaiting first scorecard'}</p>
                  <p>
                    Verification {row.verification} · Payout {row.payout.status}
                  </p>
                  <Link to={'/admin/winners/' + row.id}>
                    Review claim {row.id.slice(-6)}
                  </Link>
                </article>
              ))}
            </div>
            {!state.data.items.length && (
              <p>No winning entries match these filters.</p>
            )}
            <Paging data={state.data} page={page} setPage={setPage} />
          </>
        )}
      </AdminLoad>
    </section>
  );
}
function WinnerReview({ row, onSaved }) {
  const [preview, setPreview] = useState(null), [zoom, setZoom] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function showProof(id) { setDownloadError(''); try { setPreview(await proofUrl(row.id, id, true)); } catch (e) { setDownloadError(e.message); } }
  const [reason, setReason] = useState(''),
    [reference, setReference] = useState(''),
    [confirm, setConfirm] = useState(false),
    [downloadError, setDownloadError] = useState('');
  const action = useAdminAction(() => {
    setConfirm(false);
    onSaved();
  });
  async function proof(id) {
    setDownloadError('');
    try {
      await downloadProof(row.id, id, true);
    } catch (e) {
      setDownloadError(e.message);
    }
  }
  return (
    <>
      <h2>
        {row.month} · {row.tier}-match award
      </h2>
      <p className="prize-amount">
        {formatMoney(row.amountMinor, row.currency)}
      </p>
      <p>{row.member?.name} · {row.member?.email}</p>
      <table><caption>Scores recorded for this draw</caption><thead><tr><th>Round date</th><th>Stableford points</th></tr></thead><tbody>{row.entry.scores.map((s, index) => <tr key={s.roundDate || index}><td>{s.roundDate || 'See entry record'}</td><td>{s.value}</td></tr>)}</tbody></table>
      <p>
        Verification: <strong>{row.verification}</strong> · Payout:{' '}
        <strong>{row.payout.status}</strong>
      </p>
      {row.rejectionReason && <p>Rejection reason: {row.rejectionReason}</p>}
      {row.claimDeadline && <p>Claim deadline: {new Date(row.claimDeadline).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC. Timely submitted proof remains protected while under review.</p>}
      {row.claimDeadline && new Date(row.claimDeadline) < new Date() && (row.verification === 'rejected' || (row.verification === 'pending' && !row.submissions.length)) && <form className="admin-form" onSubmit={(e) => { e.preventDefault(); action.run(`/winners/${row.id}/expire`, 'POST', { reason }); }}><h3>Close overdue claim</h3><p>A five-match award returns to the next jackpot. Other expired awards remain separately recorded. This cannot be undone here.</p><Input label="Claim expiry reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} /><Button type="submit" variant="danger" loading={action.busy}>Expire overdue claim</Button></form>}
      <NumberRow
        numbers={row.entry.scores.map((score) => score.value)}
        matches={row.entry.matches}
      />
      <p>
        Evidence is served only after admin/owner authorization; these are not
        public proof links.
      </p>
      {downloadError && <p role="alert">{downloadError}</p>}
      {row.submissions.map((submission, index) => (
        <div className="button-row" key={submission.id}>
        <Button variant="secondary" onClick={() => showProof(submission.id)}>Preview proof {index + 1}</Button>
        <Button
          key={submission.id}
          variant="secondary"
          onClick={() => proof(submission.id)}
        >
          View protected proof {index + 1}
        </Button>
        <span>Submitted {new Date(submission.at).toLocaleString('en-GB')}</span></div>
      ))}
      {preview && <section className="card"><h3>Private scorecard preview</h3><Button variant="ghost" onClick={() => setZoom(!zoom)}>{zoom ? 'Fit image' : 'Zoom image'}</Button><div className="proof-preview"><img src={preview} alt="Submitted winning scorecard" style={{ width: zoom ? '150%' : '100%', maxWidth: zoom ? 'none' : '100%' }} /></div></section>}
      {!row.submissions.length && <p>The member has not submitted proof.</p>}
      <ActionNotice action={action} />
      {row.verification === 'pending' && row.submissions.length > 0 && (
        <section className="admin-form">
          <h2>Review submitted evidence</h2>
          <Input
            label="Review reason (required for rejection)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
          />
          <div className="button-row">
            <Button
              loading={action.busy}
              onClick={() =>
                action.run(`/winners/${row.id}/review`, 'POST', {
                  decision: 'approved',
                  reason,
                  revision: row.revision,
                })
              }
            >
              Approve proof
            </Button>
            <Button
              variant="danger"
              loading={action.busy}
              disabled={reason.trim().length < 3}
              onClick={() =>
                action.run(`/winners/${row.id}/review`, 'POST', {
                  decision: 'rejected',
                  reason,
                  revision: row.revision,
                })
              }
            >
              Reject proof
            </Button>
          </div>
        </section>
      )}
      {row.verification === 'approved' && row.payout.status === 'pending' && (
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirm(true);
          }}
        >
          <h2>Record manual/demo settlement</h2>
          <p>
            This records an administrative settlement. It does not initiate or
            certify a bank transfer.
          </p>
          <Input
            label="Settlement reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            minLength={3}
            maxLength={120}
          />
          <Button type="submit" loading={action.busy}>
            Record payout
          </Button>
        </form>
      )}
      {row.payout.status === 'paid' && (
        <p>
          Recorded reference: {row.payout.reference} ·{' '}
          {new Date(row.payout.paidAt).toLocaleString('en-GB', {
            timeZone: 'UTC',
          })}{' '}
          UTC · simulated
        </p>
      )}
      <Modal
        open={confirm}
        title="Record this simulated settlement?"
        onClose={() => {
          if (!action.busy) setConfirm(false);
        }}
      >
        <p>
          {formatMoney(row.amountMinor, row.currency)} · Reference {reference}.
          Only one settlement can be recorded for this award.
        </p>
        <ActionNotice action={action} />
        <Button
          loading={action.busy}
          onClick={() =>
            action.run(`/winners/${row.id}/payout`, 'POST', {
              mode: 'simulated',
              reference,
            })
          }
        >
          Confirm recorded payout
        </Button>
      </Modal>
      <VerificationTimeline events={row.timeline} />
    </>
  );
}
export function AdminWinnerDetailPage() {
  const { id } = useParams();
  const load = useCallback(
    (signal) => api('/admin/winners/' + id, { signal }),
    [id],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <Link to="/admin/winners">Winner queue</Link>
      <h1>Review winning claim</h1>
      <AdminLoad state={state}>
        {state.data && (
          <WinnerReview
            key={id + '-' + state.data.revision}
            row={state.data}
            onSaved={state.retry}
          />
        )}
      </AdminLoad>
    </section>
  );
}
