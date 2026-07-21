import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API = 'http://localhost:3001';

const ROLE_LABELS = {
  admin:     'Admin',
  team_lead: 'Team Lead',
  staff:     'Staff',
};

export default function Login() {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const [staffList, setStaffList]       = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [backendError, setBackendError] = useState('');

  const [selectedStaff, setSelectedStaff] = useState('');
  const [pin, setPin]                     = useState(['', '', '', '']);
  const [error, setError]                 = useState('');
  const [shake, setShake]                 = useState(false);
  const [loggingIn, setLoggingIn]         = useState(false);

  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  // Load staff list from backend on mount
  useEffect(() => {
    fetch(`${API}/api/staff`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setStaffList(data))
      .catch(() =>
        setBackendError('Could not connect to the server. Please make sure the backend is running.')
      )
      .finally(() => setLoadingStaff(false));
  }, []);

  const triggerShake = () => {
    setShake(true);
    setPin(['', '', '', '']);
    pinRefs[0].current?.focus();
    setTimeout(() => setShake(false), 500);
  };

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...pin];
    next[index] = value.slice(-1);
    setPin(next);
    setError('');
    if (value && index < 3) pinRefs[index + 1].current?.focus();
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const enteredPin = pin.join('');

    if (!selectedStaff) { setError('Please select your name'); return; }
    if (enteredPin.length < 4) { setError('Please enter your 4-digit PIN'); return; }

    setLoggingIn(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStaff, pin: enteredPin }),
      });

      if (res.status === 401) {
        setError('Incorrect PIN. Try again.');
        triggerShake();
        return;
      }

      if (!res.ok) throw new Error('Server error');

      const user = await res.json();
      dispatch({ type: 'LOGIN', payload: user });
      navigate('/');
    } catch {
      setError('Login failed — check your connection and try again.');
      triggerShake();
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="login-page">
      <form
        onSubmit={handleLogin}
        className="login-card"
        style={shake ? { animation: 'shake 0.4s ease' } : {}}
      >
        <div className="login-logo">⛺</div>
        <h1 className="login-title">Camp David 2026</h1>
        <p className="login-subtitle">Staff Portal — David's Army</p>

        {/* Backend offline warning */}
        {backendError && (
          <div style={{
            background: '#FDE8EA', color: '#DC3545', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500,
          }}>
            ⚠️ {backendError}
          </div>
        )}

        {/* Staff selector */}
        <div className="form-group">
          <label htmlFor="staff-select">Select your name</label>
          <select
            id="staff-select"
            value={selectedStaff}
            disabled={loadingStaff || !!backendError}
            onChange={(e) => { setSelectedStaff(e.target.value); setError(''); }}
          >
            <option value="">
              {loadingStaff ? 'Loading staff…' : '— Choose staff member —'}
            </option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({ROLE_LABELS[s.role] ?? s.role})
              </option>
            ))}
          </select>
        </div>

        {/* PIN input */}
        <div className="form-group">
          <label>Enter PIN</label>
          <div className="pin-input-group">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={pinRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                className="pin-digit"
                value={digit}
                disabled={loggingIn}
                onChange={(e) => handlePinChange(i, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                autoFocus={i === 0}
              />
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--red)', fontSize: '0.8125rem', textAlign: 'center', marginBottom: 16, fontWeight: 500 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          style={{ height: 48, opacity: loggingIn ? 0.7 : 1 }}
          disabled={loggingIn || loadingStaff || !!backendError}
        >
          {loggingIn ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

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
