import { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleBulkImport() {
  const { hasPermission } = usePermissions();
  const [entity, setEntity] = useState('campers'); // campers, staff, drills, programme
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [step, setStep] = useState(1); // 1: upload, 2: preview, 3: success
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPreviewData(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'preview');

      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/bulk/import/${entity}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewData(data.preview);
        setStep(2);
      } else {
        alert(data.error || 'Failed to preview');
      }
    } catch (err) {
      console.error(err);
      alert('Error previewing file');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'commit');

      const token = sessionStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/bulk/import/${entity}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        setStep(3);
      } else {
        alert(data.error || 'Failed to import');
      }
    } catch (err) {
      console.error(err);
      alert('Error committing import');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setStep(1);
    document.getElementById('file-upload').value = '';
  };

  if (!hasPermission('manage:users')) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Access Denied</div>;
  }

  const validCount = previewData ? previewData.filter(r => r._valid).length : 0;
  const errorCount = previewData ? previewData.filter(r => !r._valid).length : 0;

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Bulk Import Centre</h1>
          <p className="console-page-subtitle">Import campers, staff, and drills from Excel/CSV files.</p>
        </div>
      </div>

      <div className="console-card" style={{ maxWidth: 800 }}>
        {step === 1 && (
          <div style={{ padding: 32 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1.125rem' }}>Step 1: Upload File</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="input-label">Select Entity</label>
                <select className="input-field" value={entity} onChange={e => setEntity(e.target.value)}>
                  <option value="campers">Campers</option>
                  <option value="staff">Staff</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Ensure your file has headers matching the required fields (e.g. Full Name, Registration Number, Platoon).
                </p>
              </div>

              <div>
                <label className="input-label">Choose File (.xlsx or .csv)</label>
                <input id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileChange} className="input-field" style={{ padding: '8px' }} />
              </div>

              <button 
                onClick={handlePreview} 
                disabled={!file || loading} 
                className="btn btn-primary" 
                style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
              >
                {loading ? 'Processing...' : 'Upload & Preview'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && previewData && (
          <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Step 2: Preview & Validate</h3>
              <button onClick={reset} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.875rem' }}>Start Over</button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#166534' }}>{validCount}</div>
                <div style={{ fontSize: '0.875rem', color: '#15803d' }}>Valid Records</div>
              </div>
              <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#991b1b' }}>{errorCount}</div>
                <div style={{ fontSize: '0.875rem', color: '#b91c1c' }}>Rows with Errors</div>
              </div>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ background: 'var(--bg)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>Row</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 100).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)', background: row._valid ? 'transparent' : '#fef2f2' }}>
                      <td style={{ padding: '12px 16px' }}>{row._index + 2}</td>
                      <td style={{ padding: '12px 16px' }}>{row.name || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {row._valid ? (
                          <span className="badge badge-teal">Valid</span>
                        ) : (
                          <span className="badge badge-red">Invalid</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--red)', fontSize: '0.75rem' }}>
                        {row._errors?.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.length > 100 && (
              <div style={{ padding: 12, textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Showing first 100 rows...
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
              <button 
                onClick={handleCommit} 
                disabled={validCount === 0 || loading} 
                className="btn btn-primary" 
                style={{ padding: '10px 24px' }}
              >
                {loading ? 'Importing...' : `Import ${validCount} Valid Records`}
              </button>
            </div>
          </div>
        )}

        {step === 3 && importResult && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Import Successful</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Successfully imported {importResult.imported} records.
            </p>
            <button onClick={reset} className="btn btn-primary" style={{ padding: '10px 24px' }}>
              Import Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
