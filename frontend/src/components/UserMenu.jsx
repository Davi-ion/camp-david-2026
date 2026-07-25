import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
}

export default function UserMenu({ lightMode = false }) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const user = state.currentUser;
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = state.notifications?.filter(n => !n.isRead).length || 0;
  const isConsoleUser = (user?.permissions || []).some(p =>
    ['manage:users', 'manage:roles', 'view:audit', 'all'].includes(p)
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Notification Bell */}
      <Link
        to="/app/notifications"
        className="btn-icon"
        style={{
          position: 'relative',
          color: lightMode ? '#fff' : '#111',
          background: lightMode ? 'rgba(255,255,255,0.15)' : 'transparent',
          width: 36, height: 36
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span className="nav-badge" style={{ top: -2, right: -2 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Profile Dropdown */}
      <div className="profile-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
        >
          <div
            className="avatar avatar-sm"
            style={{
              background: lightMode ? 'rgba(255,255,255,0.2)' : 'var(--teal)',
              color: '#fff',
              transition: 'transform 0.2s ease',
              transform: dropdownOpen ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            {getInitials(user.name)}
          </div>
        </button>

        {dropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-header">
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{user.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</p>
              <span className="badge badge-teal" style={{ marginTop: 8 }}>{user.roleName || user.role}</span>
            </div>

            <div className="dropdown-divider" />

            <Link to="/app/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
              👤 My Profile
            </Link>

            {isConsoleUser && (
              <Link to="/console" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                🖥️ Management Console
              </Link>
            )}

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
  );
}
