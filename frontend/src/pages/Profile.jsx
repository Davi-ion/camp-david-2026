import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const API = 'http://localhost:3001';

export default function Profile() {
  const { state, dispatch } = useApp();
  const user = state.currentUser;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    bio: user?.bio || '',
    address: user?.address || '',
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      dispatch({ type: 'UPDATE_PROFILE', payload: data });
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ marginTop: 24, maxWidth: 600 }}>
      <h2 style={{ marginBottom: 24 }}>My Profile</h2>

      {msg.text && (
        <div style={{
          padding: 12, marginBottom: 20, borderRadius: 8, fontSize: 14, fontWeight: 500,
          background: msg.type === 'error' ? '#FDE8EA' : '#E8F5F1',
          color: msg.type === 'error' ? '#DC3545' : 'var(--teal)'
        }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Full Name</label>
            <input name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input name="phone" value={formData.phone} onChange={handleChange} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>System Role & Permissions</label>
            <input value={user?.roleName || user?.role} disabled style={{ background: 'var(--bg)', color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Contact an administrator to change your role or permissions.</p>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Bio (Optional)</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3}></textarea>
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
