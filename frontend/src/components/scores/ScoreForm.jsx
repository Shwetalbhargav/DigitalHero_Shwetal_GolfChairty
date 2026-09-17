import { useRef, useState } from 'react';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { createScore, updateScore } from '../../modules/scores/score.api.js';
export default function ScoreForm({ score, today, onSaved, onBusyChange, allowAnother = false }) {
  const [value, setValue] = useState(score ? String(score.value) : '');
  const [roundDate, setRoundDate] = useState(score?.roundDate || today);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const form = useRef(null);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const next = {};
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 45)
      next.value = 'Use a whole Stableford score from 1 to 45.';
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(roundDate) ||
      roundDate > today ||
      !Number.isFinite(Date.parse(roundDate + 'T00:00:00Z')) ||
      new Date(roundDate + 'T00:00:00Z').toISOString().slice(0, 10) !==
        roundDate
    )
      next.roundDate = 'Choose a real round date, no later than today (UTC).';
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        form.current?.querySelector('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusyChange?.(true);
    try {
      const body = { value: Number(value), roundDate };
      const result = score
        ? await updateScore(score.id, body)
        : await createScore(body);
      onSaved(result, event.nativeEvent.submitter?.value === 'another');
      setValue('');
    } catch (error) {
      const field =
        error.code === 'INVALID_SCORE'
          ? 'value'
          : [
                'DUPLICATE_ROUND_DATE',
                'INVALID_ROUND_DATE',
                'FUTURE_ROUND_DATE',
                'ROUND_TOO_OLD',
              ].includes(error.code)
            ? 'roundDate'
            : 'form';
      setErrors({ [field]: error.message });
      requestAnimationFrame(() =>
        form.current
          ?.querySelector('[aria-invalid="true"], [role="alert"]')
          ?.focus(),
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <form className="stack-form" onSubmit={submit} ref={form} noValidate>
      {errors.form && (
        <p role="alert" tabIndex={-1}>
          {errors.form}
        </p>
      )}
      <Input
        label="Stableford score"
        type="number"
        min={1}
        max={45}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={errors.value}
        hint="Whole numbers from 1 through 45."
        required
      />
      <Input
        label="Round date"
        type="date"
        value={roundDate}
        max={today}
        onChange={(e) => setRoundDate(e.target.value)}
        error={errors.roundDate}
        hint="One score per date. Dates are stored exactly as entered; today is determined in UTC."
        required
      />
      <Button type="submit" loading={busy}>
        {score ? 'Save score changes' : 'Save score'}
      </Button>
      {!score && allowAnother && <Button type="submit" name="action" value="another" variant="secondary" loading={busy}>Save and add another</Button>}
    </form>
  );
}
