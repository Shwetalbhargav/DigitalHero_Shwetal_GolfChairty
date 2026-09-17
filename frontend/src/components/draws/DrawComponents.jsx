import { Link } from 'react-router-dom';
import Card from '../common/Card.jsx';
export function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(
    amount / 100,
  );
}
export function DrawNumber({ value, matched = false }) {
  return (
    <span
      className={'draw-number' + (matched ? ' draw-number--match' : '')}
      aria-label={`${value}${matched ? ', matched' : ''}`}
    >
      <strong>{value}</strong>
      {matched && <small>✓ Match</small>}
    </span>
  );
}
export function NumberRow({ numbers, matches = [] }) {
  return (
    <div className="draw-numbers">
      {numbers.map((number, index) => (
        <DrawNumber
          key={index}
          value={number}
          matched={matches.includes(number)}
        />
      ))}
    </div>
  );
}
export function PrizeTier({ tier, currency }) {
  return (
    <Card>
      <h3>
        {tier.tier} matches · {tier.percentage}%
      </h3>
      <p className="prize-amount">{formatMoney(tier.amountMinor, currency)}</p>
      <p>
        {tier.winnerCount} winning{' '}
        {tier.winnerCount === 1 ? 'entry' : 'entries'}.{' '}
        {tier.winnerCount
          ? 'Shared equally; remainder pennies use stable member-ID order.'
          : tier.tier === 5
            ? 'Unclaimed jackpot rolls forward.'
            : 'Unclaimed amount is recorded separately; it does not roll forward.'}
      </p>
    </Card>
  );
}
export function DrawCard({ draw }) {
  return (
    <Card>
      <p className="eyebrow">Published · simulated funds</p>
      <h2>{draw.month} monthly draw</h2>
      <NumberRow numbers={draw.numbers} />
      <p>
        Pool: {formatMoney(draw.poolMinor, draw.currency)} · {draw.entryCount}{' '}
        entries
      </p>
      <Link to={'/dashboard/draws/' + draw.id}>View {draw.month} results</Link>
    </Card>
  );
}
export function ScoreComparison({ result, numbers }) {
  if (result.status !== 'eligible')
    return (
      <Card>
        <h2>
          {result.status === 'insufficient_scores'
            ? 'Five scores were required'
            : 'Not eligible for this draw'}
        </h2>
        <p>
          {result.status === 'insufficient_scores'
            ? 'Your account did not have five eligible rounds at the cutoff.'
            : 'This published cutoff did not include an active, unsuspended entry for your account.'}{' '}
          Later changes do not alter a published draw.
        </p>
      </Card>
    );
  return (
    <Card>
      <h2>Your frozen entry</h2>
      <p>
        Compared with the server snapshot at publication, never your current
        edited scores. Repeated values count once.
      </p>
      <NumberRow
        numbers={result.scores.map((score) => score.value)}
        matches={result.matches}
      />
      <h3>Draw numbers</h3>
      <NumberRow numbers={numbers} matches={result.matches} />
      <p>
        {result.matches.length} distinct matches ·{' '}
        {result.tier ? `${result.tier}-match tier` : 'No prize tier'}
      </p>
      {result.tier ? (
        <>
          <p>
            Prize awarded:{' '}
            <strong>{formatMoney(result.amountMinor, result.currency)}</strong>.
            Verification and payout are separate steps.
          </p>
          <Link to={'/dashboard/winnings/' + result.winnerId}>
            View winnings and submit proof
          </Link>
        </>
      ) : (
        <p>
          No prize was awarded to this entry. Thank you for supporting your
          charity.
        </p>
      )}
    </Card>
  );
}
