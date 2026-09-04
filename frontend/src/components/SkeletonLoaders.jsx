import React from 'react';

export function SkeletonBox({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

export function SkeletonMatrix({ rows = 4, cols = 4 }) {
  return (
    <div className="skeleton-matrix-container">
      <div className="skeleton-matrix-header">
        <SkeletonBox width="180px" height="24px" />
        <SkeletonBox width="100px" height="24px" borderRadius="50px" />
      </div>
      <div className="skeleton-table">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="skeleton-row">
            <SkeletonBox width="110px" height="28px" />
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBox key={c} width="100%" height="28px" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonInteractions({ count = 3 }) {
  return (
    <div className="skeleton-stack">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card-item">
          <div className="skeleton-row-between">
            <SkeletonBox width="130px" height="20px" borderRadius="6px" />
            <SkeletonBox width="90px" height="20px" />
          </div>
          <SkeletonBox width="100%" height="16px" style={{ marginTop: '0.65rem' }} />
          <SkeletonBox width="80%" height="16px" style={{ marginTop: '0.4rem' }} />
          <SkeletonBox width="100%" height="8px" borderRadius="4px" style={{ marginTop: '0.75rem' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonNarrative() {
  return (
    <div className="skeleton-card-item narrative-skeleton">
      <SkeletonBox width="260px" height="22px" style={{ marginBottom: '0.85rem' }} />
      <SkeletonBox width="100%" height="16px" style={{ marginBottom: '0.45rem' }} />
      <SkeletonBox width="95%" height="16px" style={{ marginBottom: '0.45rem' }} />
      <SkeletonBox width="70%" height="16px" />
    </div>
  );
}

export function SkeletonResults() {
  return (
    <div className="skeleton-results-wrapper">
      <div className="skeleton-card-item" style={{ height: '90px', marginBottom: '1.5rem' }}>
        <SkeletonBox width="100%" height="100%" borderRadius="12px" />
      </div>
      <SkeletonNarrative />
      <div className="results-grid" style={{ marginTop: '1.5rem' }}>
        <SkeletonInteractions count={3} />
        <div className="skeleton-stack">
          <div className="skeleton-card-item"><SkeletonBox width="100%" height="160px" borderRadius="12px" /></div>
          <div className="skeleton-card-item"><SkeletonBox width="100%" height="140px" borderRadius="12px" /></div>
        </div>
      </div>
    </div>
  );
}
