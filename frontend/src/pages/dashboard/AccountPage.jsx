import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Button from '../../components/common/Button.jsx';
export default function AccountPage() {
  const { user, signOut } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack-form">
      <p className="eyebrow">YOUR CLUB ACCOUNT</p>
      <h1>Welcome, {user.name}</h1>
      <p>{user.email}</p>
      <p>
        Your account is ready. Creating an account alone does not activate a
        subscription or grant draw eligibility.
      </p>
      <Link to="/dashboard/subscription">Manage subscription</Link>
      <Link to="/dashboard/charity">My charity</Link>
      {error && <p role="alert">{error}</p>}
      <Button onClick={logout} loading={busy}>
        Sign out
      </Button>
    </section>
  );
}
