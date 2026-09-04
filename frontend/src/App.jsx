import React, { useState } from 'react';
import logo from './assets/logo.png';
import Sidebar from './components/Sidebar';
import QuickCheckView from './components/QuickCheckView';
import MultiDrugRegimentView from './components/MultiDrugRegimentView';
import ModelSpecsView from './components/ModelSpecsView';
import GeminiVerificationModal from './components/GeminiVerificationModal';
import BenchmarkModal from './components/BenchmarkModal';

export default function App() {
  const [activeTab, setActiveTab] = useState("regiment");
  const [regimentDrugs, setRegimentDrugs] = useState(["Tylenol", "Linagliptin", "Isavuconazole"]);
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [suggestModal, setSuggestModal] = useState({
    isOpen: false,
    query: "",
    conditionName: "",
    explanation: "",
    suggestions: [],
    onSelect: null
  });

  const handleOpenSuggestModal = (data, onSelectCallback) => {
    setSuggestModal({
      isOpen: true,
      query: data.query,
      conditionName: data.condition_name,
      explanation: data.explanation,
      suggestions: data.suggestions || [],
      onSelect: onSelectCallback
    });
  };

  const handleCloseSuggestModal = () => {
    setSuggestModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="clinical-app-shell">
      {/* Top Clinical Header Bar */}
      <header className="clinical-topbar">
        <div className="topbar-brand">
          <img src={logo} alt="PredictDDI Logo" className="brand-logo-img" />
          <div className="brand-info">
            <span className="brand-name">PredictDDI Clinical Decision Support</span>
            <span className="brand-subtag">Explainable Drug-Drug Interaction Platform</span>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="topbar-nav">
          <button
            type="button"
            className={`top-nav-btn ${activeTab === 'regiment' ? 'active' : ''}`}
            onClick={() => setActiveTab('regiment')}
          >
            Multi-Drug Regiment
          </button>
          <button
            type="button"
            className={`top-nav-btn ${activeTab === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveTab('quick')}
          >
            Quick Pairwise Check
          </button>
          <button
            type="button"
            className={`top-nav-btn ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            Model & XAI Specs
          </button>
        </nav>

        {/* Right Status & Actions */}
        <div className="topbar-meta">
          <div className="meta-status">
            <span className="live-dot"></span>
            <span>Engine Online</span>
          </div>
          <button type="button" className="benchmark-badge-btn" onClick={() => setBenchmarkOpen(true)}>
            <span>96.49% Benchmark Accuracy</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Content Area */}
      <main className="clinical-workspace">
        <div className="workspace-container">
          {activeTab === "quick" && (
            <QuickCheckView onOpenSuggestModal={handleOpenSuggestModal} />
          )}

          {activeTab === "regiment" && (
            <MultiDrugRegimentView
              regimentDrugs={regimentDrugs}
              setRegimentDrugs={setRegimentDrugs}
              onOpenSuggestModal={handleOpenSuggestModal}
            />
          )}

          {activeTab === "specs" && <ModelSpecsView />}
        </div>
      </main>

      {/* Modals */}
      <GeminiVerificationModal modalData={suggestModal} onClose={handleCloseSuggestModal} />
      <BenchmarkModal isOpen={benchmarkOpen} onClose={() => setBenchmarkOpen(false)} />
    </div>
  );
}

