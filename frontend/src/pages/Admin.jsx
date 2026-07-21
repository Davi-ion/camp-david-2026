import React, { useState, useEffect, useCallback } from 'react';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

const API = 'http://localhost:3001';

const ROLES = {
  admin:     { label: 'Admin',     color: '#1B6B5A', bg: '#E8F5F1' },
  team_lead: { label: 'Team Lead', color: '#E07B0A', bg: '#FFF5E6' },
  staff:     { label: 'Staff',     color: '#2F80ED', bg: '#EBF3FD' },
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
        <div className="content-container" style={{ paddingTop: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)' }}>Only admins can view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingBottom: 80 }}>
      <TopBar title="Admin Dashboard" />

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1B6B5A', color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontWeight: 500, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,.25)'
        }}>
          {toastMsg}
        </div>
      )}

      <div className="content-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>Staff Management</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
              {staff.length} staff member{staff.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>+ Add Staff</button>
        </div>

        {/* Error state */}
        {apiError && (
          <div style={{ background: '#FDE8EA', color: '#DC3545', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
            ⚠️ {apiError}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--surface)' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Role', 'Group', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No staff yet — add one above!
                    </td>
                  </tr>
                )}
                {staff.map((member, i) => {
                  const roleInfo = ROLES[member.role] || ROLES.staff;
                  return (
                    <tr key={member.id} style={{ borderBottom: i < staff.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{member.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                          fontSize: 12, fontWeight: 600,
                          color: roleInfo.color, background: roleInfo.bg,
                        }}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: member.group ? 'var(--text)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {member.group || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button onClick={() => openModal(member)}
                            style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(member.id, member.name)}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
          }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 420,
            padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
              {formData.id ? '✏️ Edit Staff Member' : '➕ Add Staff Member'}
            </h3>

            <form onSubmit={handleSave}>
              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 500, fontSize: 13, marginBottom: 6 }}>Full Name *</label>
                <input
                  className="input-field" name="name" required
                  value={formData.name} onChange={handleChange}
                  placeholder="e.g. Tunde Kayode"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* PIN */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 500, fontSize: 13, marginBottom: 6 }}>
                  {formData.id ? 'New PIN (leave blank to keep current)' : 'PIN (4 digits) *'}
                </label>
                <input
                  className="input-field" name="pin" type="password"
                  inputMode="numeric" maxLength={4}
                  value={formData.pin} onChange={handleChange}
                  placeholder="••••"
                  style={{ width: '100%', boxSizing: 'border-box', letterSpacing: 6 }}
                />
              </div>

              {/* Role */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 500, fontSize: 13, marginBottom: 6 }}>Role *</label>
                <select className="input-field" name="role" value={formData.role} onChange={handleChange}
                  style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="admin">Admin</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="staff">Staff / Volunteer</option>
                </select>
              </div>

              {/* Group — only shown if not admin */}
              {formData.role !== 'admin' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontWeight: 500, fontSize: 13, marginBottom: 6 }}>Group</label>
                  <select className="input-field" name="group" value={formData.group || ''} onChange={handleChange}
                    style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="">— No group —</option>
                    {GROUPS.map(g => <option key={g} value={g} style={{ textTransform: 'capitalize' }}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                  </select>
                </div>
              )}

              {formError && (
                <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>⚠️ {formError}</p>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : (formData.id ? 'Save Changes' : 'Add Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
