import { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import { updateProfile } from '../../modules/users/user.api.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import SignOutButton from '../../modules/auth/SignOutButton.jsx';
import AccountSecurity from '../../components/common/AccountSecurity.jsx';
export default function ProfilePage() {
  const auth = useAuth();
  const [name, setName] = useState(auth.user.name);
  const [format, setFormat] = useState(
    auth.user.displayDateFormat || 'day-first',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const errorRef = useRef(null),
    nameRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function save(event) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    setMessage('');
    setNameError('');
    if (name.trim().length < 2 || name.trim().length > 120) {
      setNameError('Name must contain 2–120 characters.');
      nameRef.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await updateProfile({ name, displayDateFormat: format });
      await auth.refresh();
      setMessage('Profile and date-display preference saved.');
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="stack-form score-editor">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Profile & settings</h1>
      <p>Account settings remain available even when membership lapses.</p>
      <form onSubmit={save} className="stack-form" noValidate>
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" ref={errorRef} tabIndex={-1}>
            {error}
          </p>
        )}
        <Input
          ref={nameRef}
          label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={120}
          error={nameError}
          required
        />
        <Input
          label="Email address"
          type="email"
          value={auth.user.email}
          readOnly
          hint="Use Account security below to verify a new email address."
        />
        <fieldset className="charity-selection">
          <legend>Round date display</legend>
          <label>
            <input
              type="radio"
              name="date-format"
              checked={format === 'day-first'}
              onChange={() => setFormat('day-first')}
            />{' '}
            Day first (17/09/2026)
          </label>
          <label>
            <input
              type="radio"
              name="date-format"
              checked={format === 'iso'}
              onChange={() => setFormat('iso')}
            />{' '}
            ISO (2026-09-17)
          </label>
        </fieldset>
        <Button type="submit" loading={busy}>
          Save profile
        </Button>
      </form>
      <AccountSecurity />
      <SignOutButton />
    </section>
  );
}
