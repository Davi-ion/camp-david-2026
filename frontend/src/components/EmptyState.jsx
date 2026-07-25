import React from 'react';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state animate-in">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-text">{description}</p>}
      {action && (
        <div style={{ marginTop: '24px' }}>
          {action}
        </div>
      )}
    </div>
  );
}
