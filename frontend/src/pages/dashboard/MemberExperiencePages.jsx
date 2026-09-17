import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { formatMoney } from '../../components/draws/DrawComponents.jsx';
import Button from '../../components/common/Button.jsx';
import { useState } from 'react';
const giving = (signal) => api('/experience/giving', { signal });
const notifications = (signal) => api('/experience/notifications', { signal });
export function GivingHistoryPage() {
  const state = useFetch(giving);
  return <section className="stack-form"><p className="eyebrow">YOUR CONTRIBUTION</p><h1>Giving history</h1><p>See where your membership contributions and independent donations are recorded. Demo allocations are not transfers or tax receipts.</p>{state.error && <p role="alert">{state.error.message}</p>}{state.status === 'loading' && <p role="status">Loading giving history…</p>}
    <div className="draw-grid">{state.data?.totals.map((t) => <article className="card" key={t.currency}><h2>{formatMoney(t.recordedMinor, t.currency)}</h2><p>Recorded contributions</p><p>{formatMoney(t.scheduledMinor, t.currency)} scheduled for future months</p></article>)}</div>
    {state.data?.items.length === 0 && <p>No contributions yet. <Link to="/dashboard/subscription">Explore membership</Link> or <Link to="/charities">find a cause</Link>.</p>}
    {!!state.data?.items.length && <div className="table-scroll"><table><caption>Your recorded and scheduled giving</caption><thead><tr><th>Date</th><th>Charity</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{state.data.items.map((i) => <tr key={i.id}><td>{String(i.date).slice(0, 10)}</td><td>{i.charity}</td><td>{i.kind}</td><td>{formatMoney(i.amountMinor, i.currency)}</td><td>{i.scheduled ? 'Scheduled' : 'Recorded'}</td></tr>)}</tbody></table></div>}
  </section>;
}
export function NotificationsPage() {
  const state = useFetch(notifications), [error, setError] = useState('');
  async function mark(id) { try { await api('/experience/notifications/read', { method: 'POST', body: JSON.stringify({ id }) }); state.retry(); } catch (e) { setError(e.message); } }
  return <section className="stack-form"><p className="eyebrow">STAY UP TO DATE</p><h1>Notifications</h1><p>Draw results, claim updates and membership reminders appear here.</p>{(error || state.error) && <p role="alert">{error || state.error.message}</p>}{state.status === 'loading' && <p role="status">Loading notifications…</p>}{state.data?.items.length === 0 && <p>You are all caught up. Updates will appear here.</p>}{state.data?.items.map((i) => <article className="card" key={i.id}><p className="eyebrow">{i.read ? 'Read' : 'New'} · {String(i.at).slice(0, 10)}</p><h2>{i.title}</h2><p>{i.message}</p><div className="button-row"><Link to={i.href}>View details</Link>{!i.read && <Button variant="ghost" onClick={() => mark(i.id)}>Mark as read</Button>}</div></article>)}</section>;
}
