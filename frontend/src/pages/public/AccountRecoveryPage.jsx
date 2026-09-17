import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import AuthCard from '../../modules/auth/AuthCard.jsx';
const policy = (signal) => api('/auth/policy', { signal });
const inbox = (signal) => api('/auth/demo-inbox', { signal });
export default function AccountRecoveryPage() {
  const location = useLocation();
  const reset = location.pathname === '/reset-password';
  const verify = location.pathname === '/verify-email';
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const config = useFetch(policy);
  async function submit(e) {
    e.preventDefault(); setError('');
    if (reset && password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const data = await api('/auth/' + (verify ? 'verify-email' : reset ? 'reset-password' : 'forgot-password'), { method: 'POST', body: JSON.stringify(verify ? { token } : reset ? { token, password } : { email }) });
      setMessage(data.message); setPassword(''); setConfirmation('');
      if (reset || verify) window.dispatchEvent(new Event('digital-heroes:session-lost'));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <AuthCard title={verify ? 'Verify your new email' : reset ? 'Choose a new password' : 'Recover your account'}>
    {message ? <p role="status">{message}</p> : <form className="stack-form" onSubmit={submit}>
      {error && <p role="alert">{error}</p>}
      {!reset && !verify && <><p>We will send a link that expires in 30 minutes.</p><Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></>}
      {reset && <><Input label="New password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} /><Input label="Confirm new password" type="password" autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></>}
      {verify && <p>Confirm that this is your new email address. You will then sign in again.</p>}
      <Button type="submit" loading={busy}>{verify ? 'Verify email address' : reset ? 'Reset password' : 'Send reset link'}</Button>
    </form>}
    <Link to="/login">Return to sign in</Link>
    {config.data?.demoInbox && <p>Isolated local demo: messages are delivered to the <Link to="/demo-inbox">test inbox</Link>, not real email.</p>}
  </AuthCard>;
}
export function DemoInboxPage() {
  const state = useFetch(inbox);
  return <section className="content-page stack-form"><h1>Local test inbox</h1><p>Only for the disposable demo on this computer. These links expire after 30 minutes. No email has been sent.</p><Button onClick={state.retry}>Refresh inbox</Button>{state.error && <p role="alert">{state.error.message}</p>}{state.data?.items.map((item) => <article className="card" key={item.link}><h2>{item.subject}</h2><p>To: {item.to}</p><Link to={new URL(item.link).pathname + new URL(item.link).hash}>Open verification link</Link></article>)}{state.data?.items.length === 0 && <p>No messages yet.</p>}</section>;
}
