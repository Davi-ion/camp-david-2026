import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleCampers() {
  const { state } = useApp();
  const [campers, setCampers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const limit = 50;

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamper, setEditingCamper] = useState(null);
  const [formData, setFormData] = useState({
    name: '', dateOfBirth: '', gender: '', platoonId: '',
    medicalNotes: '', allergies: '', guardianName: '', guardianPhone: ''
  });

  const fetchCampers = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      const q = new URLSearchParams({ page, limit, status });
      if (search) q.append('search', search);
      const res = await fetch(`${API}/api/campers?${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCampers(data.campers);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampers();
  }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCampers();
  };

  const openModal = (camper = null) => {
    setEditingCamper(camper);
    if (camper) {
      setFormData({
        name: camper.name,
        dateOfBirth: camper.dateOfBirth || '',
        gender: camper.gender || '',
        platoonId: camper.platoonId || '',
        medicalNotes: camper.medicalNotes || '',
        allergies: camper.allergies || '',
        guardianName: camper.guardianName || '',
        guardianPhone: camper.guardianPhone || ''
      });
    } else {
      setFormData({
        name: '', dateOfBirth: '', gender: '', platoonId: '',
        medicalNotes: '', allergies: '', guardianName: '', guardianPhone: ''
      });
    }
    setModalOpen(true);
  };

  const saveCamper = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('camp_token');
      const url = editingCamper ? `${API}/api/campers/${editingCamper.id}` : `${API}/api/campers`;
      const method = editingCamper ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchCampers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deactivateCamper = async (id) => {
    if (!confirm('Are you sure you want to deactivate this camper?')) return;
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/campers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCampers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Campers</h1>
          <p className="console-page-subtitle">Manage all registered campers ({total} total)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            + Add Camper
          </button>
        </div>
      </div>

      <div className="console-card">
        <div className="console-card-header" style={{ padding: '12px 20px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search by name, reg #, or guardian..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field" 
              style={{ maxWidth: 320, padding: '8px 12px', fontSize: '0.875rem' }}
            />
            <select 
              value={status} 
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="input-field" 
              style={{ width: 140, padding: '8px 12px', fontSize: '0.875rem' }}
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Statuses</option>
            </select>
            <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Search</button>
          </form>
        </div>

        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Name</th>
                <th>Platoon</th>
                <th>Medical Alerts</th>
                <th>Guardian Info</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Loading...</td></tr>
              ) : campers.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>No campers found.</td></tr>
              ) : campers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.registrationNumber}</td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                    {c.age && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.age} years old</div>}
                  </td>
                  <td>
                    {c.platoon ? (
                      <span className="badge" style={{ background: c.platoon.colorHex + '20', color: c.platoon.colorHex }}>
                        {c.platoon.emoji} {c.platoon.name}
                      </span>
                    ) : <span className="badge">Unassigned</span>}
                  </td>
                  <td>
                    {c.medicalNotes ? (
                      <span className="badge badge-orange">Has Medical Notes</span>
                    ) : '-'}
                  </td>
                  <td>
                    {c.guardianName ? (
                      <div>
                        <div style={{ fontSize: '0.8125rem' }}>{c.guardianName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.guardianPhone}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-teal' : 'badge-red'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => openModal(c)} className="btn btn-text" style={{ fontSize: '0.8125rem', padding: '4px 8px' }}>Edit</button>
                    {c.status === 'active' && (
                      <button onClick={() => deactivateCamper(c.id)} className="btn btn-text" style={{ fontSize: '0.8125rem', padding: '4px 8px', color: 'var(--red)' }}>Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing {campers.length} of {total} campers
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="btn btn-secondary" 
              style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
            >
              Previous
            </button>
            <button 
              disabled={campers.length < limit} 
              onClick={() => setPage(p => p + 1)}
              className="btn btn-secondary" 
              style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 500, maxWidth: '90%' }}>
            <div className="console-card-header">
              <span className="console-card-title">{editingCamper ? 'Edit Camper' : 'Add Camper'}</span>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="console-card-body">
              <form onSubmit={saveCamper} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="input-label">Full Name *</label>
                  <input required className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Date of Birth</label>
                    <input type="date" className="input-field" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                  </div>
                  <div>
                    <label className="input-label">Gender</label>
                    <select className="input-field" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                
                {/* We would fetch platoons here, but for simplicity we can just hardcode the 4 or fetch them. Let's assume we need to type the ID or select it. For a proper UI we'd fetch platoons. */}
                <div>
                  <label className="input-label">Platoon (ID or Key for now)</label>
                  <input className="input-field" placeholder="e.g. p-eagles" value={formData.platoonId} onChange={e => setFormData({ ...formData, platoonId: e.target.value })} />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <label className="input-label">Medical Notes</label>
                  <textarea className="input-field" rows="2" value={formData.medicalNotes} onChange={e => setFormData({ ...formData, medicalNotes: e.target.value })}></textarea>
                </div>
                
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Guardian Name</label>
                    <input className="input-field" value={formData.guardianName} onChange={e => setFormData({ ...formData, guardianName: e.target.value })} />
                  </div>
                  <div>
                    <label className="input-label">Guardian Phone</label>
                    <input className="input-field" value={formData.guardianPhone} onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingCamper ? 'Save Changes' : 'Add Camper'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
