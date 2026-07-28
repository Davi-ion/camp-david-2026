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

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamper, setEditingCamper] = useState(null);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    name: '', dateOfBirth: '', gender: '', platoonId: '',
    medicalNotes: '', allergies: '', guardianName: '', guardianPhone: '',
    dormId: '', bedNumber: '', dormNotes: ''
  });

  const [dorms, setDorms] = useState([]);
  const [platoons, setPlatoons] = useState([]);

  const fetchCampers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('camp_token');
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
    fetchDormsAndPlatoons();
  }, [page, status]);

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
        dormId: camper.dormId || '',
        bedNumber: camper.bedNumber || '',
        dormNotes: camper.dormNotes || '',
        medicalNotes: camper.medicalNotes || '',
        allergies: camper.allergies || '',
        guardianName: camper.guardianName || '',
        guardianPhone: camper.guardianPhone || ''
      });
    } else {
      setFormData({
        name: '', dateOfBirth: '', gender: '', platoonId: '',
        dormId: '', bedNumber: '', dormNotes: '',
        medicalNotes: '', allergies: '', guardianName: '', guardianPhone: ''
      });
    }
    setModalOpen(true);
  };

  const saveCamper = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      const token = localStorage.getItem('camp_token');
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
      } else {
        const data = await res.json();
        setModalError(data.error || 'Failed to save camper');
      }
    } catch (err) {
      console.error(err);
      setModalError('An unexpected error occurred.');
    }
  };

  const deactivateCamper = async (id) => {
    if (!confirm('Are you sure you want to deactivate this camper?')) return;
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/campers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCampers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/bulk/export/campers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'campers_export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export campers');
    }
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(campers.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
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
          <button onClick={handleExport} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            ⬇️ Export
          </button>
          <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            + Add Camper
          </button>
        </div>
      </div>

      <div className="console-card">
        <div className="console-card-header" style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'center', minWidth: 300 }}>
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

          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-light)', padding: '6px 12px', borderRadius: 6 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{selectedIds.size} selected</span>
              <select className="input-field" style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto' }} value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                <option value="">Bulk Action...</option>
                <option value="assign-platoon">Assign Platoon</option>
                <option value="deactivate">Deactivate</option>
              </select>
              <button disabled={!bulkAction} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Apply</button>
            </div>
          )}
        </div>

        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" onChange={toggleAll} checked={campers.length > 0 && selectedIds.size === campers.length} /></th>
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
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading...</td></tr>
              ) : campers.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>No campers found.</td></tr>
              ) : campers.map(c => (
                <tr key={c.id} style={{ background: selectedIds.has(c.id) ? 'var(--bg-light)' : 'transparent' }}>
                  <td><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelection(c.id)} /></td>
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
              {modalError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{modalError}</div>}
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
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Platoon</label>
                    <select className="input-field" value={formData.platoonId} onChange={e => setFormData({ ...formData, platoonId: e.target.value })}>
                      <option value="">None</option>
                      {platoons.map(p => (
                        <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Dorm</label>
                    <select className="input-field" value={formData.dormId} onChange={e => setFormData({ ...formData, dormId: e.target.value })}>
                      <option value="">None</option>
                      {dorms.filter(d => !formData.gender || d.gender.toLowerCase() === formData.gender.toLowerCase()).map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.gender})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Bed Number</label>
                    <input className="input-field" value={formData.bedNumber} onChange={e => setFormData({ ...formData, bedNumber: e.target.value })} placeholder="e.g. 12A" />
                  </div>
                  <div>
                    <label className="input-label">Dorm Notes</label>
                    <input className="input-field" value={formData.dormNotes} onChange={e => setFormData({ ...formData, dormNotes: e.target.value })} placeholder="Special accommodation requirements" />
                  </div>
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
