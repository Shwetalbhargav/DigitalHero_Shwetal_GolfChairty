import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { donate } from '../../modules/payments/payment.api.js';
export default function DonationForm({ charityId }) {
  const [amount, setAmount] = useState('10.00');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(null);
  const pending = useRef(false);
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    if (
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      Number(amount) < 1 ||
      Number(amount) > 10000
    ) {
      setError('Enter an amount from 1 to 10,000 with at most two decimals.');
      return;
    }
    const body = { charityId, amountMinor: Math.round(Number(amount) * 100) };
    const signature = JSON.stringify(body);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const payment = await donate(body, request.current.key);
      if (payment.checkoutUrl) { window.location.assign(payment.checkoutUrl); return; }
      navigate('/payments/' + payment.id);
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack-form" noValidate>
      <h2>Donate independently</h2>
      <p>
        Simulated donation only. No money is charged. A donation does not
        activate membership, enter a draw or improve winning odds. The review
        shows the configured currency before approval.
      </p>
      <Input
        label="Donation amount"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={error}
        required
      />
      <Button type="submit" loading={busy}>
        Review simulated donation
      </Button>
    </form>
  );
}
