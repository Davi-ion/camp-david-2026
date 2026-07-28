/**
 * Console wrappers for existing admin pages.
 * These inject the console page header and import the existing pages
 * so all logic and data remain shared.
 */
import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Console User Management ─────────────────────────────────────────────────
export function ConsoleUserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [msg, setMsg] = useState('');
  const { hasPermission } = usePermissions();

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) { console.error(e); }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRoles(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchRoles()]).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg('');
    const token = localStorage.getItem('camp_token');
    const isNew = !formData.id;
    try {
      const url = isNew ? `${API}/api/users` : `${API}/api/users/${formData.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModal(false);
      fetchUsers();
    } catch (err) { setMsg(err.message); }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Reset this user\'s password to the default?')) return;
    const token = localStorage.getItem('camp_token');
    const res = await fetch(`${API}/api/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newPassword: 'CampDavid@2026!' }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else alert('Password reset to: CampDavid@2026!');
  };

  return (
    <div>
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">User Management</h1>
          <p className="console-page-subtitle">Manage staff accounts, roles and access levels</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormData({ name: '', email: '', password: '', roleId: '', status: 'active' }); setShowModal(true); }}>
          + New User
        </button>
      </div>

      <div className="console-card">
        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar avatar-sm" style={{ background: 'var(--teal)', color: '#fff', fontSize: '0.6875rem' }}>
                        {u.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{u.username}</td>
                  <td><span className="badge badge-teal">{u.roleName || u.role}</span></td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'badge-teal' : 'badge-red'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setFormData({ ...u, password: '' }); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--amber)' }} onClick={() => handleResetPassword(u.id)}>Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{formData.id ? 'Edit User' : 'New User'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {msg && <div style={{ color: 'var(--red)', marginBottom: 16, fontSize: 14 }}>{msg}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group"><label>Name</label><input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div className="form-group"><label>Email</label><input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
              {!formData.id && <div className="form-group"><label>Initial Password</label><input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} required /></div>}
              <div className="form-group">
                <label>Role</label>
                <select value={formData.roleId || ''} onChange={e => setFormData({ ...formData, roleId: e.target.value })} required>
                  <option value="">-- Select Role --</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={formData.status || 'active'} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Console Role Management ──────────────────────────────────────────────────
export function ConsoleRoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', isSystem: false, permissions: [] });

  const modules = ['Dashboard', 'Campers', 'Staff', 'Platoons', 'Programme', 'Camp Drills', 'Attendance', 'Reports', 'Announcements', 'Settings', 'User Management'];
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'];

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/roles`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRoles(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openModal = (role = null) => {
    if (role) {
      setFormData({
        ...role,
        permissions: Array.isArray(role.permissions) ? role.permissions : JSON.parse(role.permissions || '[]')
      });
    } else {
      setFormData({ name: '', description: '', isSystem: false, permissions: [] });
    }
    setShowModal(true);
  };

  const togglePermission = (mod, action) => {
    if (formData.isSystem) return; // Cannot edit system roles directly in this simple UI
    const permString = `${action}:${mod.toLowerCase().replace(' ', '_')}`;
    const newPerms = new Set(formData.permissions);
    if (newPerms.has(permString)) newPerms.delete(permString);
    else newPerms.add(permString);
    if (newPerms.has('manage:all')) newPerms.delete('manage:all'); // Clean up master override if toggling specifics
    setFormData({ ...formData, permissions: Array.from(newPerms) });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('camp_token');
    const isNew = !formData.id;
    try {
      const url = isNew ? `${API}/api/roles` : `${API}/api/roles/${formData.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to save role');
      setShowModal(false);
      fetchRoles();
    } catch (err) { alert(err.message); }
  };

  const deleteRole = async (id) => {
    if (!confirm('Are you sure you want to delete this role? Users assigned to it will lose access.')) return;
    const token = localStorage.getItem('camp_token');
    try {
      await fetch(`${API}/api/roles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchRoles();
    } catch (err) { alert('Failed to delete'); }
  };

  return (
    <div>
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Roles & Permissions</h1>
          <p className="console-page-subtitle">System roles and their associated permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Create Custom Role
        </button>
      </div>

      <div className="console-card">
        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th>Permissions</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => {
                const perms = Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions || '[]');
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 280 }}>{r.description}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {perms.includes('all') || perms.includes('manage:all') ? (
                          <span className="badge badge-dark">Full Access</span>
                        ) : (
                          <>
                            {perms.slice(0, 4).map(p => <span key={p} className="badge badge-teal" style={{ fontSize: '0.6875rem' }}>{p}</span>)}
                            {perms.length > 4 && <span className="badge" style={{ background: '#eee', fontSize: '0.6875rem' }}>+{perms.length - 4} more</span>}
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      {r.isSystem
                        ? <span className="badge badge-dark" style={{ fontSize: '0.6875rem' }}>System</span>
                        : <span className="badge" style={{ background: '#eee', fontSize: '0.6875rem' }}>Custom</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-text" onClick={() => openModal(r)}>Edit</button>
                      {!r.isSystem && (
                        <button className="btn btn-text" onClick={() => deleteRole(r.id)} style={{ color: 'var(--red)' }}>Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="console-card" style={{ width: 900, maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="console-card-header">
              <span className="console-card-title">{formData.id ? 'Edit Role' : 'Create Custom Role'}</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="console-card-body" style={{ overflowY: 'auto' }}>
              <form id="roleForm" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Role Name</label>
                    <input required className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={formData.isSystem} />
                  </div>
                  <div>
                    <label className="input-label">Description</label>
                    <input className="input-field" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} disabled={formData.isSystem} />
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <h4 style={{ marginBottom: 12 }}>Permissions Matrix</h4>
                  {formData.isSystem && <div style={{ color: 'var(--amber)', fontSize: '0.875rem', marginBottom: 16 }}>System role permissions are protected and cannot be modified.</div>}
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead style={{ background: 'var(--bg-light)' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>Module</th>
                          {actions.map(a => <th key={a} style={{ padding: '8px 12px', textTransform: 'capitalize', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>{a}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map(mod => (
                          <tr key={mod} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{mod}</td>
                            {actions.map(action => {
                              const permString = `${action}:${mod.toLowerCase().replace(' ', '_')}`;
                              const hasPerm = formData.permissions.includes(permString) || formData.permissions.includes('all') || formData.permissions.includes('manage:all');
                              return (
                                <td key={action} style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={hasPerm} 
                                    disabled={formData.isSystem || formData.permissions.includes('all')}
                                    onChange={() => togglePermission(mod, action)} 
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </form>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              {!formData.isSystem && <button type="submit" form="roleForm" className="btn btn-primary">Save Role</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Console Audit Log ────────────────────────────────────────────────────────
export function ConsoleAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('camp_token');
        const res = await fetch(`${API}/api/audit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Audit Logs</h1>
          <p className="console-page-subtitle">A complete, tamper-evident record of all system activity</p>
        </div>
      </div>

      <div className="console-card">
        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.userName}</td>
                  <td><span className="badge badge-teal">{log.action}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {log.targetType ? `${log.targetType}: ${log.targetName || log.targetId}` : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {log.ipAddress || '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>No audit logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
