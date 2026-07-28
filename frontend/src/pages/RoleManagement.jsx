import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = 'http://localhost:3001';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('camp_token');
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
    fetchRoles();
    setLoading(false);
  }, []);

  if (!hasPermission('manage:roles')) return null;

  return (
    <div className="container" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Role Management</h2>
        <button className="btn btn-primary" onClick={() => alert('Editing permissions UI requires a complex matrix, simulated for now.')}>
          + New Role
        </button>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Description</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  {r.isSystem && <span className="badge badge-dark" style={{ marginTop: 4 }}>System</span>}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.description || 'No description'}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.permissions.slice(0, 3).map(p => (
                      <span key={p} className="badge badge-teal">{p}</span>
                    ))}
                    {r.permissions.length > 3 && (
                      <span className="badge" style={{ background: '#eee' }}>+{r.permissions.length - 3}</span>
                    )}
                  </div>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => alert('Edit Role UI')}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
