import { Link } from 'react-router-dom';

export default function ConsoleComingSoon({ title = 'Coming Soon', description = 'This module will be available in the next phase.' }) {
  return (
    <div>
      <div className="console-page-header">
        <div>
          <h1 className="console-page-title">{title}</h1>
        </div>
      </div>
      <div className="console-placeholder">
        <div className="console-placeholder-icon">🚧</div>
        <div className="console-placeholder-title">{title}</div>
        <p className="console-placeholder-text">{description}</p>
      </div>
    </div>
  );
}
