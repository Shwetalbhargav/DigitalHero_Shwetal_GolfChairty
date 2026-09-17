import { useCallback, useEffect, useState } from 'react';
import useFetch from '../../hooks/useFetch.js';
import { getCharities } from '../charities/charity.api.js';
import { getPolicy } from './auth.api.js';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
export default function CharitySelection({
  fields,
  onChange,
  errors = {},
  onPolicy,
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const load = useCallback(
    async (signal) => {
      const [directory, policy] = await Promise.all([
        getCharities({ q, page, limit: 12 }, signal),
        getPolicy(signal),
      ]);
      return { directory, policy };
    },
    [q, page],
  );
  const result = useFetch(load);
  useEffect(() => {
    onPolicy?.(result.data?.policy.maxContributionPercent ?? null);
  }, [result.data, onPolicy]);
  return (
    <fieldset className="charity-selection">
      <legend>Choose your charity & pledge</legend>
      <Input
        label="Search charities"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        maxLength={100}
      />
      {result.status === 'loading' && (
        <Loader label="Loading charity choices…" />
      )}
      {result.status === 'error' && (
        <ErrorState message={result.error.message} onRetry={result.retry} />
      )}
      {result.data && (
        <>
          {result.data.directory.items.length === 0 && (
            <p role="status">No charities match your search.</p>
          )}
          <div className="choice-grid">
            {result.data.directory.items.map((charity) => (
              <label key={charity.id} className="charity-choice">
                <input
                  type="radio"
                  name="charityId"
                  checked={fields.charityId === charity.id}
                  onChange={() => onChange('charityId', charity.id)}
                  aria-invalid={!!errors.charityId}
                  aria-describedby={
                    errors.charityId ? 'charity-choice-error' : undefined
                  }
                />
                <span>
                  <strong>{charity.name}</strong>
                  <small>
                    {charity.category}
                    {charity.isDemo ? ' · Demo charity' : ''}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <div className="button-row">
            <Button
              disabled={!result.data.directory.pagination.hasPreviousPage}
              onClick={() => setPage(page - 1)}
            >
              Previous choices
            </Button>
            <span>Page {page}</span>
            <Button
              disabled={!result.data.directory.pagination.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              More choices
            </Button>
          </div>
        </>
      )}
      {errors.charityId && (
        <p id="charity-choice-error" className="field__error">
          {errors.charityId}
        </p>
      )}
      <Input
        label="Charity contribution (%)"
        type="number"
        min={10}
        max={result.data?.policy.maxContributionPercent}
        step={1}
        value={fields.contributionPercent}
        onChange={(e) =>
          onChange('contributionPercent', Number(e.target.value))
        }
        error={errors.contributionPercent}
        hint={`Minimum 10%. Maximum ${result.data?.policy.maxContributionPercent ?? 'loading'}% leaves funding for the prize allocation.`}
        required
      />
    </fieldset>
  );
}
