import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleReports() {
  const { hasPermission } = usePermissions();
  const [reportType, setReportType] = useState('summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/reports/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExportCSV = () => {
    if (!data) return;
    
    let csv = '';
    let filename = `camp_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'campers' && Array.isArray(data)) {
      csv = 'Registration Number,Name,Age,Gender,Platoon,Status\n';
      data.forEach(c => {
        csv += `${c.registrationNumber || ''},"${c.name}",${c.age || ''},${c.gender || ''},"${c.platoon?.name || ''}",${c.status}\n`;
      });
    } else if (reportType === 'staff' && Array.isArray(data)) {
      csv = 'Name,Email,Role,Department,Platoon,Status\n';
      data.forEach(s => {
        csv += `"${s.name}","${s.email || ''}","${s.role}","${s.department || ''}","${s.platoon?.name || ''}",${s.status}\n`;
      });
    } else if (reportType === 'incidents' && Array.isArray(data)) {
      csv = 'Title,Category,Severity,Status,Camper,Reported By,Date\n';
      data.forEach(i => {
        csv += `"${i.title}",${i.category},${i.severity},${i.status},"${i.camper?.name || ''}","${i.reportedBy?.name || ''}",${new Date(i.reportedAt).toLocaleDateString()}\n`;
      });
    } else {
      alert('CSV export not supported for this report type yet.');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Reports</h1>
          <p className="console-page-subtitle">View and export camp data</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            🖨️ Print PDF
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 6, fontSize: '0.875rem' }}>
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 24 }} className="hide-on-print">
        {['summary', 'campers', 'staff', 'incidents'].map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            style={{
              padding: '10px 20px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
              background: reportType === type ? 'var(--teal)' : '#fff',
              color: reportType === type ? '#fff' : 'var(--text)',
              border: reportType === type ? '1px solid var(--teal)' : '1px solid var(--border)',
              cursor: 'pointer', textTransform: 'capitalize'
            }}
          >
            {type} Report
          </button>
        ))}
      </div>

      <div className="console-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Generating report...</div>
        ) : !data ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No data available.</div>
        ) : (
          <div className="console-table-container">
            {reportType === 'summary' && data.platoonSummary && (
              <div style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Camp Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                  <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Campers</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.totalCampers}</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Staff</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.totalStaff}</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open Incidents</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.openIncidents}</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Medical Alerts</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.totalMedicalAlerts}</div>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 16px 0' }}>Platoon Breakdown</h3>
                <table className="console-table">
                  <thead>
                    <tr>
                      <th>Platoon</th>
                      <th>Campers</th>
                      <th>Medical Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.platoonSummary.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.emoji} {p.name}</td>
                        <td>{p.camperCount}</td>
                        <td>{p.medicalAlerts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'campers' && Array.isArray(data) && (
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Reg #</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Platoon</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(c => (
                    <tr key={c.id}>
                      <td>{c.registrationNumber}</td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.age || '-'}</td>
                      <td>{c.platoon?.name || 'Unassigned'}</td>
                      <td>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'staff' && Array.isArray(data) && (
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Platoon</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td>{s.role}</td>
                      <td>{s.department || '-'}</td>
                      <td>{s.platoon?.name || '-'}</td>
                      <td>{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'incidents' && Array.isArray(data) && (
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Camper</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(i => (
                    <tr key={i.id}>
                      <td>{new Date(i.reportedAt).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 500 }}>{i.title}</td>
                      <td>{i.category}</td>
                      <td>{i.severity}</td>
                      <td>{i.status}</td>
                      <td>{i.camper?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
