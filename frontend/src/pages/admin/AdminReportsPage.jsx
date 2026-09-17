import { useCallback, useState } from 'react';
import { api } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import { formatMoney } from '../../components/draws/DrawComponents.jsx';
import { AdminLoad } from './AdminCommon.jsx';
export default function AdminReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 7) + '-01'),
    [to, setTo] = useState(today),
    [range, setRange] = useState({
      from: today.slice(0, 7) + '-01',
      to: today,
    });
  const load = useCallback(
    (signal) =>
      api(
        `/admin/reports?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
        { signal },
      ),
    [range],
  );
  const state = useFetch(load);
  const data = state.data;
  function preset(months) {
    const end = new Date();
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months + 1, 1));
    const next = { from: start.toISOString().slice(0, 10), to: today }; setFrom(next.from); setTo(next.to); setRange(next);
  }
  function exportCsv() {
    const cell = (value) => '"' + String(value).replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const rows = [['From', 'To', 'Currency', 'Metric', 'Amount (minor units)']];
    for (const total of data.totals) for (const [metric, value] of Object.entries(total)) if (typeof value === 'number') rows.push([data.from, data.to, total.currency, metric, value]);
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `digital-heroes-report-${data.from}-${data.to}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="stack-form">
      <h1>Reports & reconciliation</h1>
      <p>
        Successful ledger allocations, awards and recorded settlements are
        different measures. All current money records are simulated.
      </p>
      <form
        className="button-row"
        onSubmit={(e) => {
          e.preventDefault();
          setRange({ from, to });
        }}
      >
        <Input
          label="Report from (UTC date)"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
        />
        <Input
          label="Report to (inclusive UTC date)"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
        <Button type="submit">Apply date range</Button>
      </form>
      <div className="button-row"><Button variant="secondary" onClick={() => preset(1)}>This month</Button><Button variant="secondary" onClick={() => preset(3)}>Last 3 months</Button><Button variant="secondary" onClick={() => preset(12)}>Last 12 months</Button><Button variant="secondary" onClick={exportCsv} disabled={!data}>Export CSV</Button></div>
      <AdminLoad state={state}>
        {data && (
          <>
            <div className="draw-grid">
              {[
                ['Current users', data.users],
                ['Users created in range', data.usersCreated],
                ['Active subscriptions now', data.activeSubscriptions],
                ['Draws published in range', data.publishedDraws],
                ['Entries in those draws', data.entries],
                ['Winning entries', data.winningEntries],
              ].map(([label, value]) => (
                <article className="card" key={label}>
                  <h2>{label}</h2>
                  <p className="prize-amount">{value}</p>
                </article>
              ))}
            </div>
            {data.totals.map((total) => (
              <section key={total.currency}>
                <h2>{total.currency} ledger totals</h2>
                {!!total.months?.length && <section className="card"><h3>Giving by month</h3><p>Membership charity allocations plus independent donations. Scheduled allocations may include future months in the selected range.</p>{total.months.map((m) => <div key={m.month} className="trend-row"><span>{m.month}</span><meter min="0" max={Math.max(1, ...total.months.map((x) => x.charityMinor + x.donationMinor))} value={m.charityMinor + m.donationMinor} aria-label={'Giving in ' + m.month} /><strong>{formatMoney(m.charityMinor + m.donationMinor, total.currency)}</strong></div>)}</section>}
                <div className="table-scroll">
                  <table>
                    <caption>
                      {data.from} through {data.to} · UTC dates
                    </caption>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [
                          'Subscription allocation revenue',
                          total.subscriptionRevenueMinor,
                        ],
                        [
                          'Subscription charity allocation',
                          total.subscriptionCharityMinor,
                        ],
                        [
                          'Prize allocation (not including rollover)',
                          total.prizeAllocationMinor,
                        ],
                        ['Platform allocation', total.platformAllocationMinor],
                        ['Independent donations', total.donationsMinor],
                        ['Awarded winnings', total.awardedMinor],
                        ['Paid settlements', total.paidMinor],
                        [
                          'Outstanding rollover (current balance)',
                          total.outstandingRolloverMinor,
                        ],
                        ['Unclaimed 3/4 tiers', total.unclaimedThreeFourMinor],
                      ].map(([label, amount]) => (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          <td>{formatMoney(amount, total.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3>Charity attribution from historical snapshots</h3>
                {total.charities.length ? (
                  <div className="table-scroll">
                    <table>
                      <caption>
                        Subscription contributions and independent donations
                      </caption>
                      <thead>
                        <tr>
                          <th>Recorded charity</th>
                          <th>Subscription contributions</th>
                          <th>Independent donations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {total.charities.map((charity) => (
                          <tr key={charity.id}>
                            <th scope="row">{charity.name}</th>
                            <td>
                              {formatMoney(
                                charity.subscriptionMinor,
                                total.currency,
                              )}
                            </td>
                            <td>
                              {formatMoney(
                                charity.donationMinor,
                                total.currency,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No charity allocations or donations in this range.</p>
                )}
              </section>
            ))}
            <section>
              <h2>Metric definitions</h2>
              <dl>
                {Object.entries(data.definitions).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>
                Snapshot taken{' '}
                {new Date(data.asOf).toLocaleString('en-GB', {
                  timeZone: 'UTC',
                })}{' '}
                UTC.
              </p>
            </section>
          </>
        )}
      </AdminLoad>
    </section>
  );
}
