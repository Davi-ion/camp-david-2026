import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CATEGORIES = [
  'General', 'Programme', 'Camp Drill', 'Attendance', 'Medical', 'Security', 
  'Meals', 'Transport', 'Emergency', 'Competition', 'Worship', 'Other'
];

export default function ConsoleAnnouncements() {
  const { hasPermission } = usePermissions();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', body: '', category: 'General', priority: 'normal', 
    status: 'published', isEmergency: false, pinned: false, 
    targetType: 'all', targetId: '', scheduledAt: '', expiryDate: ''
  });

  const [stats, setStats] = useState({});

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnnouncements(data);
      
      // Fetch stats for published/emergency
      data.forEach(ann => {
        if (ann.status === 'published') {
          fetchStats(ann.id);
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (id) => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/announcements/${id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...prev, [id]: data }));
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const saveAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('camp_token');
      
      let payload = { ...formData };
      if (payload.isEmergency) {
        payload.priority = 'critical';
        payload.pinned = true;
      }

      const url = payload.id ? `${API}/api/announcements/${payload.id}` : `${API}/api/announcements`;
      const method = payload.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
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
          <h1 className="console-page-title">Announcements & Push Notifications</h1>
          <p className="console-page-subtitle">Broadcast messages, emergency alerts, and view delivery statistics.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {hasPermission('create:announcements') && (
            <button onClick={() => {
              setFormData({ 
                title: '', body: '', category: 'General', priority: 'normal', 
                status: 'published', isEmergency: false, pinned: false, 
                targetType: 'all', targetId: '', scheduledAt: '', expiryDate: '' 
              });
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
                    {ann.isEmergency && <span className="badge badge-red" style={{ fontSize: '0.625rem', animation: 'pulse 2s infinite' }}>🚨 EMERGENCY</span>}
                    {ann.pinned && <span className="badge badge-teal" style={{ fontSize: '0.625rem' }}>📌 PINNED</span>}
                    <span className="badge" style={{ fontSize: '0.625rem', background: '#eee' }}>{ann.status.toUpperCase()}</span>
                    <span className="badge" style={{ fontSize: '0.625rem', background: '#e0e7ff', color: '#3730a3' }}>{ann.category}</span>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>{ann.title}</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                    {ann.body}
                  </p>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <span>👤 {ann.authorName}</span>
                    <span>📅 {new Date(ann.createdAt).toLocaleString('en-NG')}</span>
                    <span>🎯 Target: {ann.targetType.toUpperCase()} {ann.targetId ? `(${ann.targetId})` : ''}</span>
                    {ann.scheduledAt && <span>⏳ Scheduled: {new Date(ann.scheduledAt).toLocaleString()}</span>}
                    {ann.expiryDate && <span>⌛ Expires: {new Date(ann.expiryDate).toLocaleString()}</span>}
                  </div>

                  {ann.status === 'published' && stats[ann.id] && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text)' }}>{stats[ann.id].totalRecipients}</div>
                        Total Recipients
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--teal)' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{stats[ann.id].readCount}</div>
                        Opened
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--amber)' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{stats[ann.id].unreadCount}</div>
                        Unread
                      </div>
                    </div>
                  )}

                </div>
                {hasPermission('create:announcements') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => { setFormData(ann); setModalOpen(true); }} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                      Edit
                    </button>
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
          <div className="console-card" style={{ width: 600, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="console-card-header">
              <span className="console-card-title">{formData.id ? 'Edit Announcement' : 'New Announcement'}</span>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            <div className="console-card-body">
              <form onSubmit={saveAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                <div>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={formData.isEmergency} onChange={e => setFormData({ ...formData, isEmergency: e.target.checked })} />
                    🚨 Emergency Announcement (Overrides Priority and Pinning)
                  </label>
                </div>

                <div>
                  <label className="input-label">Title *</label>
                  <input required className="input-field" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                
                <div>
                  <label className="input-label">Message *</label>
                  <textarea required rows="4" className="input-field" value={formData.body} onChange={e => setFormData({ ...formData, body: e.target.value })}></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Category</label>
                    <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Priority</label>
                    <select disabled={formData.isEmergency} className="input-field" value={formData.isEmergency ? 'critical' : formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Status</label>
                    <select className="input-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="draft">Save as Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Publish Immediately</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Target Audience</label>
                    <select className="input-field" value={formData.targetType} onChange={e => setFormData({ ...formData, targetType: e.target.value })}>
                      <option value="all">Entire Camp</option>
                      <option value="staff">All Staff</option>
                      <option value="platoon">Specific Platoon</option>
                      <option value="department">Specific Department</option>
                      <option value="role">Specific Role</option>
                      <option value="individual">Specific Individual</option>
                    </select>
                  </div>
                </div>

                {['platoon', 'department', 'role', 'individual'].includes(formData.targetType) && (
                  <div>
                    <label className="input-label">Target ID (e.g. platoonId, Dept Name)</label>
                    <input required className="input-field" value={formData.targetId || ''} onChange={e => setFormData({ ...formData, targetId: e.target.value })} />
                  </div>
                )}

                {formData.status === 'scheduled' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="input-label">Publish Date/Time</label>
                      <input type="datetime-local" className="input-field" value={formData.scheduledAt ? formData.scheduledAt.substring(0, 16) : ''} onChange={e => setFormData({ ...formData, scheduledAt: new Date(e.target.value).toISOString() })} required />
                    </div>
                  </div>
                )}

                <div>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input disabled={formData.isEmergency} type="checkbox" checked={formData.isEmergency ? true : formData.pinned} onChange={e => setFormData({ ...formData, pinned: e.target.checked })} />
                    Pin to Dashboard
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                    {formData.status === 'published' ? 'Publish Now' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
