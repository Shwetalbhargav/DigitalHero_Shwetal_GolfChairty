import { useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import useAuth from '../../hooks/useAuth.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import { useAdminAction } from '../../modules/admin/useAdminAction.js';
import {
  AdminLoad,
  ActionNotice,
  Paging,
  AuditHistory,
} from './AdminCommon.jsx';
export function AdminUsersPage() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ role: '', status: '', subscription: params.get('subscription') || '' });
  const [page, setPage] = useState(1),
    [q, setQ] = useState(''),
    [draft, setDraft] = useState('');
  const load = useCallback(
    (signal) =>
      api(`/admin/users?q=${encodeURIComponent(q)}&page=${page}&${new URLSearchParams(filters)}`, { signal }),
    [q, page, filters],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <h1>Members & subscriptions</h1>
      <form
        className="button-row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(draft);
        }}
      >
        <Input
          label="Search members"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit">Search</Button>
      </form>
      <div className="button-row">{[['role', 'Role', ['member', 'admin']], ['status', 'Account status', ['active', 'suspended']], ['subscription', 'Membership status', ['active', 'lapsed', 'none']]].map(([key, label, values]) => <label key={key}>{label}<select value={filters[key]} onChange={(e) => { setPage(1); setFilters({ ...filters, [key]: e.target.value }); }}><option value="">All</option>{values.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>)}</div>
      <AdminLoad state={state}>
        {state.data && (
          <>
            <div className="table-scroll">
              <table>
                <caption>Member accounts</caption>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Membership</th><th>Period ends</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.items.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.suspended ? 'Suspended' : 'Usable'}</td>
                      <td>{user.subscription?.status || 'None'}{user.subscription && ' · ' + user.subscription.plan}</td><td>{user.subscription?.periodEnd ? new Date(user.subscription.periodEnd).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : '—'}</td>
                      <td>
                        <Link to={'/admin/users/' + user.id}>
                          Manage {user.name}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!state.data.items.length && <p>No matching accounts.</p>}
            <Paging data={state.data} page={page} setPage={setPage} />
          </>
        )}
      </AdminLoad>
    </section>
  );
}
function ScoreCorrection({ score, userId, onSaved }) {
  const [value, setValue] = useState(score.value),
    [date, setDate] = useState(score.roundDate),
    [reason, setReason] = useState('');
  const action = useAdminAction(onSaved);
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        action.run(
          `/users/${userId}/scores/${score.id}`,
          'PATCH',
          { value: Number(value), roundDate: date, reason },
          'Score corrected; published snapshots unchanged.',
        );
      }}
    >
      <h3>Round {score.roundDate}</h3>
      <Input
        label="Corrected Stableford score"
        type="number"
        min={1}
        max={45}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
      />
      <Input
        label="Corrected round date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <Input
        label="Score correction reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        minLength={3}
      />
      <ActionNotice action={action} />
      <Button loading={action.busy} type="submit">
        Save score correction
      </Button>
    </form>
  );
}
function UserEditor({ data, onSaved }) {
  const { user: actor } = useAuth();
  const user = data.user;
  const [name, setName] = useState(user.name),
    [role, setRole] = useState(user.role),
    [suspended, setSuspended] = useState(user.suspended),
    [reason, setReason] = useState('');
  const action = useAdminAction(onSaved);
  const sub = data.subscription;
  const [plan, setPlan] = useState(sub?.plan || 'monthly'),
    [start, setStart] = useState(
      sub?.periodStart?.slice(0, 16) || new Date().toISOString().slice(0, 16),
    ),
    [end, setEnd] = useState(sub?.periodEnd?.slice(0, 16) || ''),
    [cancel, setCancel] = useState(!!sub?.cancelAtPeriodEnd),
    [subReason, setSubReason] = useState('');
  const adjustment = useAdminAction(onSaved);
  return (
    <>
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          action.run(
            '/users/' + user.id,
            'PATCH',
            { name, role, suspended, reason },
            'Account updated.',
          );
        }}
      >
        <h2>Account profile & access</h2>
        <p>
          {user.email} · Current role: {user.role}
        </p>
        <Input
          label="Member display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
        <label>
          Account role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={suspended}
            disabled={actor.id === user.id}
            onChange={(e) => setSuspended(e.target.checked)}
          />{' '}
          Suspend account
        </label>
        <Input
          label="Account change reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={3}
        />
        <ActionNotice action={action} />
        <Button type="submit" loading={action.busy}>
          Save account changes
        </Button>
      </form>
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          adjustment.run(
            `/users/${user.id}/subscription`,
            'PATCH',
            {
              plan,
              periodStart: start + ':00Z',
              periodEnd: end + ':00Z',
              cancelAtPeriodEnd: cancel,
              reason: subReason,
            },
            'Manual/demo membership adjustment recorded. No payment or ledger revenue was created.',
          );
        }}
      >
        <h2>Manual/demo subscription adjustment</h2>
        <p>
          Current state: {sub?.status || 'none'}. This changes entitlement only.
          Historical payments, allocations and published entries remain
          unchanged.
        </p>
        <label>
          Plan
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <Input
          label="Period start (UTC)"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
        <Input
          label="Period end (UTC)"
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
        />
        <label>
          <input
            type="checkbox"
            checked={cancel}
            onChange={(e) => setCancel(e.target.checked)}
          />{' '}
          Cancel at period end
        </label>
        <Input
          label="Adjustment reason"
          value={subReason}
          onChange={(e) => setSubReason(e.target.value)}
          required
          minLength={3}
        />
        <ActionNotice action={adjustment} />
        <Button type="submit" loading={adjustment.busy}>
          Record manual/demo adjustment
        </Button>
      </form>
      <h2>Current scores</h2>
      <div className="draw-grid">
        {data.scores.map((score) => (
          <ScoreCorrection
            key={score.id + score.value + score.roundDate}
            score={score}
            userId={user.id}
            onSaved={onSaved}
          />
        ))}
      </div>
      {!data.scores.length && <p>No scores to correct.</p>}
      <AuditHistory events={data.audit} />
    </>
  );
}
export function AdminUserDetailPage() {
  const { id } = useParams();
  const load = useCallback(
    (signal) => api('/admin/users/' + id, { signal }),
    [id],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <Link to="/admin/users">All members</Link>
      <h1>Member administration</h1>
      <AdminLoad state={state}>
        {state.data && (
          <UserEditor key={id} data={state.data} onSaved={state.retry} />
        )}
      </AdminLoad>
    </section>
  );
}
