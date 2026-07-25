import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const BREADCRUMB_LABELS = {
  '/console': 'Dashboard',
  '/console/users': 'User Management',
  '/console/roles': 'Roles & Permissions',
  '/console/audit': 'Audit Logs',
  '/console/incidents': 'Incidents',
  '/console/campers': 'Campers',
  '/console/platoons': 'Platoons',
  '/console/attendance': 'Attendance',
  '/console/programme': 'Programme',
  '/console/staff': 'Staff',
  '/console/settings': 'Settings',
  '/console/activity': 'Activity Feed',
};

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
}

export default function ConsoleTopNav() {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const user = state.currentUser;

  const [searchFocused, setSearchFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = state.notifications?.filter(n => !n.isRead).length || 0;
  const currentLabel = BREADCRUMB_LABELS[location.pathname] || 'Console';

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  return (
    <header className="console-topnav">
      {/* Breadcrumb */}
      <nav className="console-breadcrumb">
        <Link to="/console" className="console-breadcrumb-item">Console</Link>
        {location.pathname !== '/console' && (
          <>
            <span className="console-breadcrumb-sep">/</span>
            <span className="console-breadcrumb-item current">{currentLabel}</span>
          </>
        )}
      </nav>

      {/* Global Search */}
      <div className="console-search">
        <span className="console-search-icon">🔍</span>
        <input
          type="text"
          className="console-search-input"
          placeholder="Search campers, staff, sessions…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      {/* Actions */}
      <div className="console-topnav-actions">
        {/* Notification Bell */}
        <button className="console-notif-btn" title="Notifications">
          🔔
          {unreadCount > 0 && <span className="console-notif-badge" />}
        </button>

        {/* User Profile Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="console-user-chip"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div
              className="avatar avatar-sm"
              style={{ background: 'var(--teal)', color: '#fff', width: 28, height: 28, fontSize: '0.6875rem' }}
            >
              {getInitials(user?.name)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="console-user-chip-name">{user?.name?.split(' ')[0] || 'Admin'}</div>
              <div className="console-user-chip-role">{user?.roleName || user?.role}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: 4 }}>▾</span>
          </button>

          {dropdownOpen && (
            <div
              className="dropdown-menu"
              style={{ right: 0, top: 'calc(100% + 8px)', width: 220 }}
            >
              <div className="dropdown-header">
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.email}</p>
                <span className="badge badge-teal" style={{ marginTop: 6 }}>{user?.roleName || user?.role}</span>
              </div>

              <div className="dropdown-divider" />

              <Link to="/app/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                👤 My Profile
              </Link>
              <Link to="/app" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                📱 Staff Portal
              </Link>

              <div className="dropdown-divider" />

              <button
                onClick={handleLogout}
                className="dropdown-item"
                style={{ width: '100%', textAlign: 'left', color: 'var(--red)' }}
              >
                ↪ Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
