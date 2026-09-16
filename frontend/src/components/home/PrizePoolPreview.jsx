import { Link } from 'react-router-dom';
import Badge from '../common/Badge.jsx';
import { PRIZE_TIERS } from './homeData.js';
import { ROUTES } from '../../constants/routes.js';
const formatExample = (value) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
export default function PrizePoolPreview({ showLink = true }) {
  return (
    <section
      id="prize-example"
      className="home-prize"
      aria-labelledby="prize-title"
    >
      <div>
        <Badge variant="warning">Illustrative prize pool · GBP example</Badge>
        <p className="eyebrow">PARTICIPATION, WITH POSSIBILITY</p>
        <h2 id="prize-title">
          A little more
          <br />
          to play for.
        </h2>
        <p>Example total prize pool</p>
        <p className="prize-total">{formatExample(10000)}</p>
        <p className="home-prize__disclaimer">
          Not a live pool, guaranteed prize, or subscription price.
        </p>
        {showLink && (
          <Link
            className="button button--light"
            to={ROUTES.howItWorks + '#draw-rules'}
          >
            Understand the prize tiers <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <div>
        <ul className="prize-tiers">
          {PRIZE_TIERS.map((tier) => (
            <li key={tier.matches}>
              <span className="tier-number" aria-hidden="true">
                {tier.matches}
              </span>
              <div>
                <h3>{tier.label}</h3>
                <p>
                  {tier.matches} matches · {tier.share}% of the pool
                </p>
              </div>
              <strong>{formatExample(tier.amount)}</strong>
            </li>
          ))}
        </ul>
        <p className="small">
          Each tier is shared equally among its winners. Only the five-match
          jackpot can roll over; the three- and four-match allocations do not.
        </p>
        <p className="small">
          A winner's proof must be verified before payout. Charitable
          contributions are separate from this prize-pool example.
        </p>
      </div>
    </section>
  );
}
