import { Link } from 'react-router-dom';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import SectionTitle from '../../components/common/SectionTitle.jsx';
import { shellNavigation } from '../../constants/routes.js';
export default function ShellOverview({ mode = 'member' }) {
  const admin = mode === 'admin';
  const links = shellNavigation(mode);
  return (
    <div className="stack stack--large">
      <Card tone="forest" className="hero hero--compact">
        <div>
          <Badge>{admin ? 'Admin' : 'Member'} shell preview</Badge>
          <h1>
            {admin ? (
              <>
                A clear view.
                <br />A shared responsibility.
              </>
            ) : (
              <>
                Your clubhouse.
                <br />
                Your next chapter.
              </>
            )}
          </h1>
          <p>
            {admin
              ? 'A considered workspace for the people behind purposeful play.'
              : 'A little space for the game you love and the difference it can make.'}
          </p>
          <Link className="button button--light" to={links[1].to}>
            Explore shared components <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <span className="hero-flag" aria-hidden="true">
          ⚑
        </span>
      </Card>
      <section>
        <SectionTitle
          eyebrow="PLATFORM FOUNDATION"
          title={
            admin
              ? 'Operations will live here.'
              : 'Room for every part of your game.'
          }
          description="This is a layout preview. No account is signed in and no private records are loaded."
        />
        <Card>
          <EmptyState
            title={
              admin
                ? 'Admin tools are not connected'
                : 'Member features are not connected'
            }
            description={
              admin
                ? 'User management, charity tools and draw operations arrive in their planned branches. This page does not grant administrator access.'
                : 'Membership, scores and draws arrive in their planned branches. Your future records will appear only after secure sign-in is connected.'
            }
            action={
              <Link className="button button--secondary" to={links[2].to}>
                Check service status
              </Link>
            }
          />
        </Card>
      </section>
      <div className="two-grid">
        <Card tone="soft">
          <h2>One familiar system</h2>
          <p className="muted">
            Shared controls and feedback keep the experience consistent across
            every space.
          </p>
          <Link className="text-link" to={links[1].to}>
            Open UI library →
          </Link>
        </Card>
        <Card tone="soft">
          <h2>Designed for your screen</h2>
          <p className="muted">
            A quiet sidebar on desktop. A reachable navigation dock on smaller
            screens.
          </p>
          <Badge variant="info">Responsive foundation</Badge>
        </Card>
      </div>
    </div>
  );
}
