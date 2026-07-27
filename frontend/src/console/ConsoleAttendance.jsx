import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CAMP_DAYS, schedule } from '../data/schedule';

export default function ConsoleAttendance() {
  const { state } = useApp();
  const [selectedDay, setSelectedDay] = useState(CAMP_DAYS[0].key);
  const [selectedPlatoon, setSelectedPlatoon] = useState('all');

  const daySessions = schedule[selectedDay] || [];
  
  // Create a grid of attendance
  // Rows: Campers
  // Cols: Sessions for the day
  
  const campers = useMemo(() => {
    if (selectedPlatoon === 'all') return state.campers;
    return state.campers.filter(c => c.platoonId === selectedPlatoon || c.group === selectedPlatoon);
  }, [state.campers, selectedPlatoon]);

  const platoons = Array.from(new Set(state.campers.map(c => c.platoonId || c.group).filter(Boolean)));

  const getAttendanceStatus = (camperId, sessionKey) => {
    const fullKey = `${selectedDay}-${sessionKey}`;
    const sessionAtt = state.attendance[fullKey];
    if (!sessionAtt) return null;
    return sessionAtt[camperId]; // 'present', 'late', 'absent', etc
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Attendance Overview</h1>
          <p className="console-page-subtitle">Track camper attendance across all sessions</p>
        </div>
      </div>

      <div className="console-card">
        <div className="console-card-header" style={{ padding: '12px 20px', display: 'flex', gap: 16 }}>
          <select 
            value={selectedDay} 
            onChange={e => setSelectedDay(e.target.value)}
            className="input-field" 
            style={{ width: 200, padding: '8px 12px', fontSize: '0.875rem' }}
          >
            {CAMP_DAYS.map(d => (
              <option key={d.key} value={d.key}>{d.full}</option>
            ))}
          </select>
          
          <select 
            value={selectedPlatoon} 
            onChange={e => setSelectedPlatoon(e.target.value)}
            className="input-field" 
            style={{ width: 160, padding: '8px 12px', fontSize: '0.875rem' }}
          >
            <option value="all">All Platoons</option>
            {platoons.map(p => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="console-table-container">
          <table className="console-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>Camper</th>
                {daySessions.map(s => (
                  <th key={s.key} style={{ textAlign: 'center' }}>
                    <div style={{ whiteSpace: 'normal', minWidth: 100 }}>{s.title}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{s.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campers.map(c => (
                <tr key={c.id}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: '#fff', borderRight: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.registrationNumber || c.id}</div>
                  </td>
                  {daySessions.map(s => {
                    const status = getAttendanceStatus(c.id, s.key);
                    return (
                      <td key={s.key} style={{ textAlign: 'center' }}>
                        {!status ? <span style={{ color: 'var(--text-muted)' }}>-</span> :
                         status === 'present' ? <span style={{ color: 'var(--teal)' }}>✓</span> :
                         status === 'late' ? <span style={{ color: 'var(--amber)' }}>L</span> :
                         <span style={{ color: 'var(--red)' }}>✗</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
