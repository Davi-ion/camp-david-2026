import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
}

export default function ConsolePlatoons() {
  const { hasPermission } = usePermissions();

  const [platoons, setPlatoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatoon, setSelectedPlatoon] = useState(null);

  const fetchPlatoons = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/platoons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPlatoons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatoons();
  }, []);

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Platoons</h1>
          <p className="console-page-subtitle">Manage camp groups, assigned leaders and campers</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {hasPermission('manage:users') && (
            <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
              + New Platoon
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading platoons...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {platoons.map(p => {
            const medCount = p.campers?.filter(c => c.medicalNotes).length || 0;
            return (
              <div key={p.id} className="console-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: p.colorHex || 'var(--teal)', height: 8 }}></div>
                <div className="console-card-header" style={{ padding: '20px 24px', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.5rem' }}>{p.emoji}</span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{p.name}</h2>
                    </div>
                    {p.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>{p.description}</p>}
                  </div>
                  <button onClick={() => setSelectedPlatoon(p)} className="btn btn-text" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>Open Platoon</button>
                </div>
                
                <div className="console-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.leader ? p.colorHex : '#D1D5DB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                      {getInitials(p.leader?.name || 'Unassigned')}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Platoon Leader</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{p.leader?.name || 'No leader assigned'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Campers</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>{p.campers?.length || 0}</div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Staff Assigned</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>{p.staff?.length || 0}</div>
                    </div>
                  </div>

                  {medCount > 0 && (
                    <div style={{ marginTop: 'auto', padding: '8px 12px', background: '#FFF7ED', color: 'var(--orange)', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⚕️</span> {medCount} camper{medCount !== 1 ? 's' : ''} with medical alerts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlatoon && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 800, maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="console-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: selectedPlatoon.colorHex + '10', borderBottom: `2px solid ${selectedPlatoon.colorHex}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '2rem' }}>{selectedPlatoon.emoji}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{selectedPlatoon.name} Platoon</h2>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Leader: {selectedPlatoon.leader?.name || 'Unassigned'} | Counsellors: {selectedPlatoon.staff?.filter(s => s.roleName === 'Counsellor').length || 0}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPlatoon(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-muted)' }}>✕</button>
            </div>
            
            <div className="console-card-body" style={{ overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Campers</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedPlatoon.campers?.length || 0}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Medical Alerts</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--orange)' }}>{selectedPlatoon.campers?.filter(c => c.medicalNotes).length || 0}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dietary Reqs</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedPlatoon.campers?.filter(c => c.dietaryRestrictions).length || 0}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open Incidents</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--red)' }}>0</div>
                </div>
              </div>

              <h3 style={{ fontSize: '1.125rem', marginBottom: 12 }}>Camper List</h3>
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Reg #</th>
                    <th>Name</th>
                    <th>Age / Gender</th>
                    <th>Medical Notes</th>
                    <th>Assigned Counsellor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlatoon.campers?.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{c.registrationNumber}</td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{c.age} {c.gender?.charAt(0)}</td>
                      <td>
                        {c.medicalNotes ? <span className="badge badge-orange" title={c.medicalNotes}>Alert</span> : '-'}
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {selectedPlatoon.staff?.find(s => s.id === c.counsellorId)?.name || 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                  {(!selectedPlatoon.campers || selectedPlatoon.campers.length === 0) && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>No campers assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
