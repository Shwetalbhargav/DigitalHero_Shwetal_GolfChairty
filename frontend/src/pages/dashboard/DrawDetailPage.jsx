import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import { getDraw, getDrawResult } from '../../modules/draws/draw.api.js';
import {
  NumberRow,
  PrizeTier,
  ScoreComparison,
  formatMoney,
} from '../../components/draws/DrawComponents.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
export default function DrawDetailPage() {
  const { id } = useParams();
  const load = useCallback(
    async (signal) => {
      const [draw, result] = await Promise.all([
        getDraw(id, signal),
        getDrawResult(id, signal),
      ]);
      return { draw, result };
    },
    [id],
  );
  const state = useFetch(load);
  const draw = state.data?.draw;
  return (
    <section className="stack-form">
      <Link to="/dashboard/draws">All monthly draws</Link>
      <h1>{draw ? draw.month + ' draw results' : 'Draw results'}</h1>
      {state.status === 'loading' && <Loader label="Loading draw snapshot…" />}
      {state.status === 'error' && (
        <ErrorState message={state.error.message} onRetry={state.retry} />
      )}{' '}
      {draw && (
        <>
          <p className="eyebrow">
            Published · simulated funds · {draw.strategy} strategy
          </p>
          <p>
            Snapshot cutoff:{' '}
            {new Date(draw.cutoff).toLocaleString('en-GB', { timeZone: 'UTC' })}{' '}
            UTC. Historical entries stay unchanged after score edits.
          </p>
          <NumberRow numbers={draw.numbers} />
          <div className="draw-grid">
            {draw.tiers.map((tier) => (
              <PrizeTier key={tier.tier} tier={tier} currency={draw.currency} />
            ))}
          </div>
          <ScoreComparison result={state.data.result} numbers={draw.numbers} />
          <p>
            Current-month pool {formatMoney(draw.poolMinor, draw.currency)};
            incoming jackpot{' '}
            {formatMoney(draw.incomingRolloverMinor, draw.currency)}; outgoing
            jackpot {formatMoney(draw.rolloverMinor, draw.currency)}. Unclaimed
            3/4-tier funds: {formatMoney(draw.unclaimedMinor, draw.currency)}.
          </p>
        </>
      )}
    </section>
  );
}
