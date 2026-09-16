import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ROUTES, publicNavigation } from '../../constants/routes.js';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
export default function Header({ mode = 'public' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
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
            {publicNavigation.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Badge variant="info">
              {mode === 'public'
                ? 'UI foundation'
                : mode === 'admin'
                  ? 'Admin preview'
                  : 'Member preview'}
            </Badge>
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
          {publicNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="muted">
          Shell previews contain no member or administrator data.
        </p>
      </Modal>
    </>
  );
}
