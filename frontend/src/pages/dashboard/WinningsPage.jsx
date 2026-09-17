import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import { getWinnings } from '../../modules/winnings/winnings.api.js';
import { formatMoney } from '../../components/draws/DrawComponents.jsx';
import Card from '../../components/common/Card.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Button from '../../components/common/Button.jsx';
export default function WinningsPage() {
  const [page, setPage] = useState(1);
  const load = useCallback((signal) => getWinnings(page, signal), [page]);
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <p className="eyebrow">YOUR AWARDS</p>
      <h1>Winnings & verification</h1>
      <p>
        Prize awarded, verification decision and payout status are separate. All
        current settlement records are simulated; no bank transfer is made.
      </p>
      {state.status === 'loading' && <Loader label="Loading winnings…" />}
      {state.status === 'error' && (
        <ErrorState message={state.error.message} onRetry={state.retry} />
      )}{' '}
      {state.data &&
        (state.data.items.length ? (
          <>
            <div className="draw-grid">
              {state.data.items.map((row) => (
                <Card key={row.id}>
                  <h2>
                    {row.month} · {row.tier} matches
                  </h2>
                  <p className="prize-amount">
                    {formatMoney(row.amountMinor, row.currency)}
                  </p>
                  <p>Verification: {row.verification}</p>
                  <p>Payout: {row.payout.status} · simulated</p>
                  <Link to={'/dashboard/winnings/' + row.id}>
                    View claim and proof
                  </Link>
                </Card>
              ))}
            </div>
            <div className="button-row">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous winnings
              </Button>
              <span>Page {page}</span>
              <Button
                disabled={page * state.data.limit >= state.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next winnings
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            title="No winnings yet"
            description="Published winning entries will appear here. Your current scores alone do not award a prize."
          />
        ))}
    </section>
  );
}
