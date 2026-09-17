import { useCallback, useState } from 'react';
import useFetch from '../../hooks/useFetch.js';
import { getDraws } from '../../modules/draws/draw.api.js';
import { DrawCard } from '../../components/draws/DrawComponents.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
export default function DrawsPage() {
  const [page, setPage] = useState(1);
  const load = useCallback((signal) => getDraws(page, signal), [page]);
  const result = useFetch(load);
  return (
    <section className="stack-form">
      <p className="eyebrow">YOUR COMMUNITY</p>
      <h1>Monthly draws & results</h1>
      <p>
        Five distinct numbers. One highest matching tier per entry. All current
        prize funds and payouts are simulated.
      </p>
      {result.status === 'loading' && <Loader label="Loading draws…" />}
      {result.status === 'error' && (
        <ErrorState message={result.error.message} onRetry={result.retry} />
      )}{' '}
      {result.data &&
        (result.data.items.length ? (
          <>
            <div className="draw-grid">
              {result.data.items.map((draw) => (
                <DrawCard key={draw.id} draw={draw} />
              ))}
            </div>
            <div className="button-row">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous draws
              </Button>
              <span>Page {page}</span>
              <Button
                disabled={page * result.data.limit >= result.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next draws
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            title="No published draws yet"
            description="A configured schedule is not a published result. Return after an administrator has reviewed and published a draw."
          />
        ))}
    </section>
  );
}
