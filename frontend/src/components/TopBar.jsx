import UserMenu from './UserMenu';

export default function TopBar({ title }) {
  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <span style={{ fontSize: '1.25rem' }}>⛺</span>
        {title || 'Camp David 2026'}
      </div>
      
      <div className="top-bar-right">
        <UserMenu lightMode={false} />
      </div>
    </header>
  );
}
