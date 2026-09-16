import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';
import SectionTitle from '../common/SectionTitle.jsx';
import Loader from '../common/Loader.jsx';
import ErrorState from '../common/ErrorState.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { ROUTES } from '../../constants/routes.js';
/** CharityCard: {id, name, category, description, image:{src,alt}, href, isExample:boolean}.
 * No totals or inferred verification status. Live adapters must explicitly set isExample=false.
 */
export function validateCharityCards(charities) {
  if (!Array.isArray(charities)) return false;
  const ids = new Set();
  return charities.every((charity) => {
    const text = (value) =>
      typeof value === 'string' && value.trim().length > 0;
    if (
      !charity ||
      ![
        charity.id,
        charity.name,
        charity.category,
        charity.description,
        charity.image?.src,
        charity.image?.alt,
        charity.href,
      ].every(text) ||
      typeof charity.isExample !== 'boolean'
    )
      return false;
    if (ids.has(charity.id)) return false;
    ids.add(charity.id);
    // Keep card navigation within the app; reject protocol-relative and script URLs.
    return (
      /^\/charities(?:[/?#]|$)/.test(charity.href) &&
      !charity.href.includes('\\') &&
      /^(\/(?!\/)|https?:\/\/)/.test(charity.image.src)
    );
  });
}
export function CharityCard({ charity }) {
  const [failedSource, setFailedSource] = useState(null);
  return (
    <Card as="article" className="home-charity-card">
      <div className="charity-image">
        {failedSource === charity.image.src ? (
          <div
            className="charity-image__fallback"
            role="img"
            aria-label={charity.image.alt + ' Image unavailable.'}
          >
            Image unavailable
          </div>
        ) : (
          <img
            src={charity.image.src}
            alt={charity.image.alt}
            width="512"
            height="320"
            loading="lazy"
            onError={() => setFailedSource(charity.image.src)}
          />
        )}
        <Badge>
          {charity.isExample ? 'Illustrative cause' : charity.category}
        </Badge>
      </div>
      <div className="home-charity-card__body">
        <p className="eyebrow">{charity.category}</p>
        <h3>{charity.name}</h3>
        <p>{charity.description}</p>
        <Link className="text-link" to={charity.href}>
          Explore {charity.category.toLowerCase()}{' '}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </Card>
  );
}
export default function FeaturedCharities({
  charities = [],
  status = 'ready',
  error,
  onRetry,
}) {
  let content;
  if (status === 'loading')
    content = <Loader label="Loading featured charities…" variant="skeleton" />;
  else if (status === 'error')
    content = (
      <ErrorState
        title="Charities could not be loaded"
        message={error || 'Please try again later.'}
        onRetry={onRetry}
      />
    );
  else if (!validateCharityCards(charities))
    content = (
      <ErrorState
        title="Charity information is unavailable"
        message="Some charity details could not be displayed safely."
        onRetry={onRetry}
      />
    );
  else if (charities.length === 0)
    content = (
      <EmptyState
        title="No featured charities yet"
        description="Charity information will appear here when it is available."
      />
    );
  else
    content = (
      <div className="three-grid">
        {charities.map((charity) => (
          <CharityCard key={charity.id} charity={charity} />
        ))}
      </div>
    );
  return (
    <section
      id="featured-charities"
      className="home-section"
      aria-labelledby="charities-title"
    >
      <SectionTitle
        id="charities-title"
        eyebrow="GOOD BEYOND THE GREEN"
        title="Find a cause close to you."
        description="A little support can open up a world of possibility."
        action={
          <Link className="text-link" to={ROUTES.charities}>
            Explore charities <span aria-hidden="true">↗</span>
          </Link>
        }
      />
      {Array.isArray(charities) &&
        charities.some((charity) => charity?.isExample) && (
          <p className="home-example-note">
            Illustrative causes, not registered partners. No donations or impact
            totals are represented here.
          </p>
        )}
      {content}
    </section>
  );
}
