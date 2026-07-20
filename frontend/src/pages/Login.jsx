import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { staff, ROLES } from '../data/staff';

export default function Login() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [selectedStaff, setSelectedStaff] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...pin];
    next[index] = value.slice(-1);
    setPin(next);
    setError('');

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const enteredPin = pin.join('');

    if (!selectedStaff) {
      setError('Please select your name');
      return;
    }
    if (enteredPin.length < 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    const user = staff.find((s) => s.id === selectedStaff);
    if (!user || user.pin !== enteredPin) {
      setError('Incorrect PIN. Try again.');
      setShake(true);
      setPin(['', '', '', '']);
      pinRefs[0].current?.focus();
      setTimeout(() => setShake(false), 500);
      return;
    }

    dispatch({ type: 'LOGIN', payload: user });
    navigate('/');
  };

  return (
    <div className="login-page">
      <form onSubmit={handleLogin} className="login-card" style={shake ? { animation: 'shake 0.4s ease' } : {}}>
        <div className="login-logo">⛺</div>
        <h1 className="login-title">Camp David 2026</h1>
        <p className="login-subtitle">Staff Portal — David's Army</p>

        <div className="form-group">
          <label htmlFor="staff-select">Select your name</label>
          <select
            id="staff-select"
            value={selectedStaff}
            onChange={(e) => { setSelectedStaff(e.target.value); setError(''); }}
          >
            <option value="">— Choose staff member —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({ROLES[s.role].label})
              </option>
            ))}
          </select>
        </div>

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

        <button type="submit" className="btn btn-primary btn-full" style={{ height: 48 }}>
          Sign In
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Prototype — all PINs are sequential (1111, 2222, etc.)
        </p>
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
