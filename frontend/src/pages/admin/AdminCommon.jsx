import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
import useFetch from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { formatMoney } from '../../components/draws/DrawComponents.jsx';
const overview = (signal) => api('/admin/overview', { signal });
export function AdminLoad({ state, children }) {
  return (
    <>
      {state.status === 'loading' && (
        <Loader label="Loading administration data…" />
      )}
      {state.status === 'error' && (
        <ErrorState message={state.error.message} onRetry={state.retry} />
      )}{' '}
      {state.data && children}
    </>
  );
}
export function ActionNotice({ action }) {
  const errorRef = useRef(null);
  useEffect(() => {
    if (action.error) errorRef.current?.focus();
  }, [action.error]);
  return (
    <>
      {action.error && (
        <p role="alert" tabIndex={-1} ref={errorRef}>
          {action.error}
        </p>
      )}
      {action.message && <p role="status">{action.message}</p>}
    </>
  );
}
export function Paging({ data, page, setPage }) {
  return (
    <div className="button-row">
      <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous page
      </Button>
      <span>
        Page {page} · {data.total} records
      </span>
      <Button
        disabled={page * data.limit >= data.total}
        onClick={() => setPage(page + 1)}
      >
        Next page
      </Button>
    </div>
  );
}
export function AuditHistory({ events }) {
  return (
    <section>
      <h2>Audit history</h2>
      {events.length ? (
        <ol className="verification-timeline">
          {events.map((event) => (
            <li key={event._id}>
              <strong>{event.action}</strong>
              <p>{event.reason}</p>
              <p>
                Actor {event.actor} ·{' '}
                {new Date(event.at).toLocaleString('en-GB', {
                  timeZone: 'UTC',
                })}{' '}
                UTC
              </p>
              <details>
                <summary>Before and after values</summary>
                <pre className="audit-json">
                  {JSON.stringify(
                    { before: event.before, after: event.after },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </li>
          ))}
        </ol>
      ) : (
        <p>No administrative changes recorded.</p>
      )}
    </section>
  );
}
export function AdminHome() {
  const state = useFetch(overview);
  return (
    <section className="stack-form">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Operations workspace</h1>
      <p>
        Manage members, charities, reviewed monthly draws and manual/demo
        settlements. Sensitive changes are audited; no bank transfer is
        performed.
      </p>
      <div className="draw-grid">
        {state.data && [
          ['Active members', state.data.activeMembers, '/admin/users?subscription=active'],
          ['Proofs awaiting review', state.data.pendingProofs, '/admin/winners?verification=pending'],
          ['Approved awards awaiting payout', state.data.unpaidAwards, '/admin/winners?verification=approved&payout=pending'],
        ].map(([label, count, href]) => <Link className="card" key={label} to={href}><h2>{label}</h2><p className="prize-amount">{count}</p><span>Open queue →</span></Link>)}
      </div>
      {state.error && <ErrorState message={state.error.message} onRetry={state.retry} />}
      {state.data && <section className="card"><h2>Next draw</h2><p>{state.data.nextDraw ? state.data.nextDraw.month + ' · ' + new Date(state.data.nextDraw.scheduledAt).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC' : 'No upcoming draw. Configure one to keep members informed.'}</p><Link to={state.data.nextDraw ? '/admin/draws/' + state.data.nextDraw._id : '/admin/draws/new'}>Manage next draw</Link>{state.data.rollovers.map((r) => <p key={r._id}>Jackpot carried forward: {formatMoney(r.amountMinor, r._id)}</p>)}</section>}
      <h2>Manage your platform</h2>
      <div className="draw-grid">
        {[
          ['users', 'Members & subscriptions'],
          ['charities', 'Charities & media'],
          ['draws', 'Draw operations'],
          ['winners', 'Winner review & payouts'],
          ['reports', 'Reports & reconciliation'],
        ].map(([path, title]) => (
          <Link className="card" key={path} to={'/admin/' + path}>
            {title}
          </Link>
        ))}
      </div>
    </section>
  );
}
