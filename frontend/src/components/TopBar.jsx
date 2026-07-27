import UserMenu from './UserMenu';
import NotificationCentre from './NotificationCentre';

export default function TopBar({ title }) {
  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <span style={{ fontSize: '1.25rem' }}>⛺</span>
        {title || 'Camp David 2026'}
      </div>
      
      <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <NotificationCentre />
        <UserMenu lightMode={false} />
      </div>
    </header>
  );
}
