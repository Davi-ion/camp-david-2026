import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = 'http://localhost:3001';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/audit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    setLoading(false);
  }, []);

  if (!hasPermission('view:audit')) return null;

  return (
    <div className="container" style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 24 }}>System Audit Log</h2>

      <div className="table-container">
        <table className="admin-table">
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
                <td style={{ color: 'var(--text-secondary)' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ fontWeight: 500 }}>{log.userName}</td>
                <td>
                  <span className="badge badge-teal">{log.action}</span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {log.targetType ? `${log.targetType}: ${log.targetName || log.targetId}` : '-'}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{log.ipAddress || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: '#666' }}>No audit logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
