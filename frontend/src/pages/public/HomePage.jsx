import { Link } from 'react-router-dom';
import HeroSection from '../../components/home/HeroSection.jsx';
import HowItWorks from '../../components/home/HowItWorks.jsx';
import ScoreDemo from '../../components/home/ScoreDemo.jsx';
import FeaturedCharities from '../../components/home/FeaturedCharities.jsx';
import PrizePoolPreview from '../../components/home/PrizePoolPreview.jsx';
import { EXAMPLE_CHARITIES } from '../../components/home/homeData.js';
import { ROUTES } from '../../constants/routes.js';
export default function HomePage() {
  return (
    <div className="home-page">
      <HeroSection />
      <HowItWorks />
      <ScoreDemo />
      <PrizePoolPreview />
      <FeaturedCharities charities={EXAMPLE_CHARITIES} />
      <section className="home-invitation" aria-labelledby="invitation-title">
        <p className="eyebrow">PLAY WITH PURPOSE</p>
        <h2 id="invitation-title">
          Play the game.
          <br />
          Support a cause.
          <br />
          <span>Be part of something more.</span>
        </h2>
        <p>
          At least 10% of every subscription is intended for your chosen
          charity. Membership is not open yet — explore the journey before you
          join.
        </p>
        <Link className="button button--primary" to={ROUTES.register}>
          Explore membership <span aria-hidden="true">↗</span>
        </Link>
      </section>
      <div className="home-subscribe-dock">
        <span>
          Golf with purpose<small>Membership preview</small>
        </span>
        <Link className="button button--primary" to={ROUTES.register}>
          Subscribe & play
        </Link>
      </div>
    </div>
  );
}
