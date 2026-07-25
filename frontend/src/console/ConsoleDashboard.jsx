import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CAMP_DAYS, schedule } from '../data/schedule';
import { GROUPS } from '../data/campers';
import { sessions } from '../data/sessions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCampDay() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return CAMP_DAYS.find(d => d.date === dateStr) || CAMP_DAYS[0];
}

function formatTime12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getUpcomingSessions(dayKey, count = 4) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const events = schedule[dayKey] || [];
  const upcoming = events.filter(e => {
    const [h, m] = e.time.split(':').map(Number);
    return h * 60 + m >= nowMin - 30;
  });
  return upcoming.slice(0, count);
}

function isCurrentSession(event, dayKey) {
  const now = new Date();
  const campDay = CAMP_DAYS.find(d => d.key === dayKey);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (campDay?.date !== todayStr) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = event.time.split(':').map(Number);
  const [eh, em] = event.end.split(':').map(Number);
  return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
}

// Sample recent activity (in a real system this comes from audit log API)
const ACTIVITY_COLORS = {
  login: 'teal', logout: 'blue', incident: 'orange',
  attendance: 'teal', announcement: 'blue', resolved: 'teal',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color = '', delta, to }) {
  const card = (
    <div className="console-kpi-card" style={{ cursor: to ? 'pointer' : 'default' }}>
      <div className="console-kpi-label">
        <span>{icon}</span>
        {label}
      </div>
      <div className={`console-kpi-value ${color}`}>{value}</div>
      {delta && <div className={`console-kpi-delta ${delta.type}`}>{delta.text}</div>}
    </div>
  );

  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function ConsoleDashboard() {
  const { state } = useApp();
  const campDay = getCampDay();

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalCampers = state.campers.length;

  const daySessions = sessions[campDay.key] || [];
  const firstSessionKey = daySessions.length > 0 ? `${campDay.key}-${daySessions[0].key}` : null;
  const sessionAttendance = firstSessionKey ? (state.attendance[firstSessionKey] || {}) : {};
  const checkedInToday = Object.values(sessionAttendance).filter(s => s === 'present').length;
  const attendancePct = totalCampers > 0 ? Math.round((checkedInToday / totalCampers) * 100) : 0;

  const openIncidents = state.incidents.filter(i => i.status !== 'resolved').length;
  const todayIncidents = state.incidents.filter(i => {
    const d = new Date(i.reportedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const medicalAlerts = state.campers.filter(c => c.medicalNotes).length;
  const unreadNotifications = state.notifications?.filter(n => !n.isRead).length || 0;

  // Staff on duty = seeded staff count (static for now; Phase 3+ will use API)
  const staffOnDuty = 6;

  // ── Platoon occupancy ─────────────────────────────────────────────────────
  const platoonStats = useMemo(() => {
    return GROUPS.map(g => {
      const groupCampers = state.campers.filter(c => c.group === g.id);
      const groupPresent = groupCampers.filter(c => sessionAttendance[c.id] === 'present').length;
      return {
        ...g,
        total: groupCampers.length,
        present: groupPresent,
        pct: groupCampers.length > 0 ? Math.round((groupPresent / groupCampers.length) * 100) : 0,
      };
    });
  }, [state.campers, sessionAttendance]);

  // ── Upcoming sessions ─────────────────────────────────────────────────────
  const upcomingSessions = useMemo(() => getUpcomingSessions(campDay.key), [campDay.key]);

  // ── Recent activity (from incidents + announcements) ──────────────────────
  const recentActivity = useMemo(() => {
    const items = [];

    state.incidents.slice(0, 5).forEach(inc => {
      const camper = state.campers.find(c => c.id === inc.camperId);
      items.push({
        id: inc.id,
        color: inc.status === 'resolved' ? 'teal' : 'orange',
        text: inc.status === 'resolved'
          ? `Incident involving ${camper?.name || 'a camper'} was resolved.`
          : `New ${inc.type} incident reported for ${camper?.name || 'a camper'}.`,
        time: new Date(inc.reportedAt),
      });
    });

    state.announcements.slice(0, 3).forEach(ann => {
      items.push({
        id: ann.id,
        color: ann.urgent ? 'red' : 'blue',
        text: ann.urgent ? `⚠️ Urgent announcement posted.` : `Announcement: "${ann.text.slice(0, 60)}…"`,
        time: new Date(ann.createdAt),
      });
    });

    return items.sort((a, b) => b.time - a.time).slice(0, 8);
  }, [state.incidents, state.announcements, state.campers]);

  // ── Time string ───────────────────────────────────────────────────────────
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();

  return (
    <div>
      {/* Page Header */}
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'} 👋</h1>
          <p className="console-page-subtitle">
            Camp Day {campDay.dayNum} of 5 — {campDay.full} · {timeStr}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/app" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
            fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)',
            textDecoration: 'none', background: '#fff'
          }}>
            📱 Staff Portal
          </Link>
          <Link to="/console/incidents" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 8,
            fontSize: '0.875rem', fontWeight: 600, color: '#fff',
            textDecoration: 'none', background: 'var(--teal)'
          }}>
            + Report Incident
          </Link>
        </div>
      </div>

      {/* KPI Grid — Row 1 */}
      <div className="console-kpi-grid">
        <KpiCard
          label="Total Campers"
          value={totalCampers}
          icon="👥"
          to="/console/campers"
        />
        <KpiCard
          label="Checked In Today"
          value={checkedInToday}
          icon="✅"
          color={attendancePct >= 90 ? 'teal' : attendancePct >= 70 ? 'orange' : 'red'}
          delta={{ type: attendancePct >= 90 ? 'positive' : 'negative', text: `${attendancePct}% attendance rate` }}
          to="/console/attendance"
        />
        <KpiCard
          label="Open Incidents"
          value={openIncidents}
          icon="🚨"
          color={openIncidents === 0 ? '' : openIncidents > 3 ? 'red' : 'orange'}
          delta={{ type: 'neutral', text: `${todayIncidents} reported today` }}
          to="/console/incidents"
        />
        <KpiCard
          label="Staff On Duty"
          value={staffOnDuty}
          icon="👤"
          to="/console/staff"
        />
      </div>

      {/* KPI Grid — Row 2 */}
      <div className="console-kpi-grid" style={{ marginBottom: 28 }}>
        <KpiCard
          label="Medical Alerts"
          value={medicalAlerts}
          icon="⚕️"
          color={medicalAlerts > 0 ? 'orange' : ''}
          delta={{ type: 'neutral', text: 'Campers with medical notes' }}
        />
        <KpiCard
          label="Unread Notifications"
          value={unreadNotifications}
          icon="🔔"
          color={unreadNotifications > 0 ? 'blue' : ''}
        />
        <KpiCard
          label="Incidents Resolved"
          value={state.incidents.filter(i => i.status === 'resolved').length}
          icon="🛡️"
          color="teal"
          delta={{ type: 'positive', text: 'Total resolved' }}
        />
        <KpiCard
          label="Active Announcements"
          value={state.announcements.length}
          icon="📣"
        />
      </div>

      {/* Main content — Two columns */}
      <div className="console-two-col">

        {/* LEFT — Sessions + Platoon Occupancy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upcoming Sessions */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">📅 Today's Sessions</span>
              <Link to="/app/programme" className="console-card-action">View Full Schedule →</Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <div className="console-card-body" style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40, fontSize: '0.875rem' }}>
                No more sessions today.
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {upcomingSessions.map((event, i) => {
                  const current = isCurrentSession(event, campDay.key);
                  return (
                    <div key={i} className="console-session-item" style={{ padding: '12px 24px' }}>
                      <div className="console-session-time">
                        {formatTime12(event.time).split(' ')[0]}
                        <span>{formatTime12(event.time).split(' ')[1]}</span>
                      </div>
                      <div className="console-session-info">
                        <div className="console-session-name">{event.title}</div>
                        <div className="console-session-loc">{event.location}</div>
                      </div>
                      <span className={`console-session-badge${current ? ' now' : ''}`}>
                        {current ? 'NOW' : event.groups === 'all' ? 'All Groups' : 'By Group'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Platoon Occupancy */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">🏴 Platoon Attendance</span>
              <Link to="/console/attendance" className="console-card-action">Detailed View →</Link>
            </div>
            <div className="console-card-body">
              {platoonStats.map(p => (
                <div key={p.id} className="console-platoon-row">
                  <div className="console-platoon-label">{p.emoji} {p.name}</div>
                  <div className="console-platoon-bar-track">
                    <div
                      className="console-platoon-bar-fill"
                      style={{
                        width: `${p.pct}%`,
                        background: p.pct >= 90 ? 'var(--teal)' : p.pct >= 70 ? 'var(--amber)' : 'var(--red)',
                      }}
                    />
                  </div>
                  <div className="console-platoon-count">{p.present}/{p.total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Recent Activity + Medical Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recent Activity */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">📡 Recent Activity</span>
              <Link to="/console/audit" className="console-card-action">Audit Log →</Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="console-card-body" style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32, fontSize: '0.875rem' }}>
                No recent activity.
              </div>
            ) : (
              <div>
                {recentActivity.map(item => (
                  <div key={item.id} className="console-activity-item">
                    <div className={`console-activity-dot ${item.color}`} />
                    <div>
                      <div className="console-activity-text">{item.text}</div>
                      <div className="console-activity-time">
                        {item.time.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {' · '}
                        {item.time.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medical Alerts */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">⚕️ Medical Alerts</span>
              <Link to="/console/campers" className="console-card-action">All Campers →</Link>
            </div>
            <div style={{ padding: '4px 0' }}>
              {state.campers.filter(c => c.medicalNotes).map(c => (
                <div key={c.id} className="console-activity-item">
                  <div className="console-activity-dot orange" />
                  <div>
                    <div className="console-activity-text" style={{ fontWeight: 500 }}>{c.name}</div>
                    <div className="console-activity-time">{c.medicalNotes}</div>
                  </div>
                  <div>
                    <span className="badge badge-amber" style={{ fontSize: '0.6875rem' }}>
                      {GROUPS.find(g => g.id === c.group)?.emoji}
                    </span>
                  </div>
                </div>
              ))}
              {state.campers.filter(c => c.medicalNotes).length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No medical alerts on file.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
