import { Navigate, Outlet, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import ConsoleSidebar from './ConsoleSidebar';
import ConsoleTopNav from './ConsoleTopNav';
import './console.css';

// Roles that can access the management console
const CONSOLE_PERMISSIONS = ['manage:users', 'manage:roles', 'view:audit', 'all'];

function hasConsoleAccess(permissions = []) {
  return CONSOLE_PERMISSIONS.some(p => permissions.includes(p));
}

function AccessDenied() {
  return (
    <div className="console-denied">
      <div className="console-denied-card">
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          You do not have the required permissions to access the Management Console.
        </p>
        <Link
          to="/app"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', background: 'var(--teal)', color: '#fff',
            borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none'
          }}
        >
          ← Return to Staff Portal
        </Link>
      </div>
    </div>
  );
}

export default function ConsoleLayout() {
  const { state } = useApp();
  const { permissions } = usePermissions();

  // Must be authenticated
  if (!state.currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Must have console access
  if (!hasConsoleAccess(permissions)) {
    return <AccessDenied />;
  }

  return (
    <div className="console-root">
      <ConsoleSidebar />
      <div className="console-main">
        <ConsoleTopNav />
        <main className="console-content console-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
