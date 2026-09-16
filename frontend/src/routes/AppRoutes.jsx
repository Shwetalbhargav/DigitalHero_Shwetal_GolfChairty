import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import FoundationHome from '../pages/foundation/FoundationHome.jsx';
import ComponentLibrary from '../pages/foundation/ComponentLibrary.jsx';
import ServiceStatus from '../pages/foundation/ServiceStatus.jsx';
import ShellOverview from '../pages/foundation/ShellOverview.jsx';
import NotFound from '../pages/foundation/NotFound.jsx';
import { ROUTES } from '../constants/routes.js';
function RouteFocus() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    const title =
      document.querySelector('main h1')?.textContent || 'Digital Heroes';
    document.title = title + ' | Digital Heroes';
    if (previous.current === pathname) return;
    previous.current = pathname;
    // Wait until a closing navigation dialog has restored its own trigger first.
    const frame = requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}
export default function AppRoutes() {
  return (
    <>
      <RouteFocus />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<FoundationHome />} />
          <Route path={ROUTES.library} element={<ComponentLibrary />} />
          <Route path={ROUTES.status} element={<ServiceStatus />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {['member', 'admin'].map((mode) => (
          <Route
            key={mode}
            path={mode === 'admin' ? ROUTES.admin : ROUTES.member}
            element={<DashboardLayout mode={mode} />}
          >
            <Route index element={<ShellOverview mode={mode} />} />
            <Route path="ui" element={<ComponentLibrary />} />
            <Route path="status" element={<ServiceStatus />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        ))}
      </Routes>
    </>
  );
}
