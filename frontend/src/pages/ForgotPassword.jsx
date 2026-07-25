import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [devToken, setDevToken] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMsg({ type: 'success', text: data.message });
      if (data.devToken) setDevToken(data.devToken);
      setStep(2);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to request reset.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: 'Password reset successfully. You can now log in.' });
      setStep(3);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to reset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 style={{ marginBottom: 8 }}>Password Reset</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
          {step === 1 ? "Enter your email to receive a reset code." : step === 2 ? "Check your email for the reset code." : ""}
        </p>

        {msg.text && (
          <div style={{
            padding: 12, marginBottom: 20, borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: msg.type === 'error' ? '#FDE8EA' : '#E8F5F1',
            color: msg.type === 'error' ? '#DC3545' : 'var(--teal)'
          }}>
            {msg.text}
          </div>
        )}

        {devToken && step === 2 && (
          <div style={{ padding: 12, marginBottom: 20, background: '#f0f9ff', color: '#0369a1', borderRadius: 8, fontSize: 13 }}>
            <strong>Dev Mode Code:</strong> {devToken}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} autoFocus />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Requesting...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label>Reset Code</label>
              <input type="text" value={token} onChange={e => setToken(e.target.value)} required disabled={loading} autoFocus />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required disabled={loading} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 3 && (
          <Link to="/login" className="btn btn-primary btn-full">Return to Login</Link>
        )}

        {step !== 3 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
