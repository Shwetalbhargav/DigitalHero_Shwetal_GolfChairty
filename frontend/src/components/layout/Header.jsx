import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ROUTES,
  publicNavigation,
  marketingNavigation,
} from '../../constants/routes.js';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
export default function Header({ mode = 'public' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const marketing = [
    ROUTES.home,
    ROUTES.register,
    ROUTES.charities,
    ROUTES.howItWorks,
  ].includes(location.pathname);
  const navigation = marketing ? marketingNavigation : publicNavigation;
  const [openedAt, setOpenedAt] = useState('');
  const visible = menuOpen && openedAt === location.key;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="purpose-strip">
        <span>Feel, not fairway.</span>
        <span>Golf. Community. Giving.</span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link
            className="brand"
            to={ROUTES.home}
            aria-label="Digital Heroes home"
          >
            <span className="brand-mark" aria-hidden="true">
              ⚑
            </span>
            <span>
              Digital Heroes<small>Purpose in every round</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            {marketing ? (
              <Link
                to={ROUTES.register}
                className="button button--primary header-subscribe"
              >
                Subscribe & play
              </Link>
            ) : (
              <Badge variant="info">
                {mode === 'public'
                  ? 'UI foundation'
                  : mode === 'admin'
                    ? 'Admin preview'
                    : 'Member preview'}
              </Badge>
            )}
            <Button
              className="menu-toggle"
              variant="secondary"
              aria-label="Open navigation"
              aria-expanded={visible}
              aria-haspopup="dialog"
              onClick={() => {
                setOpenedAt(location.key);
                setMenuOpen(true);
              }}
            >
              Menu
            </Button>
          </div>
        </div>
      </header>
      <Modal
        open={visible}
        onClose={() => setMenuOpen(false)}
        title="Navigation"
        className="navigation-dialog"
      >
        <nav aria-label="Mobile primary navigation" className="menu-links">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          {marketing && (
            <Link to={ROUTES.register} onClick={() => setMenuOpen(false)}>
              Subscribe & play
            </Link>
          )}
        </nav>
        <p className="muted">
          {marketing
            ? 'Preview release. Membership and donations are not open yet.'
            : 'Shell previews contain no member or administrator data.'}
        </p>
      </Modal>
    </>
  );
}
