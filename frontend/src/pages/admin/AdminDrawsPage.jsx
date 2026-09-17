import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  NumberRow,
  PrizeTier,
  formatMoney,
} from '../../components/draws/DrawComponents.jsx';
import { useAdminAction } from '../../modules/admin/useAdminAction.js';
import { AdminLoad, ActionNotice, Paging } from './AdminCommon.jsx';
export function AdminDrawsPage() {
  const [page, setPage] = useState(1);
  const load = useCallback(
    (signal) => api('/admin/draws?page=' + page, { signal }),
    [page],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <h1>Draw operations</h1>
      <Link className="button button--primary" to="/admin/draws/new">
        Configure monthly draw
      </Link>
      <AdminLoad state={state}>
        {state.data && (
          <>
            <div className="draw-grid">
              {state.data.items.map((draw) => (
                <article className="card" key={draw.id}>
                  <h2>{draw.month}</h2>
                  <p>
                    {draw.status} · {draw.strategy}
                  </p>
                  <Link to={'/admin/draws/' + draw.id}>
                    Review {draw.month} draw
                  </Link>
                </article>
              ))}
            </div>
            {!state.data.items.length && <p>No draws configured.</p>}
            <Paging data={state.data} page={page} setPage={setPage} />
          </>
        )}
      </AdminLoad>
    </section>
  );
}
function DrawEditor({ draw, onSaved }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(
      draw?.month || new Date().toISOString().slice(0, 7),
    ),
    [strategy, setStrategy] = useState(draw?.strategy || 'random'),
    [scheduled, setScheduled] = useState(
      draw?.scheduledAt?.slice(0, 16) || new Date().toISOString().slice(0, 16),
    ),
    [cutoff, setCutoff] = useState(draw?.cutoffAt?.slice(0, 16) || ''),
    [confirm, setConfirm] = useState(false);
  const action = useAdminAction((data) => {
    setConfirm(false);
    if (!draw) navigate('/admin/draws/' + data.id);
    else onSaved();
  });
  const published = draw?.status === 'published';
  return (
    <>
      <p>
        {published
          ? 'Published result: immutable. No configuration or resimulation is allowed.'
          : 'Draft / preview: no winner, payout or rollover records exist until explicit publication.'}
      </p>
      {!published && (
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            action.run(
              '/draws' + (draw ? '/' + draw.id : ''),
              draw ? 'PATCH' : 'POST',
              {
                month,
                strategy,
                scheduledAt: scheduled + ':00Z',
                ...(cutoff ? { cutoffAt: cutoff + ':00Z' } : {}),
              },
            );
          }}
        >
          <Input
            label="Draw month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={!!draw}
            required
          />
          <label>
            Draw strategy
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="random">Uniform random</option>
              <option value="weighted">Score-frequency weighted</option>
            </select>
          </label>
          <Input
            label="Scheduled draw (UTC)"
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            required
          />
          <Input
            label="Fixed cutoff (UTC, optional)"
            type="datetime-local"
            value={cutoff}
            onChange={(e) => setCutoff(e.target.value)}
          />
          <p>
            A fixed cutoff must be configured in the future, no later than the
            draw. Eligibility history preserves the state at that instant. Leave
            blank to freeze eligibility when simulating. Weighted selection uses
            one baseline weight per number plus distinct entry frequency.
          </p>
          <Button type="submit" loading={action.busy}>
            Save draw configuration
          </Button>
        </form>
      )}
      <ActionNotice action={action} />
      {draw && !published && (
        <Button
          loading={action.busy}
          onClick={() => action.run(`/draws/${draw.id}/simulate`, 'POST', {})}
        >
          Simulate preview
        </Button>
      )}
      {draw?.numbers && (
        <>
          <h2>
            {published ? 'Published summary' : 'Versioned review preview'}
          </h2>
          <details><summary>Review reference</summary><p>{draw.previewVersion}</p></details>
          {draw.eligibility && <section className="card"><h3>Eligibility at the cutoff</h3><p>{draw.eligibility.considered} members considered · {draw.eligibility.eligible} eligible entries</p>{Object.entries(draw.eligibility.excluded).map(([reason, count]) => <p key={reason}>{reason}: {count}</p>)}{!Object.keys(draw.eligibility.excluded).length && <p>All considered members qualify.</p>}<p>Accounts created after the cutoff are not considered. Published entries keep the scores and membership state used for that draw.</p></section>}
          <p>
            Eligible entries: {draw.entryCount} · Cutoff{' '}
            {new Date(draw.cutoff).toLocaleString('en-GB', { timeZone: 'UTC' })}{' '}
            UTC
          </p>
          <NumberRow numbers={draw.numbers} />
          <div className="draw-grid">
            {draw.tiers.map((tier) => (
              <PrizeTier key={tier.tier} tier={tier} currency={draw.currency} />
            ))}
          </div>
          <p>
            New pool {formatMoney(draw.poolMinor, draw.currency)} · Incoming
            rollover {formatMoney(draw.incomingRolloverMinor, draw.currency)} ·
            Outgoing rollover {formatMoney(draw.rolloverMinor, draw.currency)} ·
            Unclaimed 3/4 tiers{' '}
            {formatMoney(draw.unclaimedMinor, draw.currency)}
          </p>
          <p>
            Results and finances are calculated by the server. Member identities
            are not exposed in this preview.
          </p>
          <details><summary>How prize amounts are calculated</summary><p>The month's subscription prize contributions fund this draw. Three matches receive 25%, four receive 35%, and five receive 40% plus any incoming jackpot. Each tier is split among its winners. Whole-penny remainders are distributed deterministically; no money is lost through rounding.</p><p>Unawarded three- and four-match funds remain separate. A jackpot with no five-match winner carries forward.</p></details>
          {!published && (
            <Button loading={action.busy} onClick={() => setConfirm(true)}>
              Publish reviewed preview
            </Button>
          )}
        </>
      )}
      <Modal
        open={confirm}
        title="Publish this reviewed draw?"
        onClose={() => {
          if (!action.busy) setConfirm(false);
        }}
      >
        <p>
          Publication commits these reviewed numbers, immutable member entries,
          winners and rollover. This cannot be undone here. A stale preview is
          rejected; run a new simulation if eligibility or configuration
          changed.
        </p>
        <ActionNotice action={action} />
        <div className="button-row">
          <Button
            variant="secondary"
            disabled={action.busy}
            onClick={() => setConfirm(false)}
          >
            Cancel publication
          </Button>
          <Button
            loading={action.busy}
            onClick={() =>
              action.run(
                `/draws/${draw.id}/publish`,
                'POST',
                { previewVersion: draw.previewVersion },
                'Reviewed draw published.',
              )
            }
          >
            Confirm publication
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function AdminDrawDetailPage() {
  const { id } = useParams();
  const load = useCallback(
    (signal) =>
      id ? api('/admin/draws/' + id, { signal }) : Promise.resolve({}),
    [id],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <Link to="/admin/draws">All draw operations</Link>
      <h1>{id ? 'Review monthly draw' : 'Configure monthly draw'}</h1>
      <AdminLoad state={state}>
        {state.data && (
          <DrawEditor
            key={
              (id || 'new') +
              '-' +
              (state.data.version || 0) +
              '-' +
              (state.data.previewVersion || '')
            }
            draw={id ? state.data : null}
            onSaved={state.retry}
          />
        )}
      </AdminLoad>
    </section>
  );
}
