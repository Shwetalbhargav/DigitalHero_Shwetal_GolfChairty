import { NavLink } from 'react-router-dom';
import { shellNavigation } from '../../constants/routes.js';
export default function MobileNav({ mode = 'member' }) {
  return (
    <nav className="mobile-dock" aria-label={mode + ' bottom navigation'}>
      {shellNavigation(mode)
        .filter((item) =>
          (mode === 'admin'
            ? ['Overview', 'Members', 'Draws', 'Winners', 'Reports']
            : ['Scores', 'Draws', 'Winnings', 'Overview']
          ).includes(item.label),
        )
        .map((item) => (
          <NavLink key={item.to} to={item.to} end>
            <span aria-hidden="true">{item.symbol}</span>
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}
