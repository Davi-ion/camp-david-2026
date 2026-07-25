import React from 'react';

export function SkeletonText({ lines = 1, shortLast = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`skeleton skeleton-text ${i === lines - 1 && shortLast ? 'short' : ''}`}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar() {
  return <div className="skeleton skeleton-avatar" />;
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />;
}

export function SkeletonTableRow({ columns = 4 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <div className="skeleton skeleton-text" style={{ marginBottom: 0 }} />
        </td>
      ))}
    </tr>
  );
}
