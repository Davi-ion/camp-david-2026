import { NavLink, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/console',          label: 'Dashboard',    icon: '📊', exact: true },
      { to: '/console/activity', label: 'Activity Feed', icon: '📡' },
    ],
  },
  {
    label: 'Camp Operations',
    items: [
      { to: '/console/campers',     label: 'Campers',     icon: '👥', badgeKey: 'totalCampers' },
      { to: '/console/platoons',    label: 'Platoons',    icon: '🏴' },
      { to: '/console/dorms',       label: 'Dorms',       icon: '🏢' },
      { to: '/console/attendance',  label: 'Attendance',  icon: '📋' },
      { to: '/console/incidents',   label: 'Incidents',   icon: '🚨', badgeKey: 'openIncidents' },
      { to: '/console/programme',   label: 'Programme',   icon: '📅' },
      { to: '/console/drills',      label: 'Camp Drills', icon: '🦺' },
      { to: '/console/announcements', label: 'Announcements', icon: '📢' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/console/staff',    label: 'Staff',              icon: '👤' },
      { to: '/console/users',    label: 'User Management',    icon: '👥' },
      { to: '/console/roles',    label: 'Roles & Permissions', icon: '🔑' },
      { to: '/console/import',   label: 'Bulk Import',        icon: '📤' },
      { to: '/console/reports',  label: 'Reports',            icon: '📈' },
      { to: '/console/audit',    label: 'Audit Logs',         icon: '📝' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/console/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

export default function ConsoleSidebar({ isOpen, onClose }) {
  const { state } = useApp();
  const location = useLocation();

  const openIncidents = state.incidents?.filter(i => i.status !== 'resolved').length || 0;
  const totalCampers  = state.campers?.length || 0;

  const getBadge = (key) => {
    if (key === 'openIncidents') return openIncidents > 0 ? openIncidents : null;
    if (key === 'totalCampers')  return totalCampers  > 0 ? totalCampers  : null;
    return null;
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <aside className={`console-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="console-brand">
        <div className="console-brand-logo">⛺</div>
        <div>
          <div className="console-brand-name">Camp David</div>
          <div className="console-brand-sub">Management Console</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="console-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="console-nav-section">
            <span className="console-nav-section-label">{section.label}</span>
            {section.items.map((item) => {
              const badge  = item.badgeKey ? getBadge(item.badgeKey) : null;
              const active = isActive(item);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`console-nav-item${active ? ' active' : ''}`}
                >
                  <span className="console-nav-icon">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge !== null && (
                    <span className={`console-nav-badge${badge > 0 ? ' urgent' : ''}`}>
                      {badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="console-sidebar-footer">
        <Link to="/app" className="console-portal-switch">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smartphone size={20} /></span>
          <div>
            <div className="console-portal-switch-text">Staff Portal</div>
            <div className="console-portal-switch-sub">Switch to mobile view</div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>→</span>
        </Link>
      </div>
    </aside>
  );
}
