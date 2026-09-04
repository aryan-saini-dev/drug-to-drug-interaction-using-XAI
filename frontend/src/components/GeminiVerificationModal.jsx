import React from 'react';

export default function GeminiVerificationModal({ modalData, onClose }) {
  if (!modalData.isOpen) return null;

  const hasSuggestions = modalData.suggestions && modalData.suggestions.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div className="modal-title-box">
            <span className="ai-badge">Gemini AI Entity Verification</span>
            <h2>Query: "{modalData.query}" ({modalData.conditionName || "Health Term"})</h2>
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="suggest-banner">
          <p className="suggest-explanation">
            {modalData.explanation || `'${modalData.query}' is a health condition or non-dataset query:`}
          </p>
        </div>

        {!hasSuggestions ? (
          <div className="unrecognized-box" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚠️</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-main)" }}>
              Not a Recognized Medicine in Dataset
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5", maxWidth: "520px", margin: "0 auto" }}>
              "{modalData.query}" is not a recognized pharmaceutical medicine or supported health condition in our 1,597 compound dataset.
              Please check the spelling or search for common medicines (e.g., Tylenol, Advil, Cofsil, Aspirin) or select from the autocomplete dropdown.
            </p>
            <button type="button" className="btn-primary" onClick={onClose} style={{ marginTop: "1.5rem" }}>
              Close & Retry
            </button>
          </div>
        ) : (
          <div className="suggest-options-grid">
            {modalData.suggestions.map((item, idx) => (
              <div key={idx} className="suggest-option-card">
                <div>
                  <div className="suggest-option-title">💊 {item.display_name}</div>
                  <div className="suggest-option-desc">
                    {item.description ? item.description : `Medical Generic: ${item.generic_compound}`}
                  </div>
                </div>
                <button
                  type="button"
                  className="suggest-option-btn"
                  onClick={() => {
                    if (modalData.onSelect) modalData.onSelect(item.generic_compound);
                    onClose();
                  }}
                >
                  + Select & Add {item.display_name}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
