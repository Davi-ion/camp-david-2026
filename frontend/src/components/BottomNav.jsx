import { NavLink, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';

export default function BottomNav() {
  const { state } = useApp();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  const openIncidents = state.incidents.filter((i) => i.status !== 'resolved').length;

  const tabs = [
    { to: '/app', icon: '🏠', label: 'Home', show: true },
    { to: '/app/rollcall', icon: '📋', label: 'Roll Call', show: hasPermission('take:attendance') },
    { to: '/app/programme', icon: '📅', label: 'Programme', show: hasPermission('view:schedule') },
    { to: '/app/incidents', icon: '🚨', label: 'Incidents', badge: openIncidents, show: hasPermission('view:incidents') },
    { to: '/app/campers', icon: '👥', label: 'Campers', show: hasPermission('view:campers') },
  ].filter(t => t.show);

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive =
          tab.to === '/app'
            ? location.pathname === '/app'
            : location.pathname.startsWith(tab.to);

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge > 0 && <span className="nav-badge">{tab.badge}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}
