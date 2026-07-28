import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Login() {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Force password change flow
  const [forceChange, setForceChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your email/username and password');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        triggerShake();
        setLoading(false);
        return;
      }

      if (data.user.forcePasswordChange) {
        // Store token temporarily to allow force-change request
        localStorage.setItem('camp_token', data.token);
        setForceChange(true);
        setLoading(false);
        return;
      }

      // Fetch all active campers so they are available globally
      try {
        const campersRes = await fetch(`${API}/api/campers?status=active`, {
          headers: { 'Authorization': `Bearer ${data.token}` }
        });
        if (campersRes.ok) {
          const campersData = await campersRes.json();
          dispatch({ type: 'SET_CAMPERS', payload: campersData.campers || [] });
        }
      } catch (err) {
        console.error('Failed to fetch campers on login', err);
      }

      dispatch({ type: 'LOGIN', payload: data });
      navigate('/');
    } catch {
      setError('Could not connect to server. Please try again.');
      triggerShake();
      setLoading(false);
    }
  };

  const handleForceChange = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('camp_token');
      const res = await fetch(`${API}/api/auth/force-change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update password');
        triggerShake();
        setLoading(false);
        return;
      }

      dispatch({ type: 'LOGIN', payload: data });
      navigate('/');
    } catch {
      setError('Could not connect to server.');
      triggerShake();
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div 
        className="login-card"
        style={shake ? { animation: 'shake 0.4s ease' } : {}}
      >
        <div className="login-logo">⛺</div>
        <h1 className="login-title">Camp David 2026</h1>
        <p className="login-subtitle">
          {forceChange ? 'Set New Password' : 'Staff Portal — David\'s Army'}
        </p>

        {error && (
          <div style={{
            background: '#FDE8EA', color: '#DC3545', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {!forceChange ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email or Username</label>
              <input
                type="text"
                className="form-control"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#666'
                  }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', color: '#555' }}>
                <input type="checkbox" /> Remember Me
              </label>
              <Link to="/forgot-password" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ height: 48, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForceChange}>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 20, textAlign: 'center' }}>
              Welcome! For security reasons, you must set a new personal password before continuing.
            </p>

            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={loading}
                  autoFocus
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#666'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ height: 48, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Updating…' : 'Save & Continue'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
