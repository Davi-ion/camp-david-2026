import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const { state } = useApp();
  const location = useLocation();

  const openIncidents = state.incidents.filter((i) => i.status !== 'resolved').length;

  const tabs = [
    { to: '/', icon: '🏠', label: 'Home' },
    { to: '/rollcall', icon: '📋', label: 'Roll Call' },
    { to: '/programme', icon: '📅', label: 'Programme' },
    { to: '/incidents', icon: '🚨', label: 'Incidents', badge: openIncidents },
    { to: '/campers', icon: '👥', label: 'Campers' },
  ];

  if (state.currentUser?.role === 'admin' || state.currentUser?.id === 1) {
    tabs.push({ to: '/admin', icon: '⚙️', label: 'Admin' });
  }

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive =
          tab.to === '/'
            ? location.pathname === '/'
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
