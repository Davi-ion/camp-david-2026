import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const INCIDENT_TYPES = [
  { id: 'medical', label: 'Medical', emoji: '⚕️', color: 'var(--red)' },
  { id: 'behavioural', label: 'Behavioural', emoji: '⚠️', color: 'var(--amber)' },
  { id: 'security', label: 'Security', emoji: '🛡️', color: 'var(--blue)' },
  { id: 'safety', label: 'Safety', emoji: '🚨', color: 'var(--orange)' },
  { id: 'lost_property', label: 'Lost Property', emoji: '🔍', color: 'var(--text-muted)' },
  { id: 'other', label: 'Other', emoji: '📝', color: 'var(--text)' },
];

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
];

export default function ConsoleIncidents() {
  const { hasPermission } = usePermissions();

  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('camp_token');
      const q = new URLSearchParams({ page, limit });
      if (statusFilter !== 'all') q.append('status', statusFilter);
      if (categoryFilter) q.append('category', categoryFilter);
      if (search) q.append('search', search);

      const res = await fetch(`${API}/api/incidents?${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIncidents(data.incidents || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, statusFilter, categoryFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const updateIncidentStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/incidents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchIncidents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Incidents</h1>
          <p className="console-page-subtitle">All reported incidents across the camp ({total} total)</p>
        </div>
      </div>

      <div className="console-card">
        <div className="console-card-header" style={{ padding: '12px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search by title or description..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field" 
              style={{ maxWidth: 320, padding: '8px 12px', fontSize: '0.875rem' }}
            />
            <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Search</button>
          </form>

          <div style={{ display: 'flex', gap: 8 }}>
            <select 
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="input-field" 
              style={{ padding: '8px 12px', fontSize: '0.875rem' }}
            >
              <option value="">All Categories</option>
              {INCIDENT_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            
            <select 
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field" 
              style={{ padding: '8px 12px', fontSize: '0.875rem' }}
            >
              {STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Title / Camper</th>
                <th>Type / Severity</th>
                <th>Description</th>
                <th>Status</th>
                <th>Reported By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading...</td></tr>
              ) : incidents.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No incidents found.</td></tr>
              ) : incidents.map(inc => {
                const type = INCIDENT_TYPES.find(t => t.id === inc.category) || INCIDENT_TYPES[5];
                const time = new Date(inc.reportedAt);

                return (
                  <tr key={inc.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{inc.title}</div>
                      {inc.camper && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Camper: {inc.camper.name} ({inc.camper.registrationNumber})
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <span className="badge" style={{ background: '#f4f4f5', color: 'var(--text)' }}>
                          {type?.emoji} {type?.label}
                        </span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <span className={`badge ${inc.severity === 'high' || inc.severity === 'critical' ? 'badge-red' : inc.severity === 'medium' ? 'badge-amber' : 'badge-teal'}`}>
                          {inc.severity.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {inc.description}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${inc.status === 'resolved' || inc.status === 'closed' ? 'badge-teal' : inc.status === 'open' ? 'badge-red' : 'badge-amber'}`}>
                        {inc.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{inc.reportedBy?.name || 'System'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {time.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} {time.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </td>
                    <td>
                      {(inc.status !== 'resolved' && inc.status !== 'closed') && hasPermission('resolve:incidents') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {inc.status === 'open' && (
                            <button
                              onClick={() => updateIncidentStatus(inc.id, 'in_progress')}
                              style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
                            >
                              In Progress
                            </button>
                          )}
                          <button
                            onClick={() => updateIncidentStatus(inc.id, 'resolved')}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, border: 'none', borderRadius: 4, background: 'var(--teal)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
                          >
                            ✓ Resolve
                          </button>
                        </div>
                      )}
                      {(inc.status === 'resolved' || inc.status === 'closed') && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inc.status === 'closed' ? 'Closed' : 'Resolved'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing {incidents.length} of {total}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8125rem' }}>Prev</button>
            <button disabled={incidents.length < limit} onClick={() => setPage(p => p + 1)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8125rem' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
