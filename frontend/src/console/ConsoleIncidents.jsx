/**
 * Console Incidents — wraps the existing Incidents page in the console layout.
 * The data and logic are 100% shared with the Staff Portal.
 */
import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { GROUPS } from '../data/campers';

const INCIDENT_TYPES = [
  { id: 'medical', label: 'Medical', emoji: '🔴', color: 'var(--red)' },
  { id: 'behavioural', label: 'Behavioural', emoji: '🟡', color: 'var(--amber)' },
  { id: 'welfare', label: 'Welfare', emoji: '🔵', color: 'var(--blue)' },
];

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

export default function ConsoleIncidents() {
  const { state, dispatch } = useApp();
  const { hasPermission } = usePermissions();
  const user = state.currentUser;

  const [statusFilter, setStatusFilter] = useState('all');

  const visibleIncidents = useMemo(() => {
    let list = state.incidents;
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    return list;
  }, [state.incidents, statusFilter]);

  const handleStatusChange = (incidentId, newStatus) => {
    dispatch({ type: 'UPDATE_INCIDENT_STATUS', payload: { id: incidentId, status: newStatus } });
  };

  return (
    <div>
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Incidents</h1>
          <p className="console-page-subtitle">All reported incidents across the camp</p>
        </div>
      </div>

      {/* Status Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUSES.map(s => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: statusFilter === s.id ? 'var(--text)' : '#fff',
              color: statusFilter === s.id ? '#fff' : 'var(--text)',
              transition: 'all 0.15s ease',
            }}
          >
            {s.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.8125rem', alignSelf: 'center' }}>
          {visibleIncidents.length} incident{visibleIncidents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="console-card">
        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Camper</th>
                <th>Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Reported</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleIncidents.map(inc => {
                const camper = state.campers.find(c => c.id === inc.camperId);
                const group = GROUPS.find(g => g.id === camper?.group);
                const type = INCIDENT_TYPES.find(t => t.id === inc.type);
                const time = new Date(inc.reportedAt);

                return (
                  <tr key={inc.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{camper?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {group?.emoji} {group?.name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${inc.type === 'medical' ? 'badge-red' : inc.type === 'behavioural' ? 'badge-amber' : 'badge-blue'}`}>
                        {type?.emoji} {type?.label}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {inc.description}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${inc.status === 'resolved' ? 'badge-teal' : inc.status === 'open' ? 'badge-red' : 'badge-amber'}`}>
                        {inc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {time.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      {' '}
                      {time.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </td>
                    <td>
                      {inc.status !== 'resolved' && hasPermission('resolve:incidents') && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {inc.status === 'open' && (
                            <button
                              onClick={() => handleStatusChange(inc.id, 'in_progress')}
                              style={{
                                padding: '4px 12px', fontSize: '0.75rem', fontWeight: 500,
                                border: '1px solid var(--border)', borderRadius: 6,
                                background: '#fff', cursor: 'pointer', color: 'var(--text)',
                              }}
                            >
                              In Progress
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(inc.id, 'resolved')}
                            style={{
                              padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600,
                              border: 'none', borderRadius: 6,
                              background: 'var(--teal)', cursor: 'pointer', color: '#fff',
                            }}
                          >
                            ✓ Resolve
                          </button>
                        </div>
                      )}
                      {inc.status === 'resolved' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleIncidents.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
                    No incidents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
