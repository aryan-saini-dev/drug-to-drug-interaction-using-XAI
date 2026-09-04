import React, { useState, useEffect, useCallback } from 'react';
import DrugAutocompleteInput from './DrugAutocompleteInput';
import { SkeletonMatrix, SkeletonInteractions } from './SkeletonLoaders';
import { suggestMedicines, resolveDrug, predictDDI } from '../services/api';
import DoctorReportModal from './DoctorReportModal';

export default function MultiDrugRegimentView({ regimentDrugs, setRegimentDrugs, onOpenSuggestModal }) {
  const [inputVal, setInputVal] = useState("");
  const [adding, setAdding] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  const [showMatrixForLargeRegiment, setShowMatrixForLargeRegiment] = useState(false);
  const [filterLevel, setFilterLevel] = useState("ALL");

  const evaluateRegiment = useCallback(async (drugsList = regimentDrugs) => {
    if (drugsList.length < 2) {
      setMatrixData(null);
      return;
    }

    setEvaluating(true);

    try {
      // Resolve all drugs
      const resolvedMap = {};
      for (let drug of drugsList) {
        try {
          const data = await resolveDrug(drug);
          resolvedMap[drug] = data.mapped_name || drug;
        } catch (e) {
          resolvedMap[drug] = drug;
        }
      }

      const n = drugsList.length;
      const matrix = Array.from({ length: n }, () => Array(n).fill(null));
      const pairwiseResults = [];
      let maxOverallRiskScore = 0;
      let highRiskCount = 0;
      let modRiskCount = 0;
      let lowRiskCount = 0;

      for (let i = 0; i < n; i++) {
        matrix[i][i] = { risk_score: 0, level: "SELF" };
        for (let j = i + 1; j < n; j++) {
          const d1Name = drugsList[i];
          const d2Name = drugsList[j];
          const d1Mapped = resolvedMap[d1Name];
          const d2Mapped = resolvedMap[d2Name];

          try {
            const data = await predictDDI(d1Mapped, d2Mapped);
            matrix[i][j] = data;
            matrix[j][i] = data;
            if (data.risk_score > maxOverallRiskScore) maxOverallRiskScore = data.risk_score;

            if (data.risk_score >= 50) highRiskCount++;
            else if (data.risk_score >= 25) modRiskCount++;
            else lowRiskCount++;

            pairwiseResults.push({
              drug1: d1Name,
              drug2: d2Name,
              mapped1: d1Mapped,
              mapped2: d2Mapped,
              result: data
            });
          } catch (err) {
            console.error(`Error predicting ${d1Name} + ${d2Name}:`, err);
          }
        }
      }

      pairwiseResults.sort((a, b) => b.result.risk_score - a.result.risk_score);

      setMatrixData({
        n,
        drugsList,
        matrix,
        pairwiseResults,
        maxOverallRiskScore,
        numPairs: (n * (n - 1)) / 2,
        highRiskCount,
        modRiskCount,
        lowRiskCount
      });
    } catch (err) {
      console.error("Error evaluating regiment:", err);
    } finally {
      setEvaluating(false);
    }
  }, [regimentDrugs]);

  useEffect(() => {
    evaluateRegiment(regimentDrugs);
  }, [regimentDrugs, evaluateRegiment]);

  const handleAddDrug = async () => {
    const val = inputVal.trim();
    if (!val) {
      alert("Please enter a medicine name or health condition.");
      return;
    }

    if (regimentDrugs.length >= 10) {
      alert("Maximum limit of 10 medications reached. Please remove a medication before adding another.");
      return;
    }

    setAdding(true);

    try {
      const data = await suggestMedicines(val);

      if (data.is_condition || data.is_unrecognized) {
        setAdding(false);
        onOpenSuggestModal(data, (selectedDrug) => {
          addDrugToList(selectedDrug);
        });
        setInputVal("");
        return;
      }

      if (data.direct_match) {
        addDrugToList(data.direct_match.generic_compound);
        setInputVal("");
        return;
      }

      // If generic compound, resolve exact DB name
      try {
        const rData = await resolveDrug(val);
        addDrugToList(rData.mapped_name || val);
      } catch (e) {
        addDrugToList(val);
      }
      setInputVal("");
    } catch (err) {
      console.error("Error suggesting medicines:", err);
      try {
        const rData = await resolveDrug(val);
        addDrugToList(rData.mapped_name || val);
      } catch (e) {
        addDrugToList(val);
      }
      setInputVal("");
    } finally {
      setAdding(false);
    }
  };

  const addDrugToList = (drugName) => {
    if (regimentDrugs.length >= 10) {
      alert("Maximum limit of 10 medications reached. Please remove a medication before adding another.");
      return;
    }
    if (regimentDrugs.map(d => d.toLowerCase()).includes(drugName.toLowerCase())) {
      alert(`'${drugName}' is already in your active medication list.`);
      return;
    }
    const updated = [...regimentDrugs, drugName];
    setRegimentDrugs(updated);
  };

  const handleRemoveDrug = (index) => {
    const updated = regimentDrugs.filter((_, idx) => idx !== index);
    setRegimentDrugs(updated);
  };

  const filteredPairwiseResults = matrixData ? matrixData.pairwiseResults.filter(pair => {
    if (filterLevel === "HIGH") return pair.result.risk_score >= 50;
    if (filterLevel === "MODERATE") return pair.result.risk_score >= 25 && pair.result.risk_score < 50;
    if (filterLevel === "LOW") return pair.result.risk_score < 25;
    return true;
  }) : [];

  return (
    <div className="tab-view">
      <section className="dash-card">
        <div className="card-top">
          <div className="card-title">
            <h2>Multi-Drug Regiment Checker (Proper Check)</h2>
            <p>Add up to 10 medications in a prescription list. The system automatically computes pairwise interaction risks across ALL added medications in real-time!</p>
          </div>
        </div>

        {/* Input Toolbar */}
        <div className="regiment-input-toolbar">
          <div className="flex-grow">
            <DrugAutocompleteInput
              id="regiment-input"
              value={inputVal}
              onChange={setInputVal}
              disabled={regimentDrugs.length >= 10}
              placeholder={regimentDrugs.length >= 10 ? "Maximum 10 medications limit reached. Remove a medication to add more." : "Type medicine name or health condition (e.g. Tylenol, Advil, asthma, fever)..."}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddDrug();
                }
              }}
            />
          </div>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleAddDrug} 
            disabled={adding || regimentDrugs.length >= 10}
          >
            {adding ? (
              <>
                <span>Verifying...</span>
                <span className="spinner"></span>
              </>
            ) : (
              <span>+ Add to Medication List</span>
            )}
          </button>
        </div>

        {adding && (
          <div className="gemini-ai-banner fade-in" style={{ marginTop: "0.75rem", marginBottom: "1rem" }}>
            <div className="ai-banner-header">
              <span className="ai-chip">Verifying Query...</span>
            </div>
            <p className="ai-banner-text">Gemini AI is verifying medication entities and checking for health condition matches...</p>
          </div>
        )}

        {/* Chips List */}
        <div className="regiment-list-container">
          <div className="regiment-list-header">
            <span className="regiment-list-label">Active Medication List ({regimentDrugs.length}/10):</span>
            {regimentDrugs.length >= 10 && (
              <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>Max 10 Limit Reached</span>
            )}
          </div>
          <div className="regiment-chips-list">
            {regimentDrugs.length === 0 ? (
              <span className="text-muted">No medications added yet. Add drugs above to check pairwise interactions!</span>
            ) : (
              regimentDrugs.map((drug, index) => (
                <div key={index} className="regiment-chip pop-in">
                  <span>{drug}</span>
                  <button type="button" className="chip-remove-btn" onClick={() => handleRemoveDrug(index)} title="Remove medication">&times;</button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      {regimentDrugs.length >= 2 && (
        <section style={{ marginTop: "1.75rem" }}>
          {evaluating ? (
            <div className="results-grid fade-in">
              <div className="results-col"><SkeletonMatrix rows={regimentDrugs.length} cols={regimentDrugs.length} /></div>
              <div className="results-col"><SkeletonInteractions count={3} /></div>
            </div>
          ) : matrixData && (
            <div className="fade-in">
              {/* Summary Card with Generate Report Button */}
              <div className="dash-card risk-card" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="risk-left">
                  <span className={`risk-tag ${matrixData.maxOverallRiskScore >= 50 ? "risk-high" : matrixData.maxOverallRiskScore >= 25 ? "risk-mod" : "risk-low"}`}>
                    {matrixData.maxOverallRiskScore >= 50 ? "HIGH RISK REGIMENT" : matrixData.maxOverallRiskScore >= 25 ? "MODERATE RISK REGIMENT" : "SAFE REGIMENT"}
                  </span>
                  <div>
                    <h3>Regiment Analysis ({matrixData.n} Medications)</h3>
                    <p>Pairwise risk evaluation completed across {matrixData.numPairs} drug combination{matrixData.numPairs === 1 ? '' : 's'}</p>
                  </div>
                </div>

                <div className="risk-right">
                  <button type="button" className="btn-primary" onClick={() => setReportOpen(true)}>
                    📄 Generate Doctor PDF Report
                  </button>
                </div>
              </div>

              {/* Display format condition: <= 5 drugs vs > 5 drugs */}
              {matrixData.n <= 5 || showMatrixForLargeRegiment ? (
                /* Standard 2-Column Matrix + Warnings View for <= 5 drugs (or toggled) */
                <div className="results-grid">
                  {/* Matrix Column */}
                  <div className="results-col">
                    <div className="dash-card">
                      <div className="card-top">
                        <div>
                          <h3>📊 Pairwise Interaction Risk Matrix</h3>
                          {matrixData.n > 5 && (
                            <button 
                              type="button" 
                              className="btn-toggle-view" 
                              onClick={() => setShowMatrixForLargeRegiment(false)}
                              style={{ marginTop: '0.25rem', fontSize: '0.78rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              ← Switch to High-Risk Grouped View
                            </button>
                          )}
                        </div>
                        <span className="badge badge-cyan">{matrixData.numPairs} Pairs Evaluated</span>
                      </div>
                      <div className="matrix-wrapper">
                        <table className="matrix-table">
                          <thead>
                            <tr>
                              <th className="th-matrix-corner">Medication</th>
                              {matrixData.drugsList.map((d, idx) => {
                                const shortName = d.length > 20 ? d.slice(0, 18) + '…' : d;
                                return <th key={idx} className="th-matrix-col" title={d}>{shortName}</th>;
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {matrixData.drugsList.map((rowDrug, i) => {
                              const rowShort = rowDrug.length > 20 ? rowDrug.slice(0, 18) + '…' : rowDrug;
                              return (
                                <tr key={i}>
                                  <th className="th-matrix-row" title={rowDrug}>{rowShort}</th>
                                  {matrixData.drugsList.map((colDrug, j) => {
                                    if (i === j) return <td key={j} className="cell-self">-</td>;
                                    const item = matrixData.matrix[i][j];
                                    if (!item) return <td key={j}>N/A</td>;
                                    let cellClass = "cell-safe";
                                    if (item.risk_score >= 50) cellClass = "cell-high";
                                    else if (item.risk_score >= 25) cellClass = "cell-mod";
                                    return (
                                      <td key={j} className={cellClass} title={`${rowDrug} + ${colDrug}: ${item.risk_score}%`}>
                                        {item.risk_score}%
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
                  </div>

                  {/* Warnings Column */}
                  <div className="results-col">
                    <div className="dash-card">
                      <div className="card-top"><h3>🚨 Detailed Pairwise Warnings</h3></div>
                      <div className="interactions-list">
                        {matrixData.pairwiseResults.length === 0 ? (
                          <p className="text-muted">No interactions detected.</p>
                        ) : (
                          matrixData.pairwiseResults.map((pair, idx) => {
                            const data = pair.result;
                            const topInteractionText = data.interactions && data.interactions.length > 0 ? data.interactions[0].formatted_text : "No major adverse interactions predicted.";
                            return (
                              <div key={idx} className="interaction-card">
                                <div className="interaction-header-block">
                                  <div className="interaction-pair-title">
                                    <span className="pair-names">{pair.drug1} + {pair.drug2}</span>
                                    <span className={`sev-tag ${data.risk_level.includes("HIGH") ? "risk-high" : data.risk_level.includes("MODERATE") ? "risk-mod" : "risk-low"}`}>
                                      {data.risk_level}
                                    </span>
                                  </div>
                                  <span className="prob-pct">{data.risk_score}% Risk</span>
                                </div>
                                <p className="interaction-text">{topInteractionText}</p>
                                <div className="bar-bg">
                                  <div className="bar-fill fill-cyan" style={{ width: `${data.risk_score}%` }}></div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* High-Density Grouped Summary View for > 5 drugs */
                <div className="dash-card large-regiment-summary-card">
                  <div className="card-top" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="badge badge-purple">Large Regiment Summary</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>({matrixData.n} Medications / {matrixData.numPairs} Pairwise Combinations)</span>
                      </div>
                      <h3 style={{ marginTop: '0.35rem' }}>📊 High-Risk Interaction Pairwise Breakdown</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        className="btn-secondary-action" 
                        onClick={() => setShowMatrixForLargeRegiment(true)}
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                      >
                        🔍 View Raw NxN Matrix Table
                      </button>
                    </div>
                  </div>

                  {/* Filter & Stat Bar */}
                  <div className="large-regiment-statbar">
                    <div className="stat-chips-group">
                      <button 
                        type="button"
                        className={`stat-chip ${filterLevel === 'ALL' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('ALL')}
                      >
                        All Pairs ({matrixData.numPairs})
                      </button>
                      <button 
                        type="button"
                        className={`stat-chip chip-high ${filterLevel === 'HIGH' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('HIGH')}
                      >
                        🔴 High Risk ({matrixData.highRiskCount})
                      </button>
                      <button 
                        type="button"
                        className={`stat-chip chip-mod ${filterLevel === 'MODERATE' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('MODERATE')}
                      >
                        🟠 Moderate Risk ({matrixData.modRiskCount})
                      </button>
                      <button 
                        type="button"
                        className={`stat-chip chip-low ${filterLevel === 'LOW' ? 'active' : ''}`}
                        onClick={() => setFilterLevel('LOW')}
                      >
                        🔵 Low / Safe ({matrixData.lowRiskCount})
                      </button>
                    </div>
                  </div>

                  {/* Pairwise Summary List Table */}
                  <div className="large-regiment-table-wrap">
                    <table className="large-regiment-table">
                      <thead>
                        <tr>
                          <th>Medication Combination</th>
                          <th>Risk Severity Level</th>
                          <th>Risk Score</th>
                          <th>Primary Interaction Mechanism</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPairwiseResults.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                              No pairwise combinations found for the selected risk filter.
                            </td>
                          </tr>
                        ) : (
                          filteredPairwiseResults.map((pair, idx) => {
                            const data = pair.result;
                            const topText = data.interactions && data.interactions.length > 0
                              ? data.interactions[0].formatted_text
                              : "No major adverse interaction mechanism predicted.";
                            const isHigh = data.risk_score >= 50;
                            const isMod = data.risk_score >= 25 && data.risk_score < 50;

                            return (
                              <tr key={idx} className={isHigh ? 'tr-high' : isMod ? 'tr-mod' : 'tr-low'}>
                                <td className="td-pair-name">
                                  <strong>{pair.drug1}</strong> + <strong>{pair.drug2}</strong>
                                </td>
                                <td>
                                  <span className={`sev-tag ${isHigh ? 'risk-high' : isMod ? 'risk-mod' : 'risk-low'}`}>
                                    {data.risk_level}
                                  </span>
                                </td>
                                <td>
                                  <span className="score-val-badge">{data.risk_score}%</span>
                                </td>
                                <td className="td-mech-text">
                                  {topText}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Doctor Report Modal */}
      <DoctorReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        matrixData={matrixData}
        regimentDrugs={regimentDrugs}
      />
    </div>
  );
}
