import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CAMP_DAYS, schedule } from '../data/schedule';
import { sessions as sessionData } from '../data/sessions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleAttendance() {
  const { state } = useApp();
  const [selectedDay, setSelectedDay] = useState(CAMP_DAYS[0].key);
  const [selectedPlatoon, setSelectedPlatoon] = useState('all');
  const [selectedDorm, setSelectedDorm] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedSessionType, setSelectedSessionType] = useState('all');
  
  const [dorms, setDorms] = useState([]);
  const [platoons, setPlatoons] = useState([]);

  useEffect(() => {
    fetchDormsAndPlatoons();
  }, []);

  const fetchDormsAndPlatoons = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const [dRes, pRes] = await Promise.all([
        fetch(`${API}/api/dorms`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/platoons`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (dRes.ok) setDorms(await dRes.json());
      if (pRes.ok) setPlatoons(await pRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const daySessions = sessionData[selectedDay] || schedule[selectedDay] || [];
  
  const displaySessions = useMemo(() => {
    if (selectedSessionType === 'all') return daySessions;
    return daySessions.filter(s => s.key === selectedSessionType);
  }, [daySessions, selectedSessionType]);
  
  const campers = useMemo(() => {
    return state.campers.filter(c => {
      if (selectedPlatoon !== 'all' && c.platoonId !== selectedPlatoon && c.group !== selectedPlatoon) return false;
      if (selectedDorm !== 'all' && c.dormId !== selectedDorm) return false;
      if (selectedGender !== 'all' && c.gender?.toLowerCase() !== selectedGender.toLowerCase()) return false;
      return true;
    });
  }, [state.campers, selectedPlatoon, selectedDorm, selectedGender]);

  const getAttendanceStatus = (camperId, sessionKey) => {
    const fullKey = `${selectedDay}-${sessionKey}`;
    const sessionAtt = state.attendance[fullKey];
    if (!sessionAtt) return null;
    return sessionAtt[camperId]; // 'present', 'late', 'absent', 'excused'
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Attendance Reports</h1>
          <p className="console-page-subtitle">Monitor roll call from operational perspectives</p>
        </div>
        <div>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            🖨️ Print Report
          </button>
        </div>
      </div>

      <div className="console-card hide-on-print" style={{ marginBottom: 24 }}>
        <div className="console-card-header" style={{ padding: '16px 20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600 }}>Report Filters</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Camp Day</label>
              <select 
                value={selectedDay} 
                onChange={e => { setSelectedDay(e.target.value); setSelectedSessionType('all'); }}
                className="input-field" 
                style={{ width: 160, padding: '8px 12px', fontSize: '0.875rem' }}
              >
                {CAMP_DAYS.map(d => (
                  <option key={d.key} value={d.key}>{d.full}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Roll Call Type</label>
              <select 
                value={selectedSessionType} 
                onChange={e => setSelectedSessionType(e.target.value)}
                className="input-field" 
                style={{ width: 180, padding: '8px 12px', fontSize: '0.875rem' }}
              >
                <option value="all">All Day Sessions</option>
                {daySessions.map(s => (
                  <option key={s.key} value={s.key}>{s.label || s.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Platoon</label>
              <select 
                value={selectedPlatoon} 
                onChange={e => setSelectedPlatoon(e.target.value)}
                className="input-field" 
                style={{ width: 160, padding: '8px 12px', fontSize: '0.875rem' }}
              >
                <option value="all">All Platoons</option>
                {platoons.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Dorm</label>
              <select 
                value={selectedDorm} 
                onChange={e => setSelectedDorm(e.target.value)}
                className="input-field" 
                style={{ width: 160, padding: '8px 12px', fontSize: '0.875rem' }}
              >
                <option value="all">All Dorms</option>
                {dorms.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.gender})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Gender</label>
              <select 
                value={selectedGender} 
                onChange={e => setSelectedGender(e.target.value)}
                className="input-field" 
                style={{ width: 120, padding: '8px 12px', fontSize: '0.875rem' }}
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="console-card">
        <div className="console-card-header" style={{ padding: '12px 20px', background: 'var(--bg-light)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 500 }}>Showing {campers.length} campers</div>
        </div>
        <div className="console-table-container">
          <table className="console-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>Camper</th>
                <th style={{ background: 'var(--bg)' }}>Platoon</th>
                <th style={{ background: 'var(--bg)' }}>Dorm</th>
                {displaySessions.map(s => (
                  <th key={s.key} style={{ textAlign: 'center', background: 'var(--bg)' }}>
                    <div style={{ whiteSpace: 'normal', minWidth: 100 }}>{s.label || s.title}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{s.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campers.length === 0 ? (
                <tr>
                  <td colSpan={3 + displaySessions.length} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    No campers match the selected filters.
                  </td>
                </tr>
              ) : campers.map(c => (
                <tr key={c.id}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: '#fff', borderRight: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.registrationNumber || c.id}</div>
                  </td>
                  <td>
                    {c.platoon ? (
                      <span className="badge badge-outline">{c.platoon.emoji} {c.platoon.name}</span>
                    ) : (
                      <span className="badge badge-outline" style={{ color: 'var(--text-muted)' }}>{c.group || '-'}</span>
                    )}
                  </td>
                  <td>
                    {c.dorm ? (
                      <span className="badge" style={{ background: 'var(--bg-light)', color: 'var(--text)' }}>
                        {c.dorm.name} {c.bedNumber ? `(${c.bedNumber})` : ''}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  {displaySessions.map(s => {
                    const status = getAttendanceStatus(c.id, s.key);
                    return (
                      <td key={s.key} style={{ textAlign: 'center' }}>
                        {!status ? <span style={{ color: 'var(--text-muted)' }}>-</span> :
                         status === 'present' ? <span style={{ color: 'var(--teal)' }}>✓</span> :
                         status === 'late' ? <span style={{ color: 'var(--amber)' }}>L</span> :
                         status === 'excused' ? <span style={{ color: 'var(--indigo)' }}>~</span> :
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
