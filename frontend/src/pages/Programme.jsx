import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { CAMP_DAYS, schedule } from '../data/schedule';
import { staff } from '../data/staff';
import TopBar from '../components/TopBar';

export default function Programme() {
  const { state, dispatch } = useApp();
  const { hasPermission } = usePermissions();
  const user = state.currentUser;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const defaultDay = CAMP_DAYS.find((d) => d.date === todayStr)?.key || 'wed';

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [showAnnounceForm, setShowAnnounceForm] = useState(false);
  const [annText, setAnnText] = useState('');
  const [annUrgent, setAnnUrgent] = useState(false);

  const daySchedule = schedule[selectedDay] || [];
  const dayAnnouncements = state.announcements.filter((a) => a.day === selectedDay);

  const canPost = hasPermission('create:announcements');

  // Check if event is happening now
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const isNow = (time, end) => {
    const [sh, sm] = time.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const campDay = CAMP_DAYS.find((d) => d.key === selectedDay);
    if (campDay?.date !== todayStr) return false;
    return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
  };

  const handlePost = () => {
    if (!annText.trim()) return;
    const announcement = {
      id: `ann-${Date.now()}`,
      text: annText.trim(),
      author: user.id,
      createdAt: new Date().toISOString(),
      urgent: annUrgent,
      day: selectedDay,
    };
    dispatch({ type: 'ADD_ANNOUNCEMENT', payload: announcement });
    setAnnText('');
    setAnnUrgent(false);
    setShowAnnounceForm(false);
  };

  return (
    <div className="page page-with-topbar">
      <TopBar title="Programme" />
      <div className="container" style={{ paddingTop: 16 }}>
        {/* Day Selector */}
        <div className="day-selector">
          {CAMP_DAYS.map((d) => (
            <button
              key={d.key}
              className={`day-btn ${selectedDay === d.key ? 'active' : ''}`}
              onClick={() => setSelectedDay(d.key)}
            >
              {d.label}
              <span className="day-btn-date">{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
            </button>
          ))}
        </div>

        {/* Announcements */}
        <div className="section-header" style={{ marginTop: 16 }}>
          <span className="section-title">Announcements</span>
          {canPost && (
            <button
              className="btn btn-sm btn-orange"
              onClick={() => setShowAnnounceForm(!showAnnounceForm)}
              style={{ padding: '6px 14px', fontSize: '0.75rem' }}
            >
              + Announce
            </button>
          )}
        </div>

        {/* Announce Form */}
        {showAnnounceForm && (
          <div className="card" style={{ marginBottom: 12, animation: 'fadeInUp 0.3s ease' }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Announcement</label>
              <textarea
                value={annText}
                onChange={(e) => setAnnText(e.target.value)}
                placeholder="Write your announcement..."
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="toggle-row" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>🔔 Mark as urgent</span>
              <button
                type="button"
                className={`toggle ${annUrgent ? 'on' : ''}`}
                onClick={() => setAnnUrgent(!annUrgent)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handlePost} style={{ flex: 1 }}>
                Post
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => { setShowAnnounceForm(false); setAnnText(''); setAnnUrgent(false); }}
                style={{ border: '1.5px solid var(--border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {dayAnnouncements.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {dayAnnouncements.map((ann) => {
              const author = staff.find((s) => s.id === ann.author);
              const annTime = new Date(ann.createdAt);
              const annTimeStr = annTime.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
              return (
                <div key={ann.id} className={`announcement-card ${ann.urgent ? 'urgent' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ann.urgent && <span className="badge badge-urgent">URGENT</span>}
                      <span className="font-semibold text-sm">{author?.name || 'Admin'}</span>
                    </div>
                    <span className="text-xs text-muted">{annTimeStr}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ann.text}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Timeline */}
        <div className="section-header">
          <span className="section-title">Schedule</span>
        </div>
        <div>
          {daySchedule.map((event, i) => {
            const happening = isNow(event.time, event.end);
            return (
              <div key={i} className={`timeline-item ${happening ? 'now' : ''}`}>
                <div className="timeline-time">
                  {event.time}
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">
                    {event.title}
                    {happening && <span className="timeline-now-badge">NOW</span>}
                  </div>
                  <div className="timeline-meta">{event.location} · {event.groups === 'all' ? 'All Groups' : 'By Group'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
