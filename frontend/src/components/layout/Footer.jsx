import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.js';
export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Digital Heroes</strong>
        <p>Good rounds. Greater purpose.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link to={ROUTES.howItWorks}>How it works</Link>
        <Link to={ROUTES.charities}>Charities</Link>
        <Link to="/pricing">Membership</Link>
        <Link to={ROUTES.status}>Service status</Link>
      </nav>
      <p className="footer-note">
        Demo experience · Payments, prize funds and settlements are simulated.
      </p>
    </footer>
  );
}
