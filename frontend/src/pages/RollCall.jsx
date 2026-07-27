import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { CAMP_DAYS } from '../data/schedule';
import { sessions } from '../data/sessions';
import { GROUPS } from '../data/campers';
import TopBar from '../components/TopBar';
import EmptyState from '../components/EmptyState';
function getInitials(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function RollCall() {
  const { state, dispatch } = useApp();
  const { hasPermission } = usePermissions();
  const user = state.currentUser;
  const isAdmin = hasPermission('manage:users') || hasPermission('all');

  // Find current camp day or default
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const defaultDay = CAMP_DAYS.find((d) => d.date === todayStr)?.key || 'wed';

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedSession, setSelectedSession] = useState(null);
  const [groupFilter, setGroupFilter] = useState('all');
  const [departureGrouping, setDepartureGrouping] = useState('platoon');

  const daySessions = sessions[selectedDay] || [];

  // Auto-select first session
  const activeSession = selectedSession || (daySessions[0]?.key || null);
  const sessionKey = activeSession ? `${selectedDay}-${activeSession}` : null;

  // Filter campers by role
  const visibleCampers = useMemo(() => {
    let list = state.campers;
    if (!isAdmin) {
      list = list.filter((c) => c.group === user?.group);
    } else if (groupFilter !== 'all') {
      list = list.filter((c) => c.group === groupFilter);
    }
    return list;
  }, [state.campers, user, groupFilter]);

  // Group campers by team or dorm based on Smart Grouping Engine
  const groupedCampers = useMemo(() => {
    const groups = {};
    
    // Determine grouping strategy based on sessionKey
    let strategy = 'platoon';
    if (sessionKey) {
      if (sessionKey === 'wed-arrival') strategy = 'platoon';
      else if (sessionKey === 'sun-departure') strategy = departureGrouping;
      else strategy = 'dorm'; // all other morning / lights_out sessions are by dorm
    }
    
    visibleCampers.forEach((c) => {
      let groupKey = 'Unassigned';
      if (strategy === 'dorm') {
        groupKey = c.dorm?.name || 'Unassigned Dorm';
      } else {
        groupKey = c.platoon?.name || c.group || 'Unassigned Platoon';
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(c);
    });
    return groups;
  }, [visibleCampers, sessionKey, departureGrouping]);

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
        {isAdmin && (
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
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {g.emoji} {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Departure Grouping Toggle */}
        {sessionKey === 'sun-departure' && isAdmin && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-50)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Grouping Strategy:</span>
            <div className="filter-tabs" style={{ margin: 0 }}>
              <button 
                className={`filter-tab ${departureGrouping === 'platoon' ? 'active' : ''}`}
                onClick={() => setDepartureGrouping('platoon')}
              >
                By Platoon
              </button>
              <button 
                className={`filter-tab ${departureGrouping === 'dorm' ? 'active' : ''}`}
                onClick={() => setDepartureGrouping('dorm')}
              >
                By Dorm
              </button>
            </div>
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
          <EmptyState 
            icon={<div style={{ fontSize: '3rem' }}>📋</div>}
            title="Ready for Roll Call"
            description="Select a session above to begin."
          />
        ) : (
          <div style={{ marginTop: 16 }}>
            {Object.entries(groupedCampers).map(([groupId, camperList]) => {
              const group = GROUPS.find((g) => g.id === groupId);
              return (
                <div key={groupId}>
                  <div className="group-header">
                    {group?.emoji || '🛡️'} {group?.name || groupId}
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
                            {camper.medicalNotes && <span className="medical-flag">⚕️</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {sessionKey?.includes('lights_out') || sessionKey?.includes('morning') ? 
                              (camper.bedNumber ? `Bed: ${camper.bedNumber}` : 'No bed assigned') : 
                              (camper.platoon?.name || camper.group)}
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
