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
import HomePage from '../pages/public/HomePage.jsx';
import DrawExplanationPage from '../pages/public/DrawExplanationPage.jsx';
import AvailabilityPage from '../pages/public/AvailabilityPage.jsx';
function RouteFocus() {
  const { pathname, hash } = useLocation();
  const previous = useRef(null);
  useEffect(() => {
    const title =
      document.querySelector('main h1')?.textContent || 'Digital Heroes';
    document.title = title + ' | Digital Heroes';
    const key = pathname + hash;
    const initial = previous.current === null;
    if (previous.current === key) return;
    previous.current = key;
    if (initial && !hash) return;
    // Wait until a closing navigation dialog has restored its own trigger first.
    const frame = requestAnimationFrame(() => {
      let target;
      try {
        target = hash
          ? document.getElementById(decodeURIComponent(hash.slice(1)))
          : null;
      } catch {
        /* Malformed URL fragments fall back to the main landmark. */
      }
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'instant' });
      } else {
        document.getElementById('main-content')?.focus();
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}
export default function AppRoutes() {
  return (
    <>
      <RouteFocus />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.foundation} element={<FoundationHome />} />
          <Route
            path={ROUTES.register}
            element={<AvailabilityPage kind="registration" />}
          />
          <Route
            path={ROUTES.charities}
            element={<AvailabilityPage kind="charities" />}
          />
          <Route path={ROUTES.howItWorks} element={<DrawExplanationPage />} />
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
