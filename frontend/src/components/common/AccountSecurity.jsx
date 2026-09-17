import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import Input from './Input.jsx';
import Button from './Button.jsx';
const policy = (signal) => api('/auth/policy', { signal });
export default function AccountSecurity() {
  const [current, setCurrent] = useState(''), [password, setPassword] = useState(''), [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const config = useFetch(policy), navigate = useNavigate();
  async function save(e, kind) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/auth/' + kind, { method: 'POST', body: JSON.stringify({ currentPassword: current, ...(kind === 'password' ? { password } : { email }) }) });
      setMessage(result.message); setCurrent(''); setPassword('');
      if (kind === 'password') { window.dispatchEvent(new Event('digital-heroes:session-lost')); navigate('/login', { replace: true }); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="stack-form"><h2>Account security</h2><p>Confirm your current password to make a change. Changing your password or verifying a new email signs out existing sessions.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <Input label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
    <form className="admin-form" onSubmit={(e) => save(e, 'password')}><h3>Change password</h3><Input label="New password" type="password" autoComplete="new-password" value={password} minLength={12} required onChange={(e) => setPassword(e.target.value)} /><Button loading={busy} disabled={!current} type="submit">Change password</Button></form>
    <form className="admin-form" onSubmit={(e) => save(e, 'email')}><h3>Change email address</h3><Input label="New email address" type="email" autoComplete="email" value={email} required onChange={(e) => setEmail(e.target.value)} /><Button loading={busy} disabled={!current || !config.data?.emailAvailable} type="submit">Send verification email</Button>{config.data && !config.data.emailAvailable && <p>Email delivery is not configured yet.</p>}</form>
    {config.data?.demoInbox && <p>Local demo messages appear in the <Link to="/demo-inbox">test inbox</Link>.</p>}
  </section>;
}
