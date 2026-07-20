import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', email: '', role: 'user', profile: '' });
  
  const { state } = useApp();
  
  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        // Update existing
        await fetch(`http://localhost:3001/api/users/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new
        await fetch(`http://localhost:3001/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to save user', error);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await fetch(`http://localhost:3001/api/users/${id}`, { method: 'DELETE' });
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user', error);
      }
    }
  };

  const openModal = (user = { id: null, name: '', email: '', role: 'user', profile: '' }) => {
    setFormData(user);
    setShowModal(true);
  };

  if (state.currentUser?.role !== 'admin' && state.currentUser?.id !== 1) { // Basic access check
    return (
      <div className="page-container">
        <TopBar title="Admin" />
        <div className="content-container">
          <div className="alert error">You do not have permission to view this page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingBottom: '80px' }}>
      <TopBar title="Admin Dashboard" />
      <div className="content-container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>User Management</h2>
          <button className="btn primary" onClick={() => openModal()}>Add User</button>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-alt)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-light)' }}>Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-light)' }}>Email</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-light)' }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-light)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>{user.name}</td>
                    <td style={{ padding: '12px 16px' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${user.role === 'admin' ? 'teal' : 'gray'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => openModal(user)}
                        style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)' }}>No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                {formData.id ? 'Edit User' : 'Add New User'}
              </h3>
              <form onSubmit={handleSaveUser}>
                <div className="input-group">
                  <label className="input-label">Name</label>
                  <input type="text" className="input-field" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input type="email" className="input-field" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select className="input-field" name="role" value={formData.role} onChange={handleInputChange}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Profile (Optional JSON/String)</label>
                  <input type="text" className="input-field" name="profile" value={formData.profile || ''} onChange={handleInputChange} />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn primary" style={{ flex: 1 }}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
