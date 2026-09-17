import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCharities } from '../../modules/charities/charity.api.js';
import useFetch from '../../hooks/useFetch.js';
import CharityGrid from '../../components/charity/CharityGrid.jsx';
import CharityFilter from '../../components/charity/CharityFilter.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
export default function CharityListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '',
    category = params.get('category') || '',
    page = params.get('page') || '1';
  const load = useCallback(
    (signal) => getCharities({ q, category, page, limit: 12 }, signal),
    [q, category, page],
  );
  const result = useFetch(load);
  return (
    <section className="content-page stack-form">
      <p className="eyebrow">GOOD BEYOND THE GREEN</p>
      <h1>Find a cause close to you.</h1>
      <p>
        Explore active charities and choose where your support goes. Demo
        records are clearly marked; no live impact totals are implied.
      </p>
      <CharityFilter
        key={q + ':' + category}
        query={{ q, category, page }}
        onChange={(query) => setParams(query, { replace: true })}
      />
      {result.status === 'loading' && (
        <Loader label="Loading charities…" variant="skeleton" />
      )}
      {result.status === 'error' && (
        <ErrorState message={result.error.message} onRetry={result.retry} />
      )}
      {result.data && (
        <>
          <CharityGrid charities={result.data.items} />
          <div className="button-row">
            <Button
              disabled={!result.data.pagination.hasPreviousPage}
              onClick={() =>
                setParams({ q, category, page: String(Number(page) - 1) })
              }
            >
              Previous page
            </Button>
            <p role="status">
              Page {page} · {result.data.pagination.total} charities
            </p>
            <Button
              disabled={!result.data.pagination.hasNextPage}
              onClick={() =>
                setParams({ q, category, page: String(Number(page) + 1) })
              }
            >
              Next page
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
