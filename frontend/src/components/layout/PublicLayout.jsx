import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
export default function PublicLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main id="main-content" tabIndex={-1} className="public-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
