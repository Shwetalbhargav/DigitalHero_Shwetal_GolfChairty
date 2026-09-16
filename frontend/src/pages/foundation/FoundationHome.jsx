import { Link } from 'react-router-dom';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import SectionTitle from '../../components/common/SectionTitle.jsx';
import ServiceStatus from './ServiceStatus.jsx';
import { ROUTES } from '../../constants/routes.js';
export default function FoundationHome() {
  return (
    <div className="stack stack--large">
      <Card tone="forest" className="hero">
        <div>
          <Badge>Digital Heroes · Foundation</Badge>
          <h1>
            A shared purpose.
            <br />A considered foundation.
          </h1>
          <p>
            Clear interactions, thoughtful feedback and room for every player.
            The beginnings of a more purposeful clubhouse.
          </p>
          <Link className="button button--light" to={ROUTES.library}>
            Explore the UI library <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <span className="hero-flag" aria-hidden="true">
          ⚑
        </span>
      </Card>
      <section>
        <SectionTitle
          eyebrow="ONE SYSTEM, THREE SPACES"
          title="Built to feel connected."
          description="Explore the public, member and administrator layouts."
        />
        <div className="three-grid">
          {[
            {
              title: 'Open to everyone',
              copy: 'Shared navigation and accessible components set the tone.',
              to: ROUTES.library,
              label: 'Browse components',
              number: '01',
            },
            {
              title: 'The member clubhouse',
              copy: 'A responsive home for future scores, giving and draws.',
              to: ROUTES.member,
              label: 'Explore member shell',
              number: '02',
            },
            {
              title: 'Behind the scenes',
              copy: 'A clear workspace for future platform operations.',
              to: ROUTES.admin,
              label: 'Explore admin shell',
              number: '03',
            },
          ].map((item) => (
            <Card key={item.to} tone="soft">
              <span className="eyebrow">{item.number} / FOUNDATION</span>
              <h3>{item.title}</h3>
              <p className="muted">{item.copy}</p>
              <Link className="text-link" to={item.to}>
                {item.label} <span aria-hidden="true">→</span>
              </Link>
            </Card>
          ))}
        </div>
      </section>
      <ServiceStatus standalone={false} />
    </div>
  );
}
