import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ConsoleSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      if (res.ok) setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="console-fade-in" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings...</div>;
  }

  return (
    <div className="console-fade-in">
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">Settings</h1>
          <p className="console-page-subtitle">Manage camp configuration and preferences</p>
        </div>
        <div>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '8px 24px', borderRadius: 6, fontSize: '0.875rem' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ padding: '12px 20px', background: '#F0FDF4', color: 'var(--teal)', borderRadius: 8, marginBottom: 20, fontSize: '0.875rem', fontWeight: 500, border: '1px solid #DCFCE7' }}>
          ✓ Settings saved successfully
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 800 }}>
        
        {/* Camp Info */}
        <div className="console-card">
          <div className="console-card-header">
            <span className="console-card-title">Camp Information</span>
          </div>
          <div className="console-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label">Camp Name</label>
              <input className="input-field" value={settings.camp_name || ''} onChange={e => handleChange('camp_name', e.target.value)} />
            </div>
            <div>
              <label className="input-label">Theme</label>
              <input className="input-field" value={settings.camp_theme || ''} onChange={e => handleChange('camp_theme', e.target.value)} />
            </div>
            <div>
              <label className="input-label">Location</label>
              <input className="input-field" value={settings.camp_location || ''} onChange={e => handleChange('camp_location', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">Start Date</label>
                <input type="date" className="input-field" value={settings.camp_start_date || ''} onChange={e => handleChange('camp_start_date', e.target.value)} />
              </div>
              <div>
                <label className="input-label">End Date</label>
                <input type="date" className="input-field" value={settings.camp_end_date || ''} onChange={e => handleChange('camp_end_date', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Operations */}
        <div className="console-card">
          <div className="console-card-header">
            <span className="console-card-title">Operations & Attendance</span>
          </div>
          <div className="console-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label">Attendance Grace Period (minutes)</label>
              <input type="number" className="input-field" value={settings.grace_period_min || ''} onChange={e => handleChange('grace_period_min', e.target.value)} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Time after a session starts before campers are marked late.</p>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
