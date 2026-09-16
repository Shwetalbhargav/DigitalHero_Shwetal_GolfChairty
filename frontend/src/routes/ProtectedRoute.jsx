import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
export default function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading')
    return (
      <main>
        <Loader label="Checking your session…" />
      </main>
    );
  if (auth.status === 'error')
    return (
      <main>
        <ErrorState
          title="Session unavailable"
          message={auth.error.message}
          onRetry={() => auth.refresh()}
        />
      </main>
    );
  if (!auth.user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  return <Outlet key={auth.user.id} />;
}
