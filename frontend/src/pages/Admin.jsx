import React, { useState, useEffect, useCallback } from 'react';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonTableRow } from '../components/Skeleton';

const API = 'http://localhost:3001';

const ROLES = {
  admin:     { label: 'Admin',     color: '#146051', bg: '#E8F5F1' },
  team_lead: { label: 'Team Lead', color: '#D97304', bg: '#FFF5E6' },
  staff:     { label: 'Staff',     color: '#2563EB', bg: '#EFF6FF' },
};

const GROUPS = ['eagles', 'lions', 'flames', 'arrows'];

const EMPTY_FORM = { id: null, name: '', pin: '', role: 'staff', group: '' };

export default function Admin() {
  const { state } = useApp();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const isAdmin = state.currentUser?.role === 'admin';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchStaff = useCallback(async () => {
    setApiError('');
    try {
      const res = await fetch(`${API}/api/staff`);
      if (!res.ok) throw new Error('Server error');
      setStaff(await res.json());
    } catch {
      setApiError('Could not reach the backend. Make sure the server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openModal = (member = EMPTY_FORM) => {
    setFormData({ ...member, pin: '' }); // never pre-fill PIN
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // clear group if admin (admins have no group)
      ...(name === 'role' && value === 'admin' ? { group: '' } : {}),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate PIN: must be exactly 4 digits if provided
    if (formData.pin && !/^\d{4}$/.test(formData.pin)) {
      setFormError('PIN must be exactly 4 digits.');
      return;
    }
    if (!formData.id && !formData.pin) {
      setFormError('PIN is required for new staff members.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        group: formData.group || null,
        ...(formData.pin ? { pin: formData.pin } : {}),
      };

      const url = formData.id ? `${API}/api/staff/${formData.id}` : `${API}/api/staff`;
      const method = formData.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      setShowModal(false);
      await fetchStaff();
      showToast(formData.id ? 'Staff member updated ✓' : 'Staff member added ✓');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from the system?`)) return;
    try {
      const res = await fetch(`${API}/api/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchStaff();
      showToast(`${name} removed.`);
    } catch {
      showToast('Could not delete — please try again.');
    }
  };

  // Access guard
  if (!isAdmin) {
    return (
      <div className="page-container">
        <TopBar title="Admin" />
        <div className="content-container animate-in">
          <EmptyState 
            icon="🔒"
            title="Access Restricted"
            description="Only admins can view this page."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <TopBar title="Admin Dashboard" />

      {/* Toast */}
      {toastMsg && (
        <div className="animate-in" style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#111827', color: '#fff', padding: '10px 20px', borderRadius: 100,
          fontWeight: 500, fontSize: 14, zIndex: 9999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
        }}>
          {toastMsg}
        </div>
      )}

      <div className="content-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>Staff Management</h2>
            <p className="text-secondary text-sm">
              {staff.length} staff member{staff.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>+ Add Staff</button>
        </div>

        {/* Error state */}
        {apiError && <ErrorState error={apiError} onRetry={fetchStaff} />}

        {/* Table */}
        {!apiError && (
          <div className="table-container animate-in">
            <table className="admin-table">
              <thead>
                <tr>
                  {['Name', 'Role', 'Group', 'Actions'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <SkeletonTableRow columns={4} />
                    <SkeletonTableRow columns={4} />
                    <SkeletonTableRow columns={4} />
                  </>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <EmptyState 
                        icon="👥"
                        title="No staff members"
                        description="Get started by adding your first staff member."
                      />
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => {
                    const roleInfo = ROLES[member.role] || ROLES.staff;
                    return (
                      <tr key={member.id}>
                        <td className="font-medium">{member.name}</td>
                        <td>
                          <span className="badge" style={{ color: roleInfo.color, background: roleInfo.bg }}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td style={{ color: member.group ? 'var(--text)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {member.group || '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <button onClick={() => openModal(member)}
                              style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(member.id, member.name)}
                              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>
                {formData.id ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button className="modal-close" type="button" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  name="name" required
                  value={formData.name} onChange={handleChange}
                  placeholder="e.g. Tunde Kayode"
                />
              </div>

              <div className="form-group">
                <label>
                  {formData.id ? 'New PIN (leave blank to keep current)' : 'PIN (4 digits) *'}
                </label>
                <input
                  name="pin" type="password"
                  inputMode="numeric" maxLength={4}
                  value={formData.pin} onChange={handleChange}
                  placeholder="••••"
                  style={{ letterSpacing: '4px' }}
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="admin">Admin</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="staff">Staff / Volunteer</option>
                </select>
              </div>

              {formData.role !== 'admin' && (
                <div className="form-group">
                  <label>Group</label>
                  <select name="group" value={formData.group || ''} onChange={handleChange}>
                    <option value="">— No group —</option>
                    {GROUPS.map(g => <option key={g} value={g} style={{ textTransform: 'capitalize' }}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                  </select>
                </div>
              )}

              {formError && (
                <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, marginBottom: '20px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : (formData.id ? 'Save Changes' : 'Add Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
