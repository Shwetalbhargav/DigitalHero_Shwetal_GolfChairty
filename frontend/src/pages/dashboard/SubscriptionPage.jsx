import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import useAuth from '../../hooks/useAuth.js';
import {
  getPlans,
  getSubscription,
  checkout,
  cancelSubscription,
} from '../../modules/subscriptions/subscription.api.js';
import { money } from '../../modules/payments/payment.api.js';
import Button from '../../components/common/Button.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Modal from '../../components/common/Modal.jsx';
import { api } from '../../services/api.js';
export default function SubscriptionPage() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const load = useCallback(async (signal) => {
    const [plans, membership] = await Promise.all([
      getPlans(signal),
      getSubscription(signal),
    ]);
    return { ...plans, ...membership };
  }, []);
  const result = useFetch(load);
  const [plan, setPlan] = useState(params.get('plan') === 'yearly' ? 'yearly' : 'monthly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const pending = useRef(false);
  const request = useRef(null);
  async function purchase() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const renewal = !!result.data.subscription;
    if (request.current?.plan !== plan)
      request.current = { plan, key: crypto.randomUUID() };
    try {
      const payment = await checkout(plan, request.current.key, renewal);
      if (payment.checkoutUrl) { window.location.assign(payment.checkoutUrl); return; }
      navigate('/payments/' + payment.id);
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function cancel() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await cancelSubscription();
      setConfirm(false);
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
    return <Loader label="Loading subscription…" />;
  if (result.status === 'error')
    return <ErrorState message={result.error.message} onRetry={result.retry} />;
  const data = result.data;
  const membership = data.subscription;
  return (
    <section className="stack-form">
      <p className="eyebrow">YOUR MEMBERSHIP · {data.mode === 'stripe' ? 'STRIPE SANDBOX' : 'SIMULATED BILLING'}</p>
      <h1>Subscription & billing</h1>
      {data.mode !== 'stripe' ? <p>
        No real money is charged. Demo membership is separate from real draw
        entry. Renewal is manual in this demo; there is no automatic charge or
        grace period.
      </p> : <p>Checkout uses Stripe test mode. Use test payment details only. Membership activates after payment is confirmed by the provider. Return here to refresh its status.</p>}
      {data.mode === 'stripe' && <Button variant="secondary" onClick={result.retry}>Refresh payment status</Button>}
      {membership?.mode === 'stripe' && <Button variant="secondary" onClick={async () => { try { const data = await api('/subscriptions/portal', { method: 'POST', body: '{}' }); window.location.assign(data.url); } catch (e) { setError(e.message); } }}>Manage payment method & invoices</Button>}
      {error && <p role="alert">{error}</p>}
      <div className="membership-summary">
        <h2>
          {membership
            ? membership.status === 'active'
              ? 'Your demo membership is active'
              : 'Your membership has lapsed'
            : 'Choose your membership plan'}
        </h2>
        {membership && (
          <>
            <p>
              {membership.plan} · Access through{' '}
              <time dateTime={membership.periodEnd}>
                {new Date(membership.periodEnd).toLocaleString('en-GB', {
                  timeZone: 'UTC',
                })}{' '}
                UTC
              </time>
            </p>
            <p>
              {membership.cancelAtPeriodEnd
                ? 'Cancellation scheduled. Access ends at the date above.'
                : membership.mode === 'stripe' ? 'Your plan renews automatically through Stripe.' : 'Renew manually after this period ends to continue access.'}
            </p>
            {membership.active && !membership.cancelAtPeriodEnd && (
              <Button variant="secondary" onClick={() => setConfirm(true)}>
                Cancel at period end
              </Button>
            )}
          </>
        )}
      </div>
      {!membership?.active && (
        <>
          <fieldset className="plan-grid">
            <legend>Select your plan</legend>
            {data.plans.map((option) => (
              <label
                className={
                  'plan-card ' +
                  (plan === option.id ? 'plan-card--selected' : '')
                }
                key={option.id}
              >
                <input
                  type="radio"
                  name="plan"
                  value={option.id}
                  checked={plan === option.id}
                  onChange={() => setPlan(option.id)}
                />
                <span className="eyebrow">
                  {option.id === 'yearly'
                    ? 'ANNUAL COMMITMENT'
                    : 'MONTHLY FLEXIBILITY'}
                </span>
                <h2>
                  {option.id === 'yearly' ? 'Yearly member' : 'Monthly member'}
                </h2>
                <p className="plan-price">
                  {money(option.amountMinor, data.currency)}
                  <small> / {option.months === 12 ? 'year' : 'month'}</small>
                </p>
                {option.months === 12 && (
                  <p>
                    Save{' '}
                    {money(
                      data.plans.find((p) => p.id === 'monthly').amountMinor *
                        12 -
                        option.amountMinor,
                      data.currency,
                    )}{' '}
                    compared with twelve monthly periods.
                  </p>
                )}
                <p>
                  Your {auth.user.contributionPercent}% charitable pledge is
                  included.
                </p>
                <p>
                  Identical membership access. Annual billing does not increase
                  draw odds.
                </p>
              </label>
            ))}
          </fieldset>
          <Button loading={busy} disabled={!data.available} onClick={purchase}>
            {data.mode === 'stripe' ? 'Continue to Stripe test checkout' : membership
              ? 'Review simulated renewal'
              : 'Review simulated subscription'}
          </Button>
          {!data.available && (
            <p role="status">
              Payments are unavailable. No real payment provider is configured.
            </p>
          )}
        </>
      )}
      <p>
        {data.prizePercent}% of subscription revenue is allocated to the demo
        prize pool; charity allocations use your selected percentage.{' '}
        <Link to="/dashboard/charity">Manage your charity</Link>.
      </p>
      <section className="stack-form">
        <h2>Recent subscription payments</h2>
        {data.payments.length ? (
          data.payments.map((payment) => (
            <article key={payment.id} className="payment-history">
              <strong>
                {payment.plan} · {money(payment.amountMinor, payment.currency)}
              </strong>
              <span>{payment.status} · {payment.mode === 'stripe' ? 'Stripe sandbox' : 'simulated'}</span>
              {payment.receiptUrl && <a href={payment.receiptUrl} target="_blank" rel="noreferrer">View provider invoice</a>}
              <Link to={'/payments/' + payment.id}>
                View payment {payment.id.slice(-6)}
              </Link>
            </article>
          ))
        ) : (
          <p>No subscription payments yet.</p>
        )}
      </section>
      <Modal
        open={confirm}
        title="Cancel at period end?"
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <p>
          You retain access until{' '}
          {membership &&
            new Date(membership.periodEnd).toLocaleDateString('en-GB', {
              timeZone: 'UTC',
            })}
          . No refund or payment is made in this simulation.
        </p>
        {error && <p role="alert">{error}</p>}
        <Button loading={busy} onClick={cancel}>
          Confirm cancellation
        </Button>
      </Modal>
    </section>
  );
}
