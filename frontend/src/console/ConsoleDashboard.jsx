import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CAMP_DAYS, schedule } from '../data/schedule';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

function getCampDaysRemaining() {
  const now = new Date();
  const lastDay = CAMP_DAYS[CAMP_DAYS.length - 1];
  const end = new Date(lastDay.date);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color = '', delta, to }) {
  const card = (
    <div className="console-kpi-card" style={{ cursor: to ? 'pointer' : 'default' }}>
      <div className="console-kpi-label">
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        {label}
      </div>
      <div className={`console-kpi-value ${color}`}>{value ?? '—'}</div>
      {delta && <div className={`console-kpi-delta ${delta.type}`}>{delta.text}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function ConsoleDashboard() {
  const { state } = useApp();
  const campDay = getCampDay();
  const daysRemaining = getCampDaysRemaining();

  const [summary, setSummary] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingApi, setLoadingApi] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('camp_token');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/reports/summary`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/api/announcements`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([summaryData, annData]) => {
      setSummary(summaryData);
      setAnnouncements(annData || []);
    }).finally(() => setLoadingApi(false));
  }, []);

  // Local state fallbacks while API loads
  const totalCampers  = summary?.totalCampers  ?? state.campers.length;
  const totalStaff    = summary?.totalStaff    ?? 6;
  const openIncidents = summary?.openIncidents  ?? state.incidents.filter(i => i.status !== 'resolved').length;
  const medAlerts     = summary?.totalMedicalAlerts ?? state.campers.filter(c => c.medicalNotes).length;
  const platoonSummary = summary?.platoonSummary ?? [];
  const recentActivity = summary?.recentActivity ?? [];

  // Upcoming sessions from schedule data
  const upcomingSessions = useMemo(() => getUpcomingSessions(campDay.key), [campDay.key]);

  // Time
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div>
      {/* Page Header */}
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Good {greeting} 👋</h1>
          <p className="console-page-subtitle">
            Camp Day {campDay.dayNum} of 5 — {campDay.full} · {timeStr}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', textDecoration: 'none', background: '#fff' }}>
            📱 Staff Portal
          </Link>
          <Link to="/console/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'var(--teal)' }}>
            + Report Incident
          </Link>
        </div>
      </div>

      {/* KPI Grid — Row 1 */}
      <div className="console-kpi-grid">
        <KpiCard label="Total Campers"   value={totalCampers}  icon="👥" to="/console/campers" />
        <KpiCard label="Total Staff"     value={totalStaff}    icon="👮" to="/console/staff" />
        <KpiCard
          label="Open Incidents"
          value={openIncidents}
          icon="⚠️"
          color={openIncidents === 0 ? '' : openIncidents > 3 ? 'red' : 'orange'}
          delta={{ type: openIncidents === 0 ? 'positive' : 'negative', text: openIncidents === 0 ? 'All clear' : `${openIncidents} requiring attention` }}
          to="/console/incidents"
        />
        <KpiCard label="Medical Alerts" value={medAlerts} icon="⚕️" color={medAlerts > 0 ? 'orange' : ''} delta={{ type: medAlerts > 0 ? 'neutral' : 'positive', text: medAlerts > 0 ? 'Campers with medical notes' : 'No medical alerts' }} to="/console/campers" />
      </div>

      {/* KPI Grid — Row 2 */}
      <div className="console-kpi-grid" style={{ marginBottom: 24 }}>
        <KpiCard
          label="Camp Days Remaining"
          value={daysRemaining}
          icon="📅"
          color={daysRemaining <= 1 ? 'red' : daysRemaining <= 2 ? 'orange' : ''}
          delta={{ type: 'neutral', text: `Day ${campDay.dayNum} of 5` }}
        />
        <KpiCard
          label="Announcements"
          value={announcements.length}
          icon="📢"
          delta={{ type: 'neutral', text: `${announcements.filter(a => a.pinned).length} pinned` }}
          to="/console/announcements"
        />
        <KpiCard
          label="Platoons"
          value={platoonSummary.length || 4}
          icon="🛡️"
          delta={{ type: 'neutral', text: 'Active groups' }}
          to="/console/platoons"
        />
        <KpiCard
          label="Activity Today"
          value={recentActivity.length}
          icon="⚡"
          delta={{ type: 'neutral', text: 'Admin actions logged' }}
          to="/console/activity"
        />
      </div>

      {/* Two-col layout */}
      <div className="console-two-col">
        {/* Left: Platoon Overview + Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Platoon Overview */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">Platoon Overview</span>
              <Link to="/console/platoons" className="console-card-action">Manage →</Link>
            </div>
            <div className="console-card-body">
              {platoonSummary.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {loadingApi ? 'Loading platoons…' : 'No platoon data available'}
                </div>
              ) : (
                platoonSummary.map(p => (
                  <div key={p.id} className="console-platoon-row">
                    <span style={{ width: 24, textAlign: 'center' }}>{p.emoji}</span>
                    <span className="console-platoon-label">{p.name}</span>
                    <div className="console-platoon-bar-track">
                      <div className="console-platoon-bar-fill" style={{ width: `${Math.min(100, (p.camperCount / Math.max(...platoonSummary.map(x => x.camperCount), 1)) * 100)}%`, background: p.colorHex || 'var(--teal)' }} />
                    </div>
                    <span className="console-platoon-count">{p.camperCount}</span>
                    {p.medicalAlerts > 0 && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--orange)', fontWeight: 600, minWidth: 28 }}>⚕️ {p.medicalAlerts}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">Recent Activity</span>
              <Link to="/console/activity" className="console-card-action">View All →</Link>
            </div>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {loadingApi ? 'Loading activity…' : 'No recent activity'}
              </div>
            ) : (
              recentActivity.slice(0, 8).map(log => (
                <div key={log.id} className="console-activity-item">
                  <div className={`console-activity-dot ${log.action.startsWith('CREATE') ? 'teal' : log.action.startsWith('UPDATE') ? 'blue' : log.action.startsWith('DELETE') ? 'red' : 'orange'}`} />
                  <div>
                    <div className="console-activity-text">
                      <strong>{log.userName}</strong> — {log.action.replace(/_/g, ' ').toLowerCase()}
                      {log.targetName ? ` · ${log.targetName}` : ''}
                    </div>
                    <div className="console-activity-time">
                      {new Date(log.createdAt).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Upcoming Sessions + Announcements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upcoming Sessions */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">Today's Programme</span>
              <Link to="/console/programme" className="console-card-action">Full Schedule →</Link>
            </div>
            <div className="console-card-body">
              {upcomingSessions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '12px 0' }}>No sessions scheduled today.</div>
              ) : (
                upcomingSessions.map(e => {
                  const now2 = new Date();
                  const [sh, sm] = e.time.split(':').map(Number);
                  const [eh, em] = e.end.split(':').map(Number);
                  const nowMin2 = now2.getHours() * 60 + now2.getMinutes();
                  const isNow = nowMin2 >= sh * 60 + sm && nowMin2 < eh * 60 + em;
                  return (
                    <div key={e.id || e.time} className="console-session-item">
                      <div className="console-session-time">
                        {formatTime12(e.time).split(' ')[0]}
                        <span>{formatTime12(e.time).split(' ')[1]}</span>
                      </div>
                      <div className="console-session-info">
                        <div className="console-session-name">{e.title}</div>
                        <div className="console-session-loc">{e.location || e.type}</div>
                      </div>
                      <span className={`console-session-badge${isNow ? ' now' : ''}`}>
                        {isNow ? 'NOW' : 'Next'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pinned Announcements */}
          <div className="console-card">
            <div className="console-card-header">
              <span className="console-card-title">Announcements</span>
              <Link to="/console/announcements" className="console-card-action">Manage →</Link>
            </div>
            <div className="console-card-body">
              {announcements.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '12px 0' }}>
                  {loadingApi ? 'Loading…' : 'No announcements yet.'}
                </div>
              ) : (
                announcements.slice(0, 4).map(ann => (
                  <div key={ann.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {ann.urgent && <span style={{ fontSize: '0.625rem', fontWeight: 700, background: '#FEF2F2', color: 'var(--red)', padding: '2px 6px', borderRadius: 4 }}>URGENT</span>}
                      {ann.pinned && <span style={{ fontSize: '0.625rem', fontWeight: 700, background: '#F0FDF4', color: 'var(--teal)', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>📌 PINNED</span>}
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{ann.title}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ann.body.slice(0, 100)}{ann.body.length > 100 ? '…' : ''}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {ann.authorName} · {new Date(ann.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
