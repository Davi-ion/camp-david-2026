import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CAMP_DAYS, schedule } from '../data/schedule';
import { sessions } from '../data/sessions';
import UserMenu from '../components/UserMenu';
import NotificationCentre from '../components/NotificationCentre';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function formatTime12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return { hr: `${hr}:${m.toString().padStart(2, '0')}`, ampm };
}

function getCampDay(now) {
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const day = CAMP_DAYS.find((d) => d.date === dateStr);
  if (day) return day;
  return CAMP_DAYS[0];
}

function getCurrentAndNext(dayKey, now) {
  const events = schedule[dayKey] || [];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let current = null;
  let next = null;

  for (let i = 0; i < events.length; i++) {
    const [sh, sm] = events[i].time.split(':').map(Number);
    const [eh, em] = events[i].end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;

    if (nowMinutes >= start && nowMinutes < end) {
      current = { ...events[i], startMin: start, endMin: end };
    }
    if (start > nowMinutes && !next) {
      next = { ...events[i], startMin: start };
    }
  }

  if (!current && events.length > 0) {
    current = { ...events[Math.floor(events.length / 2)], demo: true };
    const [sh, sm] = current.time.split(':').map(Number);
    const [eh, em] = current.end.split(':').map(Number);
    current.startMin = sh * 60 + sm;
    current.endMin = eh * 60 + em;
  }
  if (!next && events.length > 1) {
    const idx = events.indexOf(events.find(e => e.time === current?.time));
    if (idx >= 0 && idx < events.length - 1) {
      next = events[idx + 1];
      const [sh, sm] = next.time.split(':').map(Number);
      next.startMin = sh * 60 + sm;
    }
  }

  return { current, next };
}

function getCountdown(nowMinutes, targetMinutes) {
  let diff = targetMinutes - nowMinutes;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const user = state.currentUser;
  const now = new Date();
  const campDay = getCampDay(now);

  const { current, next } = useMemo(() => {
    return getCurrentAndNext(campDay.key, now);
  }, [campDay.key]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const daySessions = sessions[campDay.key] || [];
  const currentSessionKey = daySessions.length > 0 ? `${campDay.key}-${daySessions[0].key}` : null;
  const sessionAttendance = currentSessionKey ? (state.attendance[currentSessionKey] || {}) : {};
  const checkedIn = Object.values(sessionAttendance).filter((s) => s === 'present').length;
  const openIncidents = state.incidents.filter((i) => i.status !== 'resolved').length;

  const timeStr = now.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const isMedical = user?.roleName === 'Medical Team' || user?.department === 'Medical';
  const isCounsellor = user?.roleName === 'Counsellor' || user?.roleName === 'Platoon Leader';

  const myCampers = isCounsellor ? state.campers.filter(c => c.platoonId === user.platoonId) : state.campers;
  const myMedicalAlerts = myCampers.filter(c => c.medicalNotes).length;
  const myOpenIncidents = state.incidents.filter((i) => i.status !== 'resolved' && (isCounsellor ? myCampers.find(c => c.id === i.camperId) : true)).length;

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const token = localStorage.getItem('camp_token');
        const res = await fetch(`${API}/api/announcements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setAnnouncements(data);
      } catch (err) {}
    };
    if (user) fetchAnnouncements();
  }, [user]);

  const emergencyAlerts = announcements.filter(a => a.isEmergency);
  
  // Sort logic for regular display: pinned first, then unread, then recent
  const displayAnnouncements = [...announcements].filter(a => !a.isEmergency).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.isReadByMe !== b.isReadByMe) return a.isReadByMe ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  }).slice(0, 3);

  const markAnnRead = async (id) => {
    try {
      const token = localStorage.getItem('camp_token');
      await fetch(`${API}/api/announcements/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isReadByMe: true } : a));
    } catch (err) {}
  };

  return (
    <div className="page">
      {/* Dashboard Header */}
      <div className="dash-header">
        <div className="container">
          <div className="dash-header-top">
            <div className="dash-brand">
              <div className="dash-logo">⛺</div>
              Camp David 2026
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <NotificationCentre lightMode={false} />
              <UserMenu lightMode={true} />
            </div>
          </div>

          <p className="dash-greeting">{greeting},</p>
          <h1 className="dash-name">{user?.name || 'Staff Member'}</h1>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 16 }}>
            {user?.roleName || user?.role} {user?.platoonKey ? `· ${user.platoonKey.toUpperCase()} PLATOON` : (user?.department ? `· ${user.department.toUpperCase()}` : '')}
          </div>

          <div className="dash-day-strip">
            <span className="dash-day-badge">DAY {campDay.dayNum} OF 5</span>
            <span>{campDay.full} · {timeStr}</span>
          </div>

          {current && (
            <div className="now-card">
              <div className="now-card-label">
                <span className="now-dot" />
                HAPPENING NOW
              </div>
              <div className="now-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="now-card-title">{current.title}</div>
                <div className="now-card-time">
                  {current.time} – {current.end}
                </div>
              </div>
              <div className="now-card-meta">{current.location} · All Groups</div>
            </div>
          )}
        </div>
      </div>

      <div className="container">
        
        {/* Emergency Banner */}
        {emergencyAlerts.length > 0 && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {emergencyAlerts.map(alert => (
              <div key={alert.id} style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: 16,
                boxShadow: '0 4px 12px rgba(239,68,68,0.15)', display: 'flex', gap: 16, alignItems: 'flex-start'
              }}>
                <div style={{ fontSize: '2rem', animation: 'pulse 2s infinite' }}>🚨</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#991B1B', margin: '0 0 4px 0', fontSize: '1.125rem' }}>{alert.title}</h3>
                  <p style={{ color: '#B91C1C', fontSize: '0.9375rem', margin: 0, lineHeight: 1.5 }}>{alert.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-row" style={{ marginTop: emergencyAlerts.length > 0 ? 20 : 24 }}>
          {isMedical ? (
            <>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--orange)' }}>{state.campers.filter(c => c.medicalNotes).length}</div>
                <div className="stat-label">Medical Alerts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{state.campers.filter(c => c.dietaryRestrictions).length}</div>
                <div className="stat-label">Dietary Reqs</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value ${openIncidents > 0 ? 'danger' : ''}`}>{openIncidents}</div>
                <div className="stat-label">Health Incidents</div>
              </div>
            </>
          ) : isCounsellor ? (
            <>
              <div className="stat-card">
                <div className="stat-value">{myCampers.length}</div>
                <div className="stat-label">My Campers</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{myMedicalAlerts}</div>
                <div className="stat-label">Alerts in Platoon</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value ${myOpenIncidents > 0 ? 'danger' : ''}`}>{myOpenIncidents}</div>
                <div className="stat-label">Platoon Incidents</div>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card">
                <div className="stat-value">{state.campers.length}</div>
                <div className="stat-label">Total Campers</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{checkedIn}</div>
                <div className="stat-label">Checked In</div>
              </div>
              <div className="stat-card">
                <div className={`stat-value ${openIncidents > 0 ? 'danger' : ''}`}>{openIncidents}</div>
                <div className="stat-label">Open Incidents</div>
              </div>
            </>
          )}
        </div>

        {/* Up Next */}
        {next && (
          <>
            <div className="section-header">
              <span className="section-title">Up Next</span>
              <Link to="/app/programme" className="section-link">Full Schedule</Link>
            </div>
            <div className="upnext-card">
              <div className="upnext-time">
                {(() => {
                  const t = formatTime12(next.time);
                  return (<>{t.hr}<span>{t.ampm}</span></>);
                })()}
              </div>
              <div className="upnext-info">
                <div className="upnext-title">{next.title}</div>
                <div className="upnext-meta">{next.location} · All Groups</div>
              </div>
              {next.startMin && (
                <div className="upnext-countdown">{getCountdown(nowMinutes, next.startMin)}</div>
              )}
            </div>
          </>
        )}

        {/* Announcements */}
        <div className="section-header">
          <span className="section-title">Announcements</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayAnnouncements.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div className="empty-state-text">No announcements yet</div>
            </div>
          ) : (
            displayAnnouncements.map((ann) => {
              const annTimeStr = new Date(ann.createdAt).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
              return (
                <div key={ann.id} onClick={() => !ann.isReadByMe && markAnnRead(ann.id)} className={`announcement-card ${ann.pinned ? 'urgent' : ''}`} style={{ cursor: ann.isReadByMe ? 'default' : 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!ann.isReadByMe && <span className="badge" style={{ background: 'var(--teal)', color: '#fff' }}>NEW</span>}
                      {ann.pinned && <span className="badge" style={{ background: '#eee' }}>PINNED</span>}
                      <span className="font-semibold text-sm">{ann.authorName || 'Admin'}</span>
                    </div>
                    <span className="text-xs text-muted">{annTimeStr}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9375rem', color: 'var(--text)' }}>{ann.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {ann.body}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => navigate('/app/rollcall')}>
            <div className="quick-action-icon teal" style={{ fontSize: '1.5rem' }}>📋</div>
            Take Roll Call
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/app/incidents')}>
            <div className="quick-action-icon orange" style={{ fontSize: '1.5rem' }}>⚠️</div>
            Report Incident
          </button>
        </div>
      </div>
    </div>
  );
}
