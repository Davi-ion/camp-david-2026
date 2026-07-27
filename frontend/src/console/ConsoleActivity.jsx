import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/audit?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Activity Feed</h1>
          <p className="console-page-subtitle">System-wide audit log of all administrative actions ({total} total)</p>
        </div>
      </div>

      <div className="console-card">
        <div className="console-table-container">
          <table className="console-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No activity found.</td></tr>
              ) : logs.map(log => {
                const time = new Date(log.createdAt);
                const isCreate = log.action.startsWith('CREATE');
                const isUpdate = log.action.startsWith('UPDATE');
                const isDelete = log.action.startsWith('DELETE') || log.action.startsWith('ARCHIVE') || log.action.startsWith('DEACTIVATE');
                
                let dotColor = 'var(--text-muted)';
                if (isCreate) dotColor = 'var(--teal)';
                else if (isUpdate) dotColor = 'var(--blue)';
                else if (isDelete) dotColor = 'var(--red)';
                
                return (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {time.toLocaleDateString('en-NG')} {time.toLocaleTimeString('en-NG')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.userName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }}></div>
                        <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{log.action}</span>
                      </div>
                    </td>
                    <td>
                      {log.targetType && (
                        <div>
                          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{log.targetType}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{log.targetName || log.targetId || '-'}</div>
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: 300 }}>
                      {log.detail || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing {logs.length} of {total}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8125rem' }}>Prev</button>
            <button disabled={logs.length < limit} onClick={() => setPage(p => p + 1)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8125rem' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
