import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import logo from '../assets/logo.png';

export default function DoctorReportModal({ isOpen, onClose, matrixData, regimentDrugs }) {
  if (!isOpen || !matrixData) return null;

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = () => {
    const element = document.getElementById('doctor-printable-area');
    if (!element) return;

    setIsGeneratingPDF(true);
    const dateStr = new Date().toISOString().slice(0, 10);
    const opt = {
      margin: [0.25, 0.25, 0.25, 0.25],
      filename: `PredictDDI_Clinical_Report_${dateStr}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 4, 
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff',
        letterRendering: true
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait', compress: true }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsGeneratingPDF(false);
    }).catch((err) => {
      console.error('PDF Generation Error:', err);
      setIsGeneratingPDF(false);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getRiskLevelBadge = (score) => {
    if (score >= 50) return { label: 'HIGH RISK REGIMENT', class: 'doc-badge-high' };
    if (score >= 25) return { label: 'MODERATE RISK REGIMENT', class: 'doc-badge-mod' };
    return { label: 'LOW RISK REGIMENT', class: 'doc-badge-low' };
  };

  const overallRiskInfo = getRiskLevelBadge(matrixData.maxOverallRiskScore);

  return (
    <div className="modal-overlay doctor-report-overlay" onClick={onClose}>
      <div className="modal-card doctor-report-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Control Bar (Hidden during PDF print) */}
        <div className="no-print doctor-report-topbar">
          <div className="topbar-left">
            <span className="doc-type-tag">📄 Clinical Assessment Document</span>
            <h2 className="topbar-title">Doctor Clinical PDF Report</h2>
          </div>
          <div className="topbar-actions">
            <button 
              type="button" 
              className="btn-print-action" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <>
                  <span className="mini-spinner"></span>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download PDF File
                </>
              )}
            </button>
            <button type="button" className="btn-secondary-action" onClick={handlePrint} title="Print paper copy">
              🖨️ Print
            </button>
            <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Close modal">&times;</button>
          </div>
        </div>

        {/* Printable Paper / PDF Document */}
        <div className="doc-paper-body" id="doctor-printable-area">
          
          {/* Header Banner */}
          <div className="doc-header-banner">
            <div className="doc-brand-block">
              <img src={logo} alt="PredictDDI Logo" className="doc-logo-img" />
              <div>
                <h1 className="doc-main-title">Clinical Assessment Report</h1>
                <p className="doc-main-subtitle">Explainable Drug-Drug Interaction Evaluation for Healthcare Providers</p>
              </div>
            </div>
            <div className="doc-meta-block">
              <div className="doc-meta-row">
                <span className="doc-meta-label">Date Generated:</span>
                <span className="doc-meta-value">{currentDate}</span>
              </div>
              <div className="doc-meta-row">
                <span className="doc-meta-label">XAI Assessment Engine:</span>
                <span className="doc-meta-value">PredictDDI Autoencoder DNN</span>
              </div>
              <div className="doc-meta-row">
                <span className="doc-meta-label">Benchmark Accuracy:</span>
                <span className="doc-meta-value highlight">96.49%</span>
              </div>
            </div>
          </div>

          {/* Active Medication Regiment */}
          <div className="doc-card-block">
            <h3 className="doc-block-heading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path>
                <path d="m8.5 8.5 7 7"></path>
              </svg>
              Active Prescribed Regiment ({regimentDrugs.length} Medication{regimentDrugs.length === 1 ? '' : 's'})
            </h3>
            <div className="doc-drugs-grid">
              {regimentDrugs.map((drug, idx) => (
                <div key={idx} className="doc-drug-chip">
                  <span className="chip-bullet">•</span>
                  <span className="chip-name">{drug}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regiment Risk Banner */}
          <div className={`doc-risk-banner-card ${overallRiskInfo.class}`}>
            <div className="banner-risk-info">
              <span className={`doc-status-badge ${overallRiskInfo.class}`}>
                {overallRiskInfo.label}
              </span>
              <p className="banner-desc">
                Evaluated across <strong>{matrixData.numPairs}</strong> pairwise drug combination{matrixData.numPairs === 1 ? '' : 's'}.
              </p>
            </div>
            <div className="banner-score-callout">
              <span className="score-number">{matrixData.maxOverallRiskScore}%</span>
              <span className="score-label">Max Regiment Risk</span>
            </div>
          </div>

          {/* Pairwise Interaction Risk Matrix Table */}
          <div className="doc-card-block">
            <h3 className="doc-block-heading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                <line x1="3" x2="21" y1="9" y2="9"></line>
                <line x1="3" x2="21" y1="15" y2="15"></line>
                <line x1="9" x2="9" y1="3" y2="21"></line>
                <line x1="15" x2="15" y1="3" y2="21"></line>
              </svg>
              Pairwise Interaction Risk Matrix (N × N)
            </h3>
            <div className="doc-table-container">
              <table className="doc-matrix-grid">
                <thead>
                  <tr>
                    <th className="th-corner">Medication</th>
                    {matrixData.drugsList.map((d, idx) => {
                      const shortName = d.length > 18 ? d.slice(0, 16) + '…' : d;
                      return <th key={idx} className="th-drug" title={d}>{shortName}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.drugsList.map((rowDrug, i) => {
                    const rowShort = rowDrug.length > 18 ? rowDrug.slice(0, 16) + '…' : rowDrug;
                    return (
                      <tr key={i}>
                        <td className="td-row-header" title={rowDrug}>{rowShort}</td>
                        {matrixData.drugsList.map((colDrug, j) => {
                          if (i === j) {
                            return <td key={j} className="td-cell-diag">—</td>;
                          }
                          const item = matrixData.matrix[i][j];
                          if (!item) return <td key={j} className="td-cell">N/A</td>;

                          let cellStyleClass = "cell-risk-low";
                          if (item.risk_score >= 50) cellStyleClass = "cell-risk-high";
                          else if (item.risk_score >= 25) cellStyleClass = "cell-risk-mod";

                          return (
                            <td key={j} className={`td-cell ${cellStyleClass}`}>
                              <span className="cell-val">{item.risk_score}%</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Pairwise Clinical Warnings */}
          <div className="doc-card-block">
            <h3 className="doc-block-heading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" x2="12" y1="9" y2="13"></line>
                <line x1="12" x2="12.01" y1="17" y2="17"></line>
              </svg>
              Detailed Pairwise Clinical Warnings
            </h3>

            <div className="doc-warnings-list">
              {matrixData.pairwiseResults.map((pair, idx) => {
                const data = pair.result;
                const topInteractionText = (data.interactions && data.interactions.length > 0)
                  ? data.interactions[0].formatted_text
                  : "No major adverse interaction effects detected between these drugs.";

                const isHigh = data.risk_level.includes("HIGH");
                const isMod = data.risk_level.includes("MODERATE");
                const cardSeverityClass = isHigh ? "card-high" : isMod ? "card-mod" : "card-low";
                const badgeClass = isHigh ? "badge-high" : isMod ? "badge-mod" : "badge-low";

                return (
                  <div key={idx} className={`doc-warning-card ${cardSeverityClass}`}>
                    <div className="warning-card-header">
                      <div className="pair-names font-heading">
                        {pair.drug1} <span className="plus-sign">+</span> {pair.drug2}
                      </div>
                      <div className="pair-badges">
                        <span className={`warning-risk-badge ${badgeClass}`}>
                          {data.risk_level}
                        </span>
                        <span className="warning-score-badge">
                          {data.risk_score}% Risk
                        </span>
                      </div>
                    </div>

                    <p className="warning-interaction-text">
                      {topInteractionText}
                    </p>

                    {data.bio_similarity && (
                      <div className="biosim-metrics-grid">
                        <div className="biosim-item">
                          <span className="biosim-label">Structural Similarity:</span>
                          <span className="biosim-val">{data.bio_similarity.structural_similarity.toFixed(4)}</span>
                        </div>
                        <div className="biosim-item">
                          <span className="biosim-label">Target Protein Similarity:</span>
                          <span className="biosim-val">{data.bio_similarity.target_similarity.toFixed(4)}</span>
                        </div>
                        <div className="biosim-item">
                          <span className="biosim-label">GO Similarity:</span>
                          <span className="biosim-val">{data.bio_similarity.go_similarity.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Physician Notice & Sign-off Footer */}
          <div className="doc-footer-section">
            <div className="doc-physician-notice">
              <strong>🩺 Clinical Notice:</strong> This report is generated by PredictDDI XAI using deep neural network autoencoders to assist healthcare professionals in evaluating polypharmacy risks. Please review all identified pairwise interaction mechanisms prior to modifying medication regimens.
            </div>

            <div className="doc-signature-grid">
              <div className="signature-box">
                <div className="sign-line"></div>
                <div className="sign-label">Reviewing Physician Signature</div>
              </div>
              <div className="signature-box">
                <div className="sign-line"></div>
                <div className="sign-label">Date of Assessment & Review</div>
              </div>
            </div>

            <div className="doc-print-footer-tag">
              <span>PredictDDI Clinical Assessment Engine v2.4</span>
              <span>Page 1 of 1</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

