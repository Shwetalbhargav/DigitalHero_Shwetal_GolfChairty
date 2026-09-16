import { Link } from 'react-router-dom';
import SectionTitle from '../../components/common/SectionTitle.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import { EXAMPLE_CHARITIES } from '../../components/home/homeData.js';
import { ROUTES } from '../../constants/routes.js';
export default function AvailabilityPage({ kind }) {
  const registration = kind === 'registration';
  return (
    <div className="stack stack--large">
      <SectionTitle
        as="h1"
        eyebrow={registration ? 'MEMBERSHIP PREVIEW' : 'GIVING WITH PURPOSE'}
        title={
          registration
            ? 'Your next chapter starts here.'
            : 'A cause worth playing for.'
        }
        description={
          registration
            ? 'Discover the membership journey before registration opens.'
            : 'Explore the kinds of causes shown on our homepage.'
        }
      />
      <Card tone="soft">
        <Badge variant="info">Not available yet</Badge>
        <h2 className="availability-title">
          {registration
            ? 'Registration is not open yet'
            : 'The live charity directory is not connected yet'}
        </h2>
        <p>
          {registration
            ? 'You cannot create an account, subscribe or make a payment in this release. Plan prices and a registration form will be available when membership opens.'
            : 'The causes below are illustrative categories, not verified partners. No donation is collected here. The charity directory and individual partner pages arrive in a later release.'}
        </p>
        <div className="home-actions">
          <Link className="button button--primary" to={ROUTES.howItWorks}>
            Understand how it works
          </Link>
          <Link className="button button--secondary" to={ROUTES.home}>
            Back to home
          </Link>
        </div>
      </Card>
      {!registration && (
        <div className="stack">
          {EXAMPLE_CHARITIES.map((charity) => (
            <Card key={charity.id} as="section" id={charity.id} tabIndex={-1}>
              <Badge>Illustrative cause</Badge>
              <h2 className="availability-title">{charity.category}</h2>
              <p>{charity.description}</p>
              <p className="small muted">
                This is an example of a cause area, not a registered Digital
                Heroes charity.
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
