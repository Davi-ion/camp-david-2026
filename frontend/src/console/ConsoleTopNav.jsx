import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NotificationCentre from '../components/NotificationCentre';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const BREADCRUMB_LABELS = {
  '/console':              'Dashboard',
  '/console/users':        'User Management',
  '/console/roles':        'Roles & Permissions',
  '/console/audit':        'Audit Logs',
  '/console/incidents':    'Incidents',
  '/console/campers':      'Campers',
  '/console/platoons':     'Platoons',
  '/console/attendance':   'Attendance',
  '/console/programme':    'Programme',
  '/console/staff':        'Staff',
  '/console/settings':     'Settings',
  '/console/activity':     'Activity Feed',
  '/console/announcements':'Announcements',
  '/console/reports':      'Reports',
};

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
}

// ─── Global Search ────────────────────────────────────────────────
function GlobalSearch() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const ref     = useRef(null);
  const timer   = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 300);
  };

  const handleClear = () => { setQuery(''); setResults(null); setOpen(false); };

  const hasResults = results && (results.campers?.length > 0 || results.staff?.length > 0);

  return (
    <div ref={ref} className="console-search" style={{ position: 'relative' }}>
      <span className="console-search-icon">🔍</span>
      <input
        type="text"
        className="console-search-input"
        placeholder="Search campers, staff, sessions…"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
      />
      {query && (
        <button onClick={handleClear} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}>✕</button>
      )}

      {open && query.length >= 2 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200, overflow: 'hidden',
          minWidth: 340,
        }}>
          {loading && (
            <div style={{ padding: '16px 20px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Searching…</div>
          )}
          {!loading && !hasResults && results && (
            <div style={{ padding: '16px 20px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No results for "{query}"</div>
          )}
          {!loading && hasResults && (
            <>
              {results.campers?.length > 0 && (
                <div>
                  <div style={{ padding: '8px 16px 4px', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>Campers</div>
                  {results.campers.map(c => (
                    <button key={c.id} onClick={() => { navigate('/console/campers'); handleClear(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.registrationNumber} · {c.platoon?.emoji} {c.platoon?.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.staff?.length > 0 && (
                <div style={{ borderTop: results.campers?.length > 0 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ padding: '8px 16px 4px', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>Staff</div>
                  {results.staff.map(s => (
                    <button key={s.id} onClick={() => { navigate('/console/staff'); handleClear(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6B7280', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(s.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.department} · {s.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ConsoleTopNav ────────────────────────────────────────────────
export default function ConsoleTopNav({ onMenuClick }) {
  const { state, dispatch } = useApp();
  const [location, setLocation] = useState(window.location.pathname);
  const navigate = useNavigate();
  const user = state.currentUser;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = state.notifications?.filter(n => !n.isRead).length || 0;
  const currentLabel = BREADCRUMB_LABELS[location] || 'Console';

  // Update breadcrumb on navigation
  useEffect(() => {
    const handler = () => setLocation(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="console-hamburger" onClick={onMenuClick} style={{ display: 'none' }}>
          ☰
        </button>
        {/* Breadcrumb */}
        <nav className="console-breadcrumb">
          <Link to="/console" className="console-breadcrumb-item">Console</Link>
        {window.location.pathname !== '/console' && (
          <>
            <span className="console-breadcrumb-sep">/</span>
            <span className="console-breadcrumb-item current">{BREADCRUMB_LABELS[window.location.pathname] || 'Page'}</span>
          </>
        )}
        </nav>
      </div>

      {/* Functional Global Search */}
      <GlobalSearch />

      {/* Actions */}
      <div className="console-topnav-actions">
        <NotificationCentre lightMode={true} />

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="console-user-chip" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="avatar avatar-sm" style={{ background: 'var(--teal)', color: '#fff', width: 28, height: 28, fontSize: '0.6875rem' }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="console-user-chip-name">{user?.name?.split(' ')[0] || 'Admin'}</div>
              <div className="console-user-chip-role">{user?.roleName || user?.role}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginLeft: 4 }}>▾</span>
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 8px)', width: 220 }}>
              <div className="dropdown-header">
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.email}</p>
                <span className="badge badge-teal" style={{ marginTop: 6 }}>{user?.roleName || user?.role}</span>
              </div>
              <div className="dropdown-divider" />
              <Link to="/app/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>👤 My Profile</Link>
              <Link to="/app" className="dropdown-item" onClick={() => setDropdownOpen(false)}>📱 Staff Portal</Link>
              <div className="dropdown-divider" />
              <button onClick={handleLogout} className="dropdown-item" style={{ width: '100%', textAlign: 'left', color: 'var(--red)' }}>
                ↪ Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
