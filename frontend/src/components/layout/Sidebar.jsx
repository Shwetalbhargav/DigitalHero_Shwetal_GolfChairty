import { NavLink } from 'react-router-dom';
import { shellNavigation } from '../../constants/routes.js';
export default function Sidebar({ mode = 'member' }) {
  return (
    <aside className="sidebar">
      <p className="eyebrow">
        {mode === 'admin' ? 'Administration' : 'Your clubhouse'}
      </p>
      <nav aria-label={mode + ' sidebar navigation'}>
        {shellNavigation(mode).map((item) => (
          <NavLink key={item.to} to={item.to} end>
            <span aria-hidden="true">{item.symbol}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="eyebrow">DEMO OPERATIONS</span>
        <p>
          {mode === 'admin'
            ? 'Sensitive changes are audited. Review each draw before publication; settlements are manual/demo records.'
            : 'Membership billing and prize funds are simulated. Published draw snapshots preserve your recorded entry.'}
        </p>
      </div>
      <p className="sidebar-signature">
        Play with purpose.
        <br />
        Build with care.
      </p>
    </aside>
  );
}
