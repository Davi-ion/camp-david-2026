import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TopBar({ title }) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const user = state.currentUser;

  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <span style={{ fontSize: '1.25rem' }}>⛺</span>
        {title || 'Camp David 2026'}
      </div>
      <div className="top-bar-right">
        {user && (
          <>
            <div className="avatar avatar-sm" style={{ background: 'rgba(255,255,255,0.2)', fontSize: '0.6875rem' }}>
              {getInitials(user.name)}
            </div>
            <button
              className="btn-icon"
              style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', width: 32, height: 32, fontSize: '0.75rem' }}
              onClick={() => {
                dispatch({ type: 'LOGOUT' });
                navigate('/login');
              }}
              title="Logout"
            >
              ↩
            </button>
          </>
        )}
      </div>
    </header>
  );
}
