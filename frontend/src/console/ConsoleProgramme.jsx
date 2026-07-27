import { useState } from 'react';
import { CAMP_DAYS, schedule } from '../data/schedule';

function formatTime12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function ConsoleProgramme() {
  const [selectedDay, setSelectedDay] = useState(CAMP_DAYS[0].key);
  const daySessions = schedule[selectedDay] || [];

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Programme Schedule</h1>
          <p className="console-page-subtitle">View and manage the camp schedule</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            + Add Session
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {CAMP_DAYS.map(day => (
          <button
            key={day.key}
            onClick={() => setSelectedDay(day.key)}
            style={{
              padding: '12px 24px', borderRadius: 12, border: '1px solid var(--border)',
              background: selectedDay === day.key ? 'var(--text)' : '#fff',
              color: selectedDay === day.key ? '#fff' : 'var(--text)',
              cursor: 'pointer', flexShrink: 0, textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: selectedDay === day.key ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
              Day {day.dayNum}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>{day.full.split(',')[0]}</div>
          </button>
        ))}
      </div>

      <div className="console-card">
        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Session</th>
                <th>Location</th>
                <th>Type</th>
                <th>Requires Att.</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {daySessions.map(session => (
                <tr key={session.key}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {formatTime12(session.time)} - {formatTime12(session.end)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{session.title}</div>
                    {session.speaker && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By {session.speaker}</div>}
                  </td>
                  <td>{session.location || '-'}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg)' }}>{session.type}</span>
                  </td>
                  <td>
                    {session.requiresAttendance ? (
                      <span style={{ color: 'var(--teal)', fontWeight: 600 }}>Yes</span>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-text" style={{ fontSize: '0.8125rem', padding: '4px 8px' }}>Edit</button>
                  </td>
                </tr>
              ))}
              {daySessions.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No sessions scheduled for this day.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
