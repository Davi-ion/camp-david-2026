import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleDorms() {
  const { state } = useApp();
  const [dorms, setDorms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedDorm, setSelectedDorm] = useState(null);
  const [dormCampers, setDormCampers] = useState([]);
  
  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [supervisorsModalOpen, setSupervisorsModalOpen] = useState(false);
  
  const [availableCampers, setAvailableCampers] = useState([]);
  const [selectedCamperIds, setSelectedCamperIds] = useState(new Set());
  
  const [camperToMove, setCamperToMove] = useState(null);
  const [newDormId, setNewDormId] = useState('');
  
  const [staff, setStaff] = useState([]);
  const [supervisorIds, setSupervisorIds] = useState({ supervisorId: '', assistantSupervisorId: '' });

  useEffect(() => {
    fetchDorms();
    fetchStaff();
  }, []);

  const fetchDorms = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/dorms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dorms');
      const data = await res.json();
      setDorms(data);
      if (selectedDorm) {
        setSelectedDorm(data.find(d => d.id === selectedDorm.id) || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStaff = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStaff(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadDormCampers = async (dormId) => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/dorms/${dormId}/campers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch campers');
      const data = await res.json();
      setDormCampers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDorm = (dorm) => {
    setSelectedDorm(dorm);
    setDormCampers([]);
    loadDormCampers(dorm.id);
  };

  const printRoster = () => {
    window.print();
  };
  
  // --- Assignment Logic ---
  const openAssignModal = async () => {
    setSelectedCamperIds(new Set());
    setAssignModalOpen(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      // Fetch campers to find available ones matching gender
      const res = await fetch(`${API}/api/campers?limit=1000&status=active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // filter by gender and not already in this dorm
        const available = data.campers.filter(c => 
          c.gender?.toLowerCase() === selectedDorm.gender.toLowerCase() && 
          c.dormId !== selectedDorm.id
        );
        setAvailableCampers(available);
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const toggleCamperSelection = (id) => {
    const newSet = new Set(selectedCamperIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCamperIds(newSet);
  };
  
  const submitAssignments = async () => {
    if (selectedCamperIds.size === 0) return setAssignModalOpen(false);
    try {
      const token = sessionStorage.getItem('camp_token');
      for (let id of selectedCamperIds) {
        await fetch(`${API}/api/campers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dormId: selectedDorm.id })
        });
      }
      setAssignModalOpen(false);
      fetchDorms();
      loadDormCampers(selectedDorm.id);
    } catch (err) {
      console.error(err);
      alert('Failed to assign campers');
    }
  };
  
  // --- Remove Logic ---
  const removeCamper = async (camperId) => {
    if (!confirm('Are you sure you want to remove this camper from the dorm?')) return;
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/campers/${camperId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dormId: null })
      });
      if (res.ok) {
        fetchDorms();
        loadDormCampers(selectedDorm.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove camper');
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  // --- Move Logic ---
  const openMoveModal = (camper) => {
    setCamperToMove(camper);
    setNewDormId('');
    setMoveModalOpen(true);
  };
  
  const submitMove = async () => {
    if (!newDormId) return;
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/campers/${camperToMove.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dormId: newDormId })
      });
      if (res.ok) {
        setMoveModalOpen(false);
        fetchDorms();
        loadDormCampers(selectedDorm.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to move camper');
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  // --- Supervisors Logic ---
  const openSupervisorsModal = () => {
    setSupervisorIds({
      supervisorId: selectedDorm.supervisorId || '',
      assistantSupervisorId: selectedDorm.assistantSupervisorId || ''
    });
    setSupervisorsModalOpen(true);
  };
  
  const submitSupervisors = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/dorms/${selectedDorm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          supervisorId: supervisorIds.supervisorId || null,
          assistantSupervisorId: supervisorIds.assistantSupervisorId || null
        })
      });
      if (res.ok) {
        setSupervisorsModalOpen(false);
        fetchDorms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="console-page">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Dorm Management</h1>
          <p className="console-page-desc">Manage accommodation, capacity, and assignments.</p>
        </div>
      </div>
      
      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="console-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {dorms.map(dorm => {
          const isFull = dorm.occupancy >= dorm.capacity;
          const percentage = Math.round((dorm.occupancy / dorm.capacity) * 100) || 0;
          const remaining = dorm.capacity - dorm.occupancy;
          
          return (
            <div 
              key={dorm.id} 
              className={`console-card ${selectedDorm?.id === dorm.id ? 'active' : ''}`}
              style={{ cursor: 'pointer', border: selectedDorm?.id === dorm.id ? '2px solid var(--teal)' : undefined }}
              onClick={() => handleSelectDorm(dorm)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{dorm.name}</h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {dorm.gender} Dormitory
                  </div>
                </div>
                <span className={`badge ${dorm.gender === 'female' ? 'badge-amber' : 'badge-teal'}`}>
                  {dorm.gender}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <div style={{ fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Supervisor:</span>{' '}
                  <span style={{ fontWeight: 500 }}>{dorm.supervisor?.name || 'Unassigned'}</span>
                </div>
                <div style={{ fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Assistant:</span>{' '}
                  <span style={{ fontWeight: 500 }}>{dorm.assistantSupervisor?.name || 'Unassigned'}</span>
                </div>
              </div>
              
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {remaining > 0 ? `${remaining} beds remaining` : 'Full'}
                </span>
                <span style={{ fontWeight: 500, color: isFull ? 'var(--red)' : 'var(--text)' }}>
                  {percentage}% ({dorm.occupancy} / {dorm.capacity})
                </span>
              </div>
              
              <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(percentage, 100)}%`, height: '100%', background: isFull ? 'var(--red)' : 'var(--teal)' }} />
              </div>
            </div>
          );
        })}
      </div>

      {selectedDorm && (
        <div className="console-card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
              {selectedDorm.name} Roster
            </h2>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={openSupervisorsModal}>
                👤 Assign Supervisors
              </button>
              <button className="btn btn-primary btn-sm" onClick={openAssignModal}>
                + Assign Campers
              </button>
              <button className="btn btn-secondary btn-sm" onClick={printRoster}>
                🖨️ Print
              </button>
            </div>
          </div>

          {dormCampers.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No campers assigned to this dorm yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Camper</th>
                    <th>Bed Number</th>
                    <th>Platoon</th>
                    <th>Medical Notes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dormCampers.map(camper => (
                    <tr key={camper.id}>
                      <td style={{ fontWeight: 500 }}>
                        {camper.name}
                      </td>
                      <td>{camper.bedNumber || '-'}</td>
                      <td>
                        {camper.platoon ? (
                          <span className="badge badge-outline">
                            {camper.platoon.emoji} {camper.platoon.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {camper.medicalNotes ? (
                          <span style={{ color: 'var(--amber)', fontSize: '0.875rem' }}>⚕️ {camper.medicalNotes}</span>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-text" style={{ fontSize: '0.8125rem', padding: '4px 8px' }} onClick={() => openMoveModal(camper)}>Move</button>
                        <button className="btn btn-text" style={{ fontSize: '0.8125rem', padding: '4px 8px', color: 'var(--red)' }} onClick={() => removeCamper(camper.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 500, maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="console-card-header">
              <span className="console-card-title">Assign Campers to {selectedDorm.name}</span>
              <button onClick={() => setAssignModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="console-card-body" style={{ overflowY: 'auto', flex: 1 }}>
              {availableCampers.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No available {selectedDorm.gender} campers found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {availableCampers.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--bg-light)', borderRadius: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedCamperIds.has(c.id)} onChange={() => toggleCamperSelection(c.id)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Currently: {c.dorm?.name || 'Unassigned'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setAssignModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={submitAssignments} className="btn btn-primary">Assign {selectedCamperIds.size} Campers</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Move Modal */}
      {moveModalOpen && camperToMove && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 400, maxWidth: '90%' }}>
            <div className="console-card-header">
              <span className="console-card-title">Move {camperToMove.name}</span>
              <button onClick={() => setMoveModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="console-card-body">
              <label className="input-label">Select New Dorm</label>
              <select className="input-field" value={newDormId} onChange={e => setNewDormId(e.target.value)}>
                <option value="">Select...</option>
                {dorms
                  .filter(d => d.gender.toLowerCase() === selectedDorm.gender.toLowerCase() && d.id !== selectedDorm.id)
                  .map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.occupancy}/{d.capacity})</option>
                  ))
                }
              </select>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button onClick={() => setMoveModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={submitMove} disabled={!newDormId} className="btn btn-primary">Move Camper</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Supervisors Modal */}
      {supervisorsModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 450, maxWidth: '90%' }}>
            <div className="console-card-header">
              <span className="console-card-title">Assign Supervisors for {selectedDorm.name}</span>
              <button onClick={() => setSupervisorsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="console-card-body">
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Dorm Supervisor</label>
                <select className="input-field" value={supervisorIds.supervisorId} onChange={e => setSupervisorIds({ ...supervisorIds, supervisorId: e.target.value })}>
                  <option value="">None</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              
              <div>
                <label className="input-label">Assistant Supervisor</label>
                <select className="input-field" value={supervisorIds.assistantSupervisorId} onChange={e => setSupervisorIds({ ...supervisorIds, assistantSupervisorId: e.target.value })}>
                  <option value="">None</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button onClick={() => setSupervisorsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={submitSupervisors} className="btn btn-primary">Save Supervisors</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
