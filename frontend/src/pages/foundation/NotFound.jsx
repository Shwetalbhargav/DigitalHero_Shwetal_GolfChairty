import { Link } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState.jsx';
import SectionTitle from '../../components/common/SectionTitle.jsx';
import { ROUTES } from '../../constants/routes.js';
export default function NotFound() {
  return (
    <>
      <SectionTitle
        as="h1"
        eyebrow="404 · OUT OF BOUNDS"
        title="A little off the fairway."
      />
      <EmptyState
        title="This page does not exist"
        description="Return to the foundation or use the navigation to explore an available space."
        action={
          <Link className="button button--primary" to={ROUTES.home}>
            Return to foundation
          </Link>
        }
      />
    </>
  );
}
