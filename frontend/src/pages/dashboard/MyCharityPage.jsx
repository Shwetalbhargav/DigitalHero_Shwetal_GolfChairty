import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import CharitySelection from '../../modules/auth/CharitySelection.jsx';
import Button from '../../components/common/Button.jsx';
import { api } from '../../services/api.js';
export default function MyCharityPage() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const [fields, setFields] = useState({
    charityId: params.get('charity') || auth.user.charityId,
    contributionPercent: auth.user.contributionPercent,
  });
  const [maximum, setMaximum] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function save(event) {
    event.preventDefault();
    if (pending.current) return;
    if (
      !fields.charityId ||
      !Number.isInteger(fields.contributionPercent) ||
      fields.contributionPercent < 10 ||
      fields.contributionPercent > maximum
    ) {
      setError(
        `Choose a charity and a whole percentage from 10 to ${maximum}.`,
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/users/me/charity', {
        method: 'PATCH',
        body: JSON.stringify(fields),
      });
      await auth.refresh();
      setMessage(
        'Your charity preferences have been saved. Existing payment snapshots are unchanged.',
      );
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="stack-form" onSubmit={save}>
      <p className="eyebrow">YOUR CHARITABLE PLEDGE</p>
      <h1>My charity</h1>
      <p>
        Preferences apply to future transactions. Existing recipients and
        allocations remain recorded as they were.
      </p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <CharitySelection
        fields={fields}
        onChange={(key, value) => setFields({ ...fields, [key]: value })}
        onPolicy={setMaximum}
      />
      <Button type="submit" loading={busy} disabled={maximum === null}>
        Save charity preferences
      </Button>
    </form>
  );
}
