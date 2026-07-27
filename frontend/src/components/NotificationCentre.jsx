import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function NotificationCentre({ lightMode }) {
  const { state } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Initial fetch
    if (state.currentUser) {
      fetchNotifications();
    }
  }, [state.currentUser]);

  // Poller for push notifications (simulated)
  useEffect(() => {
    if (!state.currentUser) return;
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [state.currentUser]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/notifications?staffId=${state.currentUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Simulate toast for new unread notifications that just arrived
      // (For real prod we'd track last fetch timestamp)
      setNotifications(data);
    } catch (err) {}
  };

  const markAllRead = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
      await fetch(`${API}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staffId: state.currentUser.id })
      });
      fetchNotifications();
    } catch (err) {}
  };

  const markRead = async (id) => {
    try {
      const token = sessionStorage.getItem('camp_token');
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {}
  };

  const deleteNotification = async (id) => {
    try {
      const token = sessionStorage.getItem('camp_token');
      await fetch(`${API}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
          padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: lightMode ? 'var(--text)' : '#fff'
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4, background: 'var(--red)', color: '#fff',
            fontSize: '0.625rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: 10,
            border: '2px solid var(--bg-dark)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 350, maxHeight: 400,
          background: 'var(--bg)', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 999, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8125rem', cursor: 'pointer' }}>
                Mark all as read
              </button>
            )}
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{
                  padding: 16, borderBottom: '1px solid var(--border-light)', 
                  background: n.isRead ? 'transparent' : 'rgba(10, 161, 143, 0.05)',
                  display: 'flex', gap: 12, position: 'relative'
                }}>
                  <div style={{ fontSize: '1.25rem' }}>
                    {n.priority === 'critical' ? '🚨' : n.category === 'Medical' ? '🚑' : n.category === 'Camp Drill' ? '📋' : '🔔'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: n.isRead ? 500 : 600, color: n.priority === 'critical' ? 'var(--red)' : 'var(--text)' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  </div>
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)} style={{ position: 'absolute', right: 16, bottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', fontSize: '0.75rem' }}>
                      Mark Read
                    </button>
                  )}
                  {n.isRead && (
                    <button onClick={() => deleteNotification(n.id)} style={{ position: 'absolute', right: 16, bottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
