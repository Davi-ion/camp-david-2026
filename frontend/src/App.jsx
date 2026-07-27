import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { usePermissions } from './hooks/usePermissions';
import BottomNav from './components/BottomNav';
import TopBar from './components/TopBar';

// Staff Portal pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import RollCall from './pages/RollCall';
import Programme from './pages/Programme';
import Incidents from './pages/Incidents';
import Campers from './pages/Campers';
import Profile from './pages/Profile';

// Admin Console
import ConsoleLayout from './console/ConsoleLayout';
import ConsoleDashboard from './console/ConsoleDashboard';
import ConsoleIncidents from './console/ConsoleIncidents';
import ConsoleCampers from './console/ConsoleCampers';
import ConsolePlatoons from './console/ConsolePlatoons';
import ConsoleStaff from './console/ConsoleStaff';
import ConsoleProgramme from './console/ConsoleProgramme';
import ConsoleAttendance from './console/ConsoleAttendance';
import ConsoleAnnouncements from './console/ConsoleAnnouncements';
import ConsoleReports from './console/ConsoleReports';
import ConsoleSettings from './console/ConsoleSettings';
import ConsoleActivity from './console/ConsoleActivity';
import { ConsoleUserManagement, ConsoleRoleManagement, ConsoleAuditLog } from './console/ConsoleAdminPages';

// Permissions that qualify a user for the Admin Console
const CONSOLE_PERMISSIONS = ['manage:users', 'manage:roles', 'view:audit', 'all'];

// ─── Smart Root Redirect ──────────────────────────────────────────────────────
// Sends console-eligible users to /console, everyone else to /app
function SmartRedirect() {
  const { state } = useApp();
  if (!state.currentUser) return <Navigate to="/login" replace />;
  const perms = state.currentUser?.permissions || [];
  const goToConsole = CONSOLE_PERMISSIONS.some(p => perms.includes(p));
  return <Navigate to={goToConsole ? '/console' : '/app'} replace />;
}

// ─── Staff Portal Layout ──────────────────────────────────────────────────────
function StaffPortalLayout() {
  const { state } = useApp();
  if (!state.currentUser) return <Navigate to="/login" replace />;
  return (
    <>
      <div style={{ paddingBottom: 68 }}>
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}

// ─── Permission Gate (Staff Portal) ──────────────────────────────────────────
function PermissionRoute({ permission }) {
  const { hasPermission } = usePermissions();
  if (!hasPermission(permission)) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: 100 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h2>Access Denied</h2>
        <p style={{ color: '#666', marginTop: 8 }}>
          You do not have permission to view this page.
        </p>
      </div>
    );
  }
  return <Outlet />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Root redirect — smart based on permissions */}
        <Route path="/" element={<SmartRedirect />} />

        {/* ── Staff Portal (/app/*) ─────────────────────────────────── */}
        <Route path="/app" element={<StaffPortalLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />

          <Route element={<PermissionRoute permission="take:attendance" />}>
            <Route path="rollcall" element={<RollCall />} />
          </Route>

          <Route element={<PermissionRoute permission="view:schedule" />}>
            <Route path="programme" element={<Programme />} />
          </Route>

          <Route element={<PermissionRoute permission="view:incidents" />}>
            <Route path="incidents" element={<Incidents />} />
          </Route>

          <Route element={<PermissionRoute permission="view:campers" />}>
            <Route path="campers" element={<Campers />} />
          </Route>
        </Route>

        {/* ── Admin Console (/console/*) ───────────────────────────── */}
        <Route path="/console" element={<ConsoleLayout />}>
          <Route index element={<ConsoleDashboard />} />
          <Route path="incidents" element={<ConsoleIncidents />} />
          <Route path="users" element={<ConsoleUserManagement />} />
          <Route path="roles" element={<ConsoleRoleManagement />} />
          <Route path="audit" element={<ConsoleAuditLog />} />

          {/* Real modules replacing placeholders */}
          <Route path="campers" element={<ConsoleCampers />} />
          <Route path="platoons" element={<ConsolePlatoons />} />
          <Route path="attendance" element={<ConsoleAttendance />} />
          <Route path="staff" element={<ConsoleStaff />} />
          <Route path="programme" element={<ConsoleProgramme />} />
          <Route path="activity" element={<ConsoleActivity />} />
          <Route path="settings" element={<ConsoleSettings />} />
          <Route path="announcements" element={<ConsoleAnnouncements />} />
          <Route path="reports" element={<ConsoleReports />} />
        </Route>

        {/* Legacy /admin route — redirect console users to /console */}
        <Route path="/admin/*" element={<Navigate to="/console" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<SmartRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
