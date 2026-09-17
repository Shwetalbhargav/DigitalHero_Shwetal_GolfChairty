import { Link } from 'react-router-dom';
import HeroSection from '../../components/home/HeroSection.jsx';
import HowItWorks from '../../components/home/HowItWorks.jsx';
import ScoreDemo from '../../components/home/ScoreDemo.jsx';
import FeaturedCharities from '../../components/home/FeaturedCharities.jsx';
import PrizePoolPreview from '../../components/home/PrizePoolPreview.jsx';
import useFetch from '../../hooks/useFetch.js';
import { getFeaturedCharities } from '../../modules/charities/charity.api.js';
import { ROUTES } from '../../constants/routes.js';
import { MembershipPlans } from './PricingPage.jsx';
export default function HomePage() {
  const featured = useFetch(getFeaturedCharities);
  return (
    <div className="home-page">
      <HeroSection />
      <HowItWorks />
      <section aria-labelledby="membership-title"><p className="eyebrow">CHOOSE YOUR MEMBERSHIP</p><h2 id="membership-title">Make every round count.</h2><MembershipPlans /></section>
      <ScoreDemo />
      <PrizePoolPreview />
      <FeaturedCharities
        charities={featured.data || []}
        status={featured.status}
        error={featured.error?.message}
        onRetry={featured.retry}
      />
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
          charity. Explore the membership journey in demo mode; no real money is
          charged or transferred.
        </p>
        <Link className="button button--primary" to={ROUTES.register}>
          Explore membership <span aria-hidden="true">↗</span>
        </Link>
      </section>
      <div className="home-subscribe-dock">
        <span>
          Golf with purpose<small>Demo membership</small>
        </span>
        <Link className="button button--primary" to={ROUTES.register}>
          Subscribe & play
        </Link>
      </div>
    </div>
  );
}
