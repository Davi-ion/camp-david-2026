import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = 'http://localhost:3001';

export default function UserManagement() {
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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRoles(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    setLoading(false);
  }, []);

  const openNewUserModal = () => {
    setFormData({ name: '', email: '', roleId: '', password: '' });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setFormData({ ...user, password: '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg('');
    const token = sessionStorage.getItem('camp_token');
    const isNew = !formData.id;
    
    try {
      const url = isNew ? `${API}/api/users` : `${API}/api/users/${formData.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload = { ...formData };
      if (!isNew) delete payload.password; // Admin edits don't change password directly unless using reset

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Are you sure you want to reset this user\'s password? They will be forced to change it on next login.')) return;
    
    try {
      const token = sessionStorage.getItem('camp_token');
      // Using the default password from seed
      const res = await fetch(`${API}/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: 'CampDavid@2026!' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Password reset successfully to: CampDavid@2026!');
    } catch (err) {
      alert(err.message);
    }
  };

  if (!hasPermission('manage:users')) return null; // App router also guards this

  return (
    <div className="container" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>User Management</h2>
        <button className="btn btn-primary" onClick={openNewUserModal}>
          + New User
        </button>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.username}</div>
                </td>
                <td>{u.email}</td>
                <td><span className="badge badge-teal">{u.roleName || u.role}</span></td>
                <td>
                  <span className={`badge ${u.status === 'active' ? 'badge-teal' : 'badge-red'}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(u)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--amber)' }} onClick={() => handleResetPassword(u.id)}>Reset Password</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: '#666' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
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
              <div className="form-group">
                <label>Name</label>
                <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>

              {!formData.id && (
                <div className="form-group">
                  <label>Initial Password</label>
                  <input type="password" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} required />
                </div>
              )}

              <div className="form-group">
                <label>Role</label>
                <select value={formData.roleId || ''} onChange={e => setFormData({...formData, roleId: e.target.value})} required>
                  <option value="">-- Select Role --</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={formData.status || 'active'} onChange={e => setFormData({...formData, status: e.target.value})}>
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
