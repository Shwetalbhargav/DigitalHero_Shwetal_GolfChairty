import { useCallback, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import useAuth from '../../hooks/useAuth.js';
import {
  getPayment,
  processPayment,
  retryPayment,
  money,
} from '../../modules/payments/payment.api.js';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
export default function PaymentPage() {
  const { id } = useParams();
  const auth = useAuth();
  const load = useCallback((signal) => getPayment(id, signal), [id]);
  const result = useFetch(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function act(scenario) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (scenario === 'retry') await retryPayment(id);
      else await processPayment(id, scenario);
      result.retry();
      await auth.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (result.status === 'loading')
    return (
      <main className="content-page">
        <Loader label="Loading payment…" />
      </main>
    );
  if (result.status === 'error')
    return (
      <main className="content-page">
        <ErrorState message={result.error.message} onRetry={result.retry} />
      </main>
    );
  const payment = result.data;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="content-page stack-form payment-panel"
    >
      <p className="eyebrow">SIMULATED PAYMENT · NO MONEY CHARGED</p>
      <h1>
        {payment.status === 'pending'
          ? 'Review your demo payment'
          : payment.status === 'succeeded'
            ? 'Simulation completed'
            : 'Simulated payment declined'}
      </h1>
      <p>
        {payment.purpose === 'donation'
          ? 'Independent donation'
          : payment.plan + ' subscription'}{' '}
        · {money(payment.amountMinor, payment.currency)}
      </p>
      <p>
        Charity: {payment.charityName} · {payment.contributionPercent}%
      </p>
      <p>Payment reference: {payment.id}</p>
      <p role="status">
        Status: {payment.status}. {payment.failureReason}
      </p>
      {error && <p role="alert">{error}</p>}
      {busy && <Loader label="Processing simulation…" />}
      {payment.status === 'pending' && (
        <>
          <p>
            Choose a test outcome. This is a demo adapter and cannot charge a
            card or transfer money.
          </p>
          <div className="button-row">
            <Button loading={busy} onClick={() => act('approve')}>
              Simulate approval
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => act('decline')}
            >
              Simulate decline
            </Button>
          </div>
        </>
      )}
      {payment.status === 'failed' && (
        <Button loading={busy} onClick={() => act('retry')}>
          Retry this demo payment
        </Button>
      )}
      {payment.purpose === 'donation' && (
        <p>
          This donation does not activate a subscription or grant draw
          eligibility.
        </p>
      )}
      <Link to="/dashboard">Return to account</Link>
      {payment.purpose === 'subscription' && (
        <Link to="/dashboard/subscription">Manage subscription</Link>
      )}
      {payment.allocations?.length > 0 && (
        <section>
          <h2>Simulated allocation record</h2>
          <p>
            These are recorded demo allocations, not transfers or tax receipts.
          </p>
          <ul className="allocation-list">
            {payment.allocations.map((row) => (
              <li key={row.period}>
                <strong>{row.period}</strong>
                <p>
                  Revenue {money(row.revenueMinor, payment.currency)} · Charity{' '}
                  {money(row.charityMinor, payment.currency)} · Prize{' '}
                  {money(row.prizeMinor, payment.currency)} · Platform{' '}
                  {money(row.platformMinor, payment.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
