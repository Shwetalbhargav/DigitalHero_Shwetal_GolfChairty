import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import useAuth from '../../hooks/useAuth.js';
import CharitySelection from './CharitySelection.jsx';
export function safeReturnTo(value) {
  return typeof value === 'string' &&
    /^\/(?!\/)/.test(value) &&
    !value.includes('\\')
    ? value
    : '/dashboard';
}
export default function AuthForm({ registration = false }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fields, setFields] = useState({
    name: '',
    email: '',
    password: '',
    charityId: '',
    contributionPercent: 10,
  });
  const [maximum, setMaximum] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [visible, setVisible] = useState(false);
  const change = (key, value) =>
    setFields((previous) => ({ ...previous, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const next = {};
    if (registration && fields.name.trim().length < 2)
      next.name = 'Enter at least two characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
      next.email = 'Enter a valid email address.';
    if (
      fields.password.length < (registration ? 12 : 1) ||
      new TextEncoder().encode(fields.password).length > 72
    )
      next.password = registration
        ? 'Use at least 12 characters and no more than 72 bytes.'
        : 'Enter your password (maximum 72 bytes).';
    if (registration && !fields.charityId)
      next.charityId = 'Choose an active charity.';
    if (
      registration &&
      (!Number.isInteger(fields.contributionPercent) ||
        fields.contributionPercent < 10 ||
        maximum === null ||
        fields.contributionPercent > maximum)
    )
      next.contributionPercent = `Choose a whole percentage from 10 to ${maximum ?? 'the published maximum'}.`;
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await auth.authenticate(
        registration ? 'register' : 'login',
        registration
          ? fields
          : { email: fields.email, password: fields.password },
      );
      navigate(
        registration ? '/dashboard' : safeReturnTo(location.state?.returnTo),
        { replace: true },
      );
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="stack-form" onSubmit={submit} noValidate>
      <p>
        {registration
          ? 'Create your account and choose your charitable pledge. Subscription activation is a separate step.'
          : 'Sign in to manage your charity and membership.'}
      </p>
      {errors.form && (
        <p role="alert" className="field__error">
          {errors.form}
        </p>
      )}
      {registration && (
        <Input
          label="Full name"
          value={fields.name}
          onChange={(e) => change('name', e.target.value)}
          autoComplete="name"
          maxLength={120}
          error={errors.name}
          required
        />
      )}
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        value={fields.email}
        onChange={(e) => change('email', e.target.value)}
        error={errors.email}
        required
      />
      <Input
        label="Password"
        type={visible ? 'text' : 'password'}
        autoComplete={registration ? 'new-password' : 'current-password'}
        value={fields.password}
        onChange={(e) => change('password', e.target.value)}
        error={errors.password}
        hint={
          registration ? 'At least 12 characters; at most 72 bytes.' : undefined
        }
        required
      />
      <Button
        variant="ghost"
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Hide password' : 'Show password'}
      </Button>
      {registration && (
        <CharitySelection
          fields={fields}
          onChange={change}
          errors={errors}
          onPolicy={setMaximum}
        />
      )}
      <Button
        type="submit"
        loading={busy}
        disabled={registration && maximum === null}
      >
        {registration ? 'Create account' : 'Sign in'}
      </Button>
      <p>
        {registration ? 'Already a member? ' : 'New to Digital Heroes? '}
        <Link to={registration ? '/login' : '/register'}>
          {registration ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
