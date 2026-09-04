import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}

      <aside className={`dash-sidebar ${mobileOpen ? 'mobile-active' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">DDI</div>
            <div className="brand-text">
              <span className="brand-title">PredictDDI <span className="brand-accent">XAI</span></span>
              <span className="brand-sub">Biotech Analytics</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeTab === 'quick' ? 'active' : ''}`}
              onClick={() => setActiveTab('quick')}
            >
              <span className="nav-icon">⚡</span>
              <span className="nav-label">Quick Check</span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeTab === 'regiment' ? 'active' : ''}`}
              onClick={() => setActiveTab('regiment')}
            >
              <span className="nav-icon">🧪</span>
              <span className="nav-label">Multi-Drug Regiment</span>
              <span className="nav-badge">Proper Check</span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Model & XAI Specs</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="dot-live"></span> Model Engine Online
          </div>
        </div>
      </aside>
    </>
  );
}
