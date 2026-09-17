import { useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import Button from '../../components/common/Button.jsx';
export default function SignOutButton() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      <Button variant="secondary" loading={busy} onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
