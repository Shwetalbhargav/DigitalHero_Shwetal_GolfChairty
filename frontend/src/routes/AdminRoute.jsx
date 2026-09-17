import { Link, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
export default function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'admin')
    return (
      <main id="main-content" tabIndex={-1} className="content-page">
        <h1>Administrator access required</h1>
        <p>Your account does not have access to these tools.</p>
        <Link to="/dashboard">Return to your account</Link>
      </main>
    );
  return <Outlet />;
}
