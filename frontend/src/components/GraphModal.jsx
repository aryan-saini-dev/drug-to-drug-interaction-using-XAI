import React, { useState, useEffect } from 'react';
import { fetchGraphSchema } from '../services/api';

export default function GraphModal({ isOpen, onClose }) {
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    if (isOpen && !schema) {
      fetchGraphSchema()
        .then(setSchema)
        .catch(console.error);
    }
  }, [isOpen, schema]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div className="modal-title-box">
            <span className="ai-badge">⚡ LangGraph Orchestration Engine</span>
            <h2>StateGraph Workflow Schema</h2>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <p className="modal-desc">
          Compiled 5-node StateGraph pipeline orchestrating multi-modal drug interaction predictions:
        </p>

        {schema ? (
          <div className="graph-nodes-stack">
            {schema.nodes.map((node, index) => (
              <div key={node.id} className="graph-node-card">
                <div className="node-badge-num">{index + 1}</div>
                <div className="node-details">
                  <h4>{node.name}</h4>
                  <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: "0.15rem" }}>
                    State Node ID: <code>{node.id}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">Loading LangGraph StateGraph schema...</p>
        )}
      </div>
    </div>
  );
}
