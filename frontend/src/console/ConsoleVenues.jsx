import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleVenues() {
  const { hasPermission } = usePermissions();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', capacity: '', location: '', equipment: '' });

  const fetchVenues = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/schedule/venues`, { headers: { Authorization: `Bearer ${token}` } });
      setVenues(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('camp_token');
      await fetch(`${API}/api/schedule/venues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity) || 0
        })
      });
      setShowModal(false);
      setFormData({ name: '', capacity: '', location: '', equipment: '' });
      fetchVenues();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Venues</h1>
          <p className="console-page-subtitle">Manage camp locations and capacities</p>
        </div>
        {hasPermission('edit:schedule') && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            + Add Venue
          </button>
        )}
      </div>

      <div className="console-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading venues...</div>
        ) : (
          <div className="console-table-container">
            <table className="console-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Equipment</th>
                </tr>
              </thead>
              <tbody>
                {venues.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text)' }}>{v.name}</td>
                    <td>{v.location}</td>
                    <td>{v.capacity}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{v.equipment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 400, maxWidth: '95%', padding: 24 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Add Venue</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>Name</label>
                <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>Location</label>
                <input type="text" className="input" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>Capacity</label>
                <input type="number" className="input" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>Equipment</label>
                <input type="text" className="input" value={formData.equipment} onChange={e => setFormData({...formData, equipment: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
