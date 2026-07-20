import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CAMP_DAYS } from '../data/schedule';
import { sessions } from '../data/sessions';
import { GROUPS } from '../data/campers';
import TopBar from '../components/TopBar';

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function RollCall() {
  const { state, dispatch } = useApp();
  const user = state.currentUser;

  // Find current camp day or default
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const defaultDay = CAMP_DAYS.find((d) => d.date === todayStr)?.key || 'wed';

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedSession, setSelectedSession] = useState(null);
  const [groupFilter, setGroupFilter] = useState('all');

  const daySessions = sessions[selectedDay] || [];

  // Auto-select first session
  const activeSession = selectedSession || (daySessions[0]?.key || null);
  const sessionKey = activeSession ? `${selectedDay}-${activeSession}` : null;

  // Filter campers by role
  const visibleCampers = useMemo(() => {
    let list = state.campers;
    if (user?.role !== 'admin') {
      list = list.filter((c) => c.group === user?.group);
    } else if (groupFilter !== 'all') {
      list = list.filter((c) => c.group === groupFilter);
    }
    return list;
  }, [state.campers, user, groupFilter]);

  // Group campers by team
  const groupedCampers = useMemo(() => {
    const groups = {};
    visibleCampers.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, [visibleCampers]);

  // Attendance for current session
  const sessionData = sessionKey ? (state.attendance[sessionKey] || {}) : {};

  // Summary counts
  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, excused: 0, pending: 0 };
    visibleCampers.forEach((c) => {
      const status = sessionData[c.id];
      if (status) counts[status]++;
      else counts.pending++;
    });
    return counts;
  }, [visibleCampers, sessionData]);

  const handleMark = (camperId, status) => {
    if (!sessionKey) return;
    const current = sessionData[camperId];
    // Toggle off if same status
    dispatch({
      type: 'SET_ATTENDANCE',
      payload: {
        sessionKey,
        camperId,
        status: current === status ? null : status,
      },
    });
  };

  const handleBulk = (status) => {
    if (!sessionKey) return;
    dispatch({
      type: 'BULK_ATTENDANCE',
      payload: {
        sessionKey,
        camperIds: visibleCampers.map((c) => c.id),
        status,
      },
    });
  };

  return (
    <div className="page page-with-topbar">
      <TopBar title="Roll Call" />
      <div className="container" style={{ paddingTop: 16 }}>
        {/* Day Selector */}
        <div className="day-selector">
          {CAMP_DAYS.map((d) => (
            <button
              key={d.key}
              className={`day-btn ${selectedDay === d.key ? 'active' : ''}`}
              onClick={() => { setSelectedDay(d.key); setSelectedSession(null); }}
            >
              {d.label}
              <span className="day-btn-date">{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
            </button>
          ))}
        </div>

        {/* Session Selector */}
        <div className="session-selector" style={{ marginTop: 14 }}>
          {daySessions.map((s) => (
            <button
              key={s.key}
              className={`session-btn ${activeSession === s.key ? 'active' : ''}`}
              onClick={() => setSelectedSession(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Group Filter (Admin only) */}
        {user?.role === 'admin' && (
          <div className="filter-tabs" style={{ marginTop: 14 }}>
            <button
              className={`filter-tab ${groupFilter === 'all' ? 'active' : ''}`}
              onClick={() => setGroupFilter('all')}
            >
              All
            </button>
            {GROUPS.map((g) => (
              <button
                key={g.id}
                className={`filter-tab ${groupFilter === g.id ? 'active' : ''}`}
                onClick={() => setGroupFilter(g.id)}
              >
                {g.emoji} {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Summary Bar */}
        <div className="summary-bar" style={{ marginTop: 16 }}>
          <div className="summary-item">
            <span className="dot dot-present" /> {summary.present} Present
          </div>
          <div className="summary-item">
            <span className="dot dot-absent" /> {summary.absent} Absent
          </div>
          <div className="summary-item">
            <span className="dot dot-excused" /> {summary.excused} Excused
          </div>
          <div className="summary-item">
            <span className="dot dot-pending" /> {summary.pending} Pending
          </div>
        </div>

        {/* Bulk Actions */}
        {sessionKey && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-sm btn-outline" onClick={() => handleBulk('present')} style={{ flex: 1 }}>
              ✓ Mark All Present
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => handleBulk('absent')}
              style={{ flex: 1, border: '1.5px solid var(--border)' }}
            >
              ✗ Mark All Absent
            </button>
          </div>
        )}

        {/* Camper List */}
        {!sessionKey ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">Select a session to begin roll call</div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            {Object.entries(groupedCampers).map(([groupId, camperList]) => {
              const group = GROUPS.find((g) => g.id === groupId);
              return (
                <div key={groupId}>
                  <div className="group-header">
                    {group?.emoji} {group?.name || groupId}
                  </div>
                  {camperList.map((camper) => {
                    const status = sessionData[camper.id] || null;
                    return (
                      <div key={camper.id} className="camper-row">
                        <div className="avatar avatar-sm" style={{
                          background: status === 'present' ? 'var(--teal)' :
                                     status === 'absent' ? 'var(--red)' :
                                     status === 'excused' ? 'var(--amber)' : 'var(--border)'
                        }}>
                          {getInitials(camper.name)}
                        </div>
                        <div className="camper-info">
                          <div className="camper-name">
                            {camper.name}
                            {camper.medicalNotes && <span className="medical-flag">⚕</span>}
                          </div>
                        </div>
                        <div className="status-buttons">
                          <button
                            className={`status-btn ${status === 'present' ? 'present' : ''}`}
                            onClick={() => handleMark(camper.id, 'present')}
                            title="Present"
                          >
                            ✓
                          </button>
                          <button
                            className={`status-btn ${status === 'absent' ? 'absent' : ''}`}
                            onClick={() => handleMark(camper.id, 'absent')}
                            title="Absent"
                          >
                            ✗
                          </button>
                          <button
                            className={`status-btn ${status === 'excused' ? 'excused' : ''}`}
                            onClick={() => handleMark(camper.id, 'excused')}
                            title="Excused"
                          >
                            ~
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
