import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleAnnouncements() {
  const { hasPermission } = usePermissions();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', body: '', urgent: false, pinned: false, targetType: 'all' });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const saveAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchAnnouncements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAnn = async (id) => {
    if (!confirm('Delete announcement?')) return;
    try {
      const token = sessionStorage.getItem('camp_token');
      await fetch(`${API}/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAnnouncements();
    } catch (err) {}
  };

  const togglePin = async (ann) => {
    try {
      const token = sessionStorage.getItem('camp_token');
      await fetch(`${API}/api/announcements/${ann.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...ann, pinned: !ann.pinned })
      });
      fetchAnnouncements();
    } catch (err) {}
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Announcements</h1>
          <p className="console-page-subtitle">Broadcast messages to staff and platoon leaders</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {hasPermission('create:announcements') && (
            <button onClick={() => {
              setFormData({ title: '', body: '', urgent: false, pinned: false, targetType: 'all' });
              setModalOpen(true);
            }} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
              + New Announcement
            </button>
          )}
        </div>
      </div>

      <div className="console-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No announcements found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {announcements.map(ann => (
              <div key={ann.id} style={{ padding: 24, borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {ann.urgent && <span className="badge badge-red" style={{ fontSize: '0.625rem' }}>URGENT</span>}
                    {ann.pinned && <span className="badge badge-teal" style={{ fontSize: '0.625rem' }}>📌 PINNED</span>}
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>{ann.title}</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                    {ann.body}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                    <span>By {ann.authorName}</span>
                    <span>{new Date(ann.createdAt).toLocaleString('en-NG')}</span>
                    <span>Target: {ann.targetType.toUpperCase()}</span>
                  </div>
                </div>
                {hasPermission('create:announcements') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => togglePin(ann)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                      {ann.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => deleteAnn(ann.id)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', color: 'var(--red)', borderColor: '#fee2e2', background: '#fef2f2' }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 500, maxWidth: '90%' }}>
            <div className="console-card-header">
              <span className="console-card-title">New Announcement</span>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="console-card-body">
              <form onSubmit={saveAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="input-label">Title *</label>
                  <input required className="input-field" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Message *</label>
                  <textarea required className="input-field" rows="5" value={formData.body} onChange={e => setFormData({ ...formData, body: e.target.value })}></textarea>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={formData.urgent} onChange={e => setFormData({ ...formData, urgent: e.target.checked })} />
                    Mark as Urgent
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={formData.pinned} onChange={e => setFormData({ ...formData, pinned: e.target.checked })} />
                    Pin to Dashboard
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Publish</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
