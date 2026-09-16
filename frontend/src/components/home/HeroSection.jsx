import { Link } from 'react-router-dom';
import Badge from '../common/Badge.jsx';
import { ROUTES } from '../../constants/routes.js';
import { HERO_IMAGE } from './homeData.js';
export default function HeroSection() {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero__copy">
        <Badge variant="success">Golf with a little more purpose</Badge>
        <p className="eyebrow home-kicker">FEEL, NOT FAIRWAY.</p>
        <h1 id="home-title">
          Your game
          <br />
          can do <em>more.</em>
        </h1>
        <p className="home-lead">
          The game you love. A cause you believe in. A membership designed to
          bring golf, monthly draws and charitable giving together.
        </p>
        <div className="home-actions">
          <Link className="button button--primary" to={ROUTES.register}>
            Subscribe & play <span aria-hidden="true">↗</span>
          </Link>
          <Link className="button button--secondary" to={ROUTES.howItWorks}>
            See how it works
          </Link>
        </div>
        <p className="home-release-note">
          Preview release · Membership and payments are not open yet.
        </p>
      </div>
      <figure className="home-hero__visual">
        <img
          src={HERO_IMAGE.src}
          alt={HERO_IMAGE.alt}
          width="237"
          height="512"
          fetchPriority="high"
        />
        <figcaption>
          <span className="home-photo-label">ILLUSTRATIVE COMMUNITY IMAGE</span>
          <strong>
            Good company.
            <br />
            Greater purpose.
          </strong>
        </figcaption>
      </figure>
      <ul className="home-trust-strip" aria-label="Planned membership features">
        <li>
          <span aria-hidden="true">♡</span>At least 10% to charity
        </li>
        <li>
          <span aria-hidden="true">◫</span>Your latest five scores
        </li>
        <li>
          <span aria-hidden="true">◎</span>Monthly prize draws
        </li>
        <li>
          <span aria-hidden="true">✓</span>Proof before payout
        </li>
      </ul>
    </section>
  );
}
