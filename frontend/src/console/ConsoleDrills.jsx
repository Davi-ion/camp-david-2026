import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleDrills() {
  const { hasPermission } = usePermissions();
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'General', assignedStaffId: '', date: '', startTime: '', priority: 'medium', instructions: '', checklist: ''
  });
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchDrills();
    fetchStaff();
  }, []);

  const fetchDrills = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/drills`, { headers: { Authorization: `Bearer ${token}` } });
      setDrills(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setStaffList(data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('camp_token');
      const payload = { ...formData, checklist: formData.checklist.split('\n').filter(s => s.trim()) };
      await fetch(`${API}/api/drills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      setShowCreate(false);
      setFormData({ name: '', category: 'General', assignedStaffId: '', date: '', startTime: '', priority: 'medium', instructions: '', checklist: '' });
      fetchDrills();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDrill = async (id) => {
    if (!confirm('Delete this drill?')) return;
    try {
      const token = localStorage.getItem('camp_token');
      await fetch(`${API}/api/drills/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchDrills();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Camp Drills</h1>
          <p className="console-page-subtitle">Manage operational responsibilities and staff assignments.</p>
        </div>
        {hasPermission('manage:users') && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ New Drill'}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="console-card" style={{ marginBottom: 24, padding: 20 }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">Drill Name</label>
                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Category</label>
                <input type="text" className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">Assigned Staff</label>
                <select className="input-field" value={formData.assignedStaffId} onChange={e => setFormData({ ...formData, assignedStaffId: e.target.value })}>
                  <option value="">-- Select Staff --</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Date</label>
                <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Start Time</label>
                <input type="time" className="input-field" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="input-label">Instructions / Notes</label>
              <textarea className="input-field" rows={3} value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })}></textarea>
            </div>

            <div>
              <label className="input-label">Checklist Items (One per line)</label>
              <textarea className="input-field" rows={4} value={formData.checklist} onChange={e => setFormData({ ...formData, checklist: e.target.value })} placeholder="Setup chairs\nTest mic\nWelcome speakers"></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Drill</button>
            </div>
          </form>
        </div>
      )}

      <div className="console-card">
        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Drill Name</th>
                <th>Category</th>
                <th>Assigned To</th>
                <th>Date/Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading...</td></tr>
              ) : drills.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No drills scheduled.</td></tr>
              ) : drills.map(d => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong><div style={{ fontSize: '0.8rem', color: '#666' }}>{d.checklist?.length} checklist items</div></td>
                  <td>{d.category}</td>
                  <td>{d.assignedStaff?.name || 'Unassigned'}</td>
                  <td>{d.date} {d.startTime}</td>
                  <td>
                    <span className={`badge`} style={{ 
                      background: d.status === 'completed' ? '#F0FDF4' : d.status === 'upcoming' ? '#EFF6FF' : '#FFFBEB',
                      color: d.status === 'completed' ? 'var(--teal)' : d.status === 'upcoming' ? 'var(--blue)' : 'var(--amber)'
                     }}>{d.status.toUpperCase()}</span>
                  </td>
                  <td>
                    {hasPermission('manage:users') && (
                      <button className="btn btn-text" style={{ color: 'var(--red)', padding: 4 }} onClick={() => deleteDrill(d.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
