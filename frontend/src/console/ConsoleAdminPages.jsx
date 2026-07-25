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
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) { console.error(e); }
  };

  const fetchRoles = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
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
    const token = sessionStorage.getItem('camp_token');
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
    const token = sessionStorage.getItem('camp_token');
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

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = sessionStorage.getItem('camp_token');
        const res = await fetch(`${API}/api/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRoles(data || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchRoles();
  }, []);

  return (
    <div>
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Roles & Permissions</h1>
          <p className="console-page-subtitle">System roles and their associated permissions</p>
        </div>
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
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: 280 }}>{r.description}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions || '[]')).slice(0, 4).map(p => (
                        <span key={p} className="badge badge-teal" style={{ fontSize: '0.6875rem' }}>{p}</span>
                      ))}
                      {(Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions || '[]')).length > 4 && (
                        <span className="badge" style={{ background: '#eee', fontSize: '0.6875rem' }}>
                          +{(Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions || '[]')).length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {r.isSystem
                      ? <span className="badge badge-dark" style={{ fontSize: '0.6875rem' }}>System</span>
                      : <span className="badge" style={{ background: '#eee', fontSize: '0.6875rem' }}>Custom</span>}
                  </td>
                </tr>
              ))}
              {roles.length === 0 && !loading && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>No roles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
        const token = sessionStorage.getItem('camp_token');
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
