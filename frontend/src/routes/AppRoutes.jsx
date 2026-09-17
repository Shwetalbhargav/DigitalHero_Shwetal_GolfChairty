import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import FoundationHome from '../pages/foundation/FoundationHome.jsx';
import ComponentLibrary from '../pages/foundation/ComponentLibrary.jsx';
import ServiceStatus from '../pages/foundation/ServiceStatus.jsx';
import { AdminHome } from '../pages/admin/AdminCommon.jsx';
import {
  AdminUsersPage,
  AdminUserDetailPage,
} from '../pages/admin/AdminUsersPage.jsx';
import {
  AdminCharitiesPage,
  AdminCharityDetailPage,
} from '../pages/admin/AdminCharitiesPage.jsx';
import {
  AdminDrawsPage,
  AdminDrawDetailPage,
} from '../pages/admin/AdminDrawsPage.jsx';
import {
  AdminWinnersPage,
  AdminWinnerDetailPage,
} from '../pages/admin/AdminWinnersPage.jsx';
import AdminReportsPage from '../pages/admin/AdminReportsPage.jsx';
import NotFound from '../pages/foundation/NotFound.jsx';
import { ROUTES } from '../constants/routes.js';
import HomePage from '../pages/public/HomePage.jsx';
import DrawExplanationPage from '../pages/public/DrawExplanationPage.jsx';
import CharityListPage from '../pages/public/CharityListPage.jsx';
import CharityDetailPage from '../pages/public/CharityDetailPage.jsx';
import MyCharityPage from '../pages/dashboard/MyCharityPage.jsx';
import PaymentPage from '../pages/payments/PaymentPage.jsx';
import LoginPage from '../pages/public/LoginPage.jsx';
import RegisterPage from '../pages/public/RegisterPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import ProfilePage from '../pages/dashboard/ProfilePage.jsx';
import SubscriptionPage from '../pages/dashboard/SubscriptionPage.jsx';
import ScoresPage from '../pages/dashboard/ScoresPage.jsx';
import AddScorePage from '../pages/dashboard/AddScorePage.jsx';
import DrawsPage from '../pages/dashboard/DrawsPage.jsx';
import DrawDetailPage from '../pages/dashboard/DrawDetailPage.jsx';
import WinningsPage from '../pages/dashboard/WinningsPage.jsx';
import WinningDetailPage from '../pages/dashboard/WinningDetailPage.jsx';
import PricingPage from '../pages/public/PricingPage.jsx';
import AccountRecoveryPage, { DemoInboxPage } from '../pages/public/AccountRecoveryPage.jsx';
import { GivingHistoryPage, NotificationsPage } from '../pages/dashboard/MemberExperiencePages.jsx';
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
          <Route path="/pricing" element={<PricingPage />} />
          {['/forgot-password', '/reset-password', '/verify-email'].map((path) => <Route key={path} path={path} element={<AccountRecoveryPage key={path} />} />)}
          <Route path="/demo-inbox" element={<DemoInboxPage />} />
          <Route path={ROUTES.foundation} element={<FoundationHome />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path="/charities/:id" element={<CharityDetailPage />} />
          <Route path={ROUTES.charities} element={<CharityListPage />} />
          <Route path={ROUTES.howItWorks} element={<DrawExplanationPage />} />
          <Route path={ROUTES.library} element={<ComponentLibrary />} />
          <Route path={ROUTES.status} element={<ServiceStatus />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/payments/:id" element={<PaymentPage />} />
          <Route
            path={ROUTES.member}
            element={<DashboardLayout mode="member" />}
          >
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="giving" element={<GivingHistoryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="charity" element={<MyCharityPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="scores" element={<ScoresPage />} />
            <Route path="scores/new" element={<AddScorePage />} />
            <Route path="draws" element={<DrawsPage />} />
            <Route path="draws/:id" element={<DrawDetailPage />} />
            <Route path="winnings" element={<WinningsPage />} />
            <Route path="winnings/:id" element={<WinningDetailPage />} />
            <Route path="ui" element={<ComponentLibrary />} />
            <Route path="status" element={<ServiceStatus />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route element={<AdminRoute />}>
            {['admin'].map((mode) => (
              <Route
                key={mode}
                path={mode === 'admin' ? ROUTES.admin : ROUTES.member}
                element={<DashboardLayout mode={mode} />}
              >
                <Route index element={<AdminHome />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/:id" element={<AdminUserDetailPage />} />
                <Route path="charities" element={<AdminCharitiesPage />} />
                <Route
                  path="charities/new"
                  element={<AdminCharityDetailPage />}
                />
                <Route
                  path="charities/:id"
                  element={<AdminCharityDetailPage />}
                />
                <Route path="draws" element={<AdminDrawsPage />} />
                <Route path="draws/new" element={<AdminDrawDetailPage />} />
                <Route path="draws/:id" element={<AdminDrawDetailPage />} />
                <Route path="winners" element={<AdminWinnersPage />} />
                <Route path="winners/:id" element={<AdminWinnerDetailPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="ui" element={<ComponentLibrary />} />
                <Route path="status" element={<ServiceStatus />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            ))}
          </Route>
        </Route>
      </Routes>
    </>
  );
}
