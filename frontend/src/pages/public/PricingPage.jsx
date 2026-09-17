import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import useAuth from '../../hooks/useAuth.js';
import { getPlans } from '../../modules/subscriptions/subscription.api.js';
import { money } from '../../modules/payments/payment.api.js';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loader from '../../components/common/Loader.jsx';
export function MembershipPlans() {
  const state = useFetch(getPlans);
  const { user } = useAuth();
  if (state.status === 'loading') return <Loader label="Loading membership prices…" />;
  if (state.status === 'error') return <ErrorState message={state.error.message} onRetry={state.retry} />;
  const data = state.data;
  if (!data) return null;
  const monthly = data.plans.find((plan) => plan.id === 'monthly');
  return <><div className="plan-grid">{data.plans.map((plan) => <article className="card" key={plan.id}>
    <p className="eyebrow">{plan.months === 12 ? 'A YEAR OF PURPOSE' : 'START SOMETHING GOOD'}</p>
    <h3>{plan.months === 12 ? 'Yearly membership' : 'Monthly membership'}</h3>
    <p className="plan-price">{money(plan.amountMinor, data.currency)}<small> / {plan.months === 12 ? 'year' : 'month'}</small></p>
    {plan.months === 12 && <p>Save {money(monthly.amountMinor * 12 - plan.amountMinor, data.currency)} compared with twelve monthly payments.</p>}
    <ul><li>Your latest five golf scores</li><li>Monthly draws with the same eligibility for both plans</li><li>At least 10% for your chosen charity</li></ul>
    <p>At the minimum pledge, {money(Math.floor(plan.amountMinor / 10), data.currency)} supports your cause. {data.prizePercent}% is allocated to the prize pool.</p>
    <Link className="button button--primary" to={user ? '/dashboard/subscription?plan=' + plan.id : '/register?plan=' + plan.id}>Choose {plan.id}</Link>
  </article>)}</div><p className="muted">Demo prices and allocations. No real money moves in the local demo. You can increase your charity contribution during signup.</p></>;
}
export default function PricingPage() {
  return <section className="content-page stack-form"><p className="eyebrow">MEMBERSHIP WITH MEANING</p><h1>A little play. A lasting purpose.</h1><p>Choose your plan before creating an account. Both plans offer the same features and draw eligibility.</p><MembershipPlans /></section>;
}
