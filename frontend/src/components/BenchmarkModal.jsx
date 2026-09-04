import React from 'react';

export default function BenchmarkModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>📊 Benchmark Performance</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <p className="modal-desc">Evaluated across 37,652 test drug pairs (Fold 0 benchmark):</p>
        <div className="metrics-grid">
          <div className="metric-card"><span className="metric-val">96.49%</span><span className="metric-lbl">Accuracy</span></div>
          <div className="metric-card"><span className="metric-val">94.71%</span><span className="metric-lbl">Macro Precision</span></div>
          <div className="metric-card"><span className="metric-val">94.72%</span><span className="metric-lbl">Macro Recall</span></div>
          <div className="metric-card"><span className="metric-val">96.67%</span><span className="metric-lbl">Micro Precision</span></div>
          <div className="metric-card"><span className="metric-val">96.96%</span><span className="metric-lbl">Micro Recall</span></div>
          <div className="metric-card"><span className="metric-val">37,652</span><span className="metric-lbl">Test Pairs</span></div>
        </div>
      </div>
    </div>
  );
}
