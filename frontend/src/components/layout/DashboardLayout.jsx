import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import Sidebar from './Sidebar.jsx';
import MobileNav from './MobileNav.jsx';
export default function DashboardLayout({ mode = 'member' }) {
  return (
    <div className="app-shell app-shell--dashboard">
      <Header mode={mode} />
      <div className="dashboard-grid">
        <Sidebar mode={mode} />
        <main id="main-content" tabIndex={-1} className="dashboard-main">
          <Outlet />
        </main>
      </div>
      <Footer />
      <MobileNav mode={mode} />
    </div>
  );
}
