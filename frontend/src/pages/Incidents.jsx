import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GROUPS } from '../data/campers';
import { staff } from '../data/staff';
import TopBar from '../components/TopBar';

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

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Incidents() {
  const { state, dispatch } = useApp();
  const user = state.currentUser;

  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formCamper, setFormCamper] = useState('');
  const [formType, setFormType] = useState('medical');
  const [formDesc, setFormDesc] = useState('');

  // Visible campers for the form selector
  const selectableCampers = useMemo(() => {
    if (user?.role === 'admin') return state.campers;
    return state.campers.filter((c) => c.group === user?.group);
  }, [state.campers, user]);

  // Filter incidents by role
  const visibleIncidents = useMemo(() => {
    let list = state.incidents;
    if (user?.role === 'staff') {
      list = list.filter((i) => i.reportedBy === user.id);
    } else if (user?.role === 'team_lead') {
      const groupCamperIds = state.campers.filter((c) => c.group === user.group).map((c) => c.id);
      list = list.filter((i) => groupCamperIds.includes(i.camperId) || i.reportedBy === user.id);
    }
    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((i) => i.status === statusFilter);
    }
    return list;
  }, [state.incidents, user, statusFilter, state.campers]);

  const handleSubmit = () => {
    if (!formCamper || !formDesc.trim()) return;
    const incident = {
      id: `inc-${Date.now()}`,
      camperId: formCamper,
      type: formType,
      description: formDesc.trim(),
      reportedBy: user.id,
      reportedAt: new Date().toISOString(),
      status: 'open',
    };
    dispatch({ type: 'ADD_INCIDENT', payload: incident });
    setFormCamper('');
    setFormType('medical');
    setFormDesc('');
    setShowForm(false);
  };

  const handleStatusChange = (incidentId, newStatus) => {
    dispatch({ type: 'UPDATE_INCIDENT_STATUS', payload: { id: incidentId, status: newStatus } });
  };

  const canUpdateStatus = user?.role === 'admin' || user?.role === 'team_lead';

  return (
    <div className="page page-with-topbar">
      <TopBar title="Incidents" />
      <div className="container" style={{ paddingTop: 16 }}>
        {/* New Incident Button */}
        <button
          className="btn btn-primary btn-full"
          onClick={() => setShowForm(!showForm)}
          style={{ marginBottom: 16 }}
        >
          {showForm ? 'Cancel' : '+ Report New Incident'}
        </button>

        {/* New Incident Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 16, animation: 'fadeInUp 0.3s ease' }}>
            <h3 style={{ marginBottom: 16 }}>New Incident Report</h3>

            <div className="form-group">
              <label>Camper</label>
              <select value={formCamper} onChange={(e) => setFormCamper(e.target.value)}>
                <option value="">— Select camper —</option>
                {selectableCampers.map((c) => {
                  const group = GROUPS.find((g) => g.id === c.group);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({group?.emoji} {group?.name})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {INCIDENT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    className={`session-btn ${formType === t.id ? 'active' : ''}`}
                    style={formType === t.id ? { background: t.color, color: '#fff', borderColor: t.color } : {}}
                    onClick={() => setFormType(t.id)}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Describe the incident in detail..."
              />
            </div>

            <button className="btn btn-primary btn-full" onClick={handleSubmit}>
              Submit Report
            </button>
          </div>
        )}

        {/* Status Filter */}
        <div className="filter-tabs" style={{ marginBottom: 16 }}>
          {STATUSES.map((s) => (
            <button
              key={s.id}
              className={`filter-tab ${statusFilter === s.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Incidents List */}
        {visibleIncidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-text">
              {statusFilter === 'all' ? 'No incidents reported' : `No ${statusFilter.replace('_', ' ')} incidents`}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleIncidents.map((inc) => {
              const camper = state.campers.find((c) => c.id === inc.camperId);
              const reporter = staff.find((s) => s.id === inc.reportedBy);
              const group = GROUPS.find((g) => g.id === camper?.group);
              const type = INCIDENT_TYPES.find((t) => t.id === inc.type);
              const time = new Date(inc.reportedAt);
              const timeStr = time.toLocaleString('en-NG', {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div key={inc.id} className="incident-card animate-in">
                  <div className={`incident-bar ${inc.type}`} />
                  <div className="incident-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm">
                          {getInitials(camper?.name || '?')}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ fontSize: '0.9375rem' }}>{camper?.name || 'Unknown'}</div>
                          <div className="text-xs text-muted">{group?.emoji} {group?.name} · Reported by {reporter?.name || 'Unknown'}</div>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                      {inc.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${type?.id === 'medical' ? 'badge-red' : type?.id === 'behavioural' ? 'badge-amber' : 'badge-blue'}`}>
                          {type?.emoji} {type?.label}
                        </span>
                        <span className={`status-badge status-${inc.status}`}>
                          {inc.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-muted">{timeStr}</span>
                    </div>

                    {/* Status Update (Team Lead / Admin) */}
                    {canUpdateStatus && inc.status !== 'resolved' && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                        {inc.status === 'open' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleStatusChange(inc.id, 'in_progress')}
                            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                          >
                            Mark In Progress
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleStatusChange(inc.id, 'resolved')}
                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                        >
                          ✓ Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
