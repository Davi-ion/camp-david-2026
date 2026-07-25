import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CAMP_DAYS, schedule } from '../data/schedule';
import { sessions } from '../data/sessions';
import { staff } from '../data/staff';
import { GROUPS } from '../data/campers';
import UserMenu from '../components/UserMenu';

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

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
  // If not during camp, default to day 1 for demo
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

  // If no current, pick a sensible default for demo
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

  // Current session for attendance count
  const daySessions = sessions[campDay.key] || [];
  const currentSessionKey = daySessions.length > 0
    ? `${campDay.key}-${daySessions[0].key}`
    : null;

  const sessionAttendance = currentSessionKey
    ? (state.attendance[currentSessionKey] || {})
    : {};
  const checkedIn = Object.values(sessionAttendance).filter((s) => s === 'present').length;
  const openIncidents = state.incidents.filter((i) => i.status !== 'resolved').length;

  // Time display
  const timeStr = now.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();

  // Latest announcements (top 3)
  const latestAnn = state.announcements.slice(0, 3);

  const firstName = user?.name?.split(' ')[0] || 'Staff';
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

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
            <UserMenu lightMode={true} />
          </div>

          <p className="dash-greeting">{greeting},</p>
          <h1 className="dash-name">{user?.name || 'Staff Member'}</h1>

          <div className="dash-day-strip">
            <span className="dash-day-badge">DAY {campDay.dayNum} OF 5</span>
            <span>{campDay.full} · {timeStr}</span>
          </div>

          {/* Happening Now */}
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
        {/* Stats Row */}
        <div className="stats-row" style={{ marginTop: 20 }}>
          <div className="stat-card">
            <div className="stat-value">{state.campers.length}</div>
            <div className="stat-label">Campers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{checkedIn}</div>
            <div className="stat-label">Checked In</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${openIncidents > 0 ? 'danger' : ''}`}>{openIncidents}</div>
            <div className="stat-label">Open Incidents</div>
          </div>
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
          <Link to="/app/programme" className="section-link">See All</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {latestAnn.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div className="empty-state-text">No announcements yet</div>
            </div>
          ) : (
            latestAnn.map((ann) => {
              const author = staff.find((s) => s.id === ann.author);
              const annTime = new Date(ann.createdAt);
              const annTimeStr = annTime.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
              return (
                <div key={ann.id} className={`announcement-card ${ann.urgent ? 'urgent' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ann.urgent && <span className="badge badge-urgent">URGENT</span>}
                      <span className="font-semibold text-sm">{author?.name || 'Admin'}</span>
                    </div>
                    <span className="text-xs text-muted">{annTimeStr}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ann.text}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => navigate('/app/rollcall')}>
            <div className="quick-action-icon teal">📋</div>
            Take Roll Call
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/app/incidents')}>
            <div className="quick-action-icon orange">🚨</div>
            Report Incident
          </button>
        </div>
      </div>
    </div>
  );
}
