import { NavLink, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/console', label: 'Dashboard', icon: '⬛', exact: true },
      { to: '/console/activity', label: 'Activity Feed', icon: '📡', soon: true },
    ],
  },
  {
    label: 'Camp Operations',
    items: [
      { to: '/console/campers', label: 'Campers', icon: '👥', soon: true },
      { to: '/console/platoons', label: 'Platoons', icon: '🏴', soon: true },
      { to: '/console/attendance', label: 'Attendance', icon: '📋', soon: true },
      { to: '/console/incidents', label: 'Incidents', icon: '🚨', badgeKey: 'openIncidents' },
      { to: '/console/programme', label: 'Programme', icon: '📅', soon: true },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/console/staff', label: 'Staff', icon: '👤', soon: true },
      { to: '/console/users', label: 'User Management', icon: '⚙️' },
      { to: '/console/roles', label: 'Roles & Permissions', icon: '🔐' },
      { to: '/console/audit', label: 'Audit Logs', icon: '📜' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/console/settings', label: 'Settings', icon: '🔧', soon: true },
    ],
  },
];

export default function ConsoleSidebar() {
  const { state } = useApp();
  const location = useLocation();

  const openIncidents = state.incidents?.filter(i => i.status !== 'resolved').length || 0;

  const getBadge = (key) => {
    if (key === 'openIncidents') return openIncidents > 0 ? openIncidents : null;
    return null;
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <aside className="console-sidebar">
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
              const badge = item.badgeKey ? getBadge(item.badgeKey) : null;
              const active = isActive(item);

              return (
                <NavLink
                  key={item.to}
                  to={item.soon ? '#' : item.to}
                  onClick={item.soon ? (e) => e.preventDefault() : undefined}
                  className={`console-nav-item${active ? ' active' : ''}`}
                  style={item.soon ? { opacity: 0.4, cursor: 'default' } : {}}
                  title={item.soon ? `${item.label} — Coming Soon` : item.label}
                >
                  <span className="console-nav-icon">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.soon && (
                    <span style={{
                      fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '2px 6px', borderRadius: 4
                    }}>
                      Soon
                    </span>
                  )}
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

      {/* Sidebar Footer — Portal switcher */}
      <div className="console-sidebar-footer">
        <Link to="/app" className="console-portal-switch">
          <span style={{ fontSize: '1.25rem' }}>📱</span>
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
