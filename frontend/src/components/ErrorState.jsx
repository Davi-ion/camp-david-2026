import React from 'react';

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state animate-in">
      <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
      <h3 style={{ color: '#B91C1C', fontWeight: 600, marginBottom: '8px' }}>Something went wrong</h3>
      <p style={{ color: '#991B1B', fontSize: '0.9375rem', marginBottom: onRetry ? '24px' : '0' }}>
        {error || 'We could not complete your request. Please try again.'}
      </p>
      {onRetry && (
        <button className="btn btn-outline" style={{ borderColor: '#FCA5A5', color: '#991B1B' }} onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
