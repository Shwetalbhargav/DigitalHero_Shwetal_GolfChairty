import Button from '../common/Button.jsx';
// Keep a date-only string as a string: local timezone conversion can shift the day.
export function displayRoundDate(value, format = 'day-first') {
  if (format === 'iso') return value;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
export default function ScoreCard({
  score,
  active,
  onEdit,
  onDelete,
  dateFormat,
}) {
  return (
    <article className="score-card">
      <p className="eyebrow">STABLEFORD ROUND</p>
      <h3>
        <time dateTime={score.roundDate}>
          {displayRoundDate(score.roundDate, dateFormat)}
        </time>
      </h3>
      <p className="score-value">
        {score.value}
        <small> points</small>
      </p>
      <div className="button-row">
        <Button
          variant="secondary"
          disabled={!active}
          onClick={() => onEdit(score)}
          aria-label={'Edit score from ' + score.roundDate}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          disabled={!active}
          onClick={() => onDelete(score)}
          aria-label={'Delete score from ' + score.roundDate}
        >
          Delete
        </Button>
      </div>
    </article>
  );
}
