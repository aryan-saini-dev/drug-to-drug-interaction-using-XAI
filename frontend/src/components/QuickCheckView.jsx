import React, { useState, useRef } from 'react';
import DrugAutocompleteInput from './DrugAutocompleteInput';
import { SkeletonResults } from './SkeletonLoaders';
import { suggestMedicines, resolveDrug, predictDDI } from '../services/api';

export default function QuickCheckView({ onOpenSuggestModal }) {
  const [drug1, setDrug1] = useState("Linagliptin");
  const [drug2, setDrug2] = useState("Isavuconazole");
  const [loading, setLoading] = useState(false);
  const [aiBannerMsg, setAiBannerMsg] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const demoPairs = [
    { drug1: "Tylenol", drug2: "Isavuconazole" },
    { drug1: "Linagliptin", drug2: "Isavuconazole" },
    { drug1: "Bosutinib", drug2: "Troglitazone" },
    { drug1: "Phenoxymethylpenicillin", drug2: "Trospium" },
    { drug1: "Capecitabine", drug2: "Lenalidomide" }
  ];
  const demoIdxRef = useRef(0);

  const handleRandom = () => {
    const pair = demoPairs[demoIdxRef.current % demoPairs.length];
    demoIdxRef.current++;
    setDrug1(pair.drug1);
    setDrug2(pair.drug2);
  };

  const handleCopyReport = () => {
    if (!result) return;
    const text = `[PredictDDI Clinical Diagnosis Report]\nPair: ${result.drug1_name} vs ${result.drug2_name}\nRisk Level: ${result.risk_level} (${result.risk_score}%)\nNarrative: ${result.clinical_narrative}\nBio-Similarity: Structural=${result.bio_similarity.structural_similarity}, Target=${result.bio_similarity.target_similarity}, GO=${result.bio_similarity.go_similarity}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePredict = async (d1Val = drug1, d2Val = drug2) => {
    const target1 = d1Val.trim();
    const target2 = d2Val.trim();

    if (!target1 || !target2) {
      alert("Please enter both Drug A and Drug B.");
      return;
    }

    setLoading(true);

    try {
      // 1. Check if Drug A is a condition term
      const sug1Data = await suggestMedicines(target1);
      if (sug1Data.is_condition && sug1Data.suggestions && sug1Data.suggestions.length > 0) {
        setLoading(false);
        onOpenSuggestModal(sug1Data, (selected) => {
          setDrug1(selected);
          handlePredict(selected, target2);
        });
        return;
      }

      // 2. Check if Drug B is a condition term
      const sug2Data = await suggestMedicines(target2);
      if (sug2Data.is_condition && sug2Data.suggestions && sug2Data.suggestions.length > 0) {
        setLoading(false);
        onOpenSuggestModal(sug2Data, (selected) => {
          setDrug2(selected);
          handlePredict(target1, selected);
        });
        return;
      }

      // 3. Resolve exact compound names
      const r1Data = await resolveDrug(target1);
      const r2Data = await resolveDrug(target2);

      const msg = `Resolved '${target1}' ➔ '${r1Data.mapped_name}' and '${target2}' ➔ '${r2Data.mapped_name}'.`;
      setAiBannerMsg(msg);

      // 4. Perform Prediction
      const data = await predictDDI(r1Data.mapped_name, r2Data.mapped_name);
      setResult(data);
    } catch (err) {
      console.error("Prediction API error:", err);
      alert(err.message || "Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-view">
      {/* Selection Workbench */}
      <section className="dash-card workbench-card">
        <div className="card-top">
          <div className="card-title">
            <h2>Select Pair for Interaction Check</h2>
            <p>Enter medicine or brand names to evaluate pairwise drug interactions</p>
          </div>
          <button type="button" className="btn-secondary" onClick={handleRandom}>Random Pair</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handlePredict(); }}>
          <div className="drug-input-grid">
            <DrugAutocompleteInput
              label="Drug A (Compound 1)"
              id="drug1-input"
              value={drug1}
              onChange={setDrug1}
              placeholder="Click or type (e.g. Tylenol, Linagliptin)..."
            />
            <div className="versus-badge"><span>VS</span></div>
            <DrugAutocompleteInput
              label="Drug B (Compound 2)"
              id="drug2-input"
              value={drug2}
              onChange={setDrug2}
              placeholder="Click or type (e.g. Isavuconazole)..."
            />
          </div>

          {aiBannerMsg && (
            <div className="gemini-ai-banner fade-in">
              <div className="ai-banner-header">
                <span className="ai-chip">Compound Entity Resolution</span>
              </div>
              <p className="ai-banner-text">{aiBannerMsg}</p>
            </div>
          )}

          {/* Preset Chips */}
          <div className="presets-row">
            <span className="presets-label">Quick Demos:</span>
            <button type="button" className="preset-chip" onClick={() => { setDrug1("Tylenol"); setDrug2("Isavuconazole"); handlePredict("Tylenol", "Isavuconazole"); }}>Tylenol + Isavuconazole</button>
            <button type="button" className="preset-chip" onClick={() => { setDrug1("Linagliptin"); setDrug2("Isavuconazole"); handlePredict("Linagliptin", "Isavuconazole"); }}>Linagliptin + Isavuconazole</button>
            <button type="button" className="preset-chip" onClick={() => { setDrug1("Phenoxymethylpenicillin"); setDrug2("Trospium"); handlePredict("Phenoxymethylpenicillin", "Trospium"); }}>Penicillin + Trospium</button>
            <button type="button" className="preset-chip" onClick={() => { setDrug1("Capecitabine"); setDrug2("Lenalidomide"); handlePredict("Capecitabine", "Lenalidomide"); }}>Capecitabine + Lenalidomide</button>
          </div>

          <div className="action-row">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span>Evaluating Interaction Risk...</span>
                  <span className="spinner"></span>
                </>
              ) : (
                <span>Check Compound Interaction</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Catalog Dashboard */}
      <section className="dash-card med-catalog-card">
        <div className="card-top">
          <div className="card-title">
            <h2>Popular Medicines Catalog</h2>
            <p>Explore common brand & generic medicines</p>
          </div>
          <span className="badge badge-indigo">Click to Compare</span>
        </div>

        <div className="med-catalog-grid">
          <div className="med-card" onClick={() => { setDrug1("Tylenol"); setDrug2("Isavuconazole"); handlePredict("Tylenol", "Isavuconazole"); }}>
            <div className="med-top"><span className="med-brand">Tylenol</span><span className="badge badge-cyan">Analgesic</span></div>
            <div className="med-generic">Active: Acetaminophen</div>
            <p className="med-desc">Common analgesic compound.</p>
            <button className="med-btn">Compare Pair</button>
          </div>

          <div className="med-card" onClick={() => { setDrug1("Advil"); setDrug2("Linagliptin"); handlePredict("Advil", "Linagliptin"); }}>
            <div className="med-top"><span className="med-brand">Advil</span><span className="badge badge-cyan">NSAID</span></div>
            <div className="med-generic">Active: Ibuprofen</div>
            <p className="med-desc">Non-steroidal anti-inflammatory compound.</p>
            <button className="med-btn">Compare Pair</button>
          </div>

          <div className="med-card" onClick={() => { setDrug1("Phenoxymethylpenicillin"); setDrug2("Trospium"); handlePredict("Phenoxymethylpenicillin", "Trospium"); }}>
            <div className="med-top"><span className="med-brand">Penicillin V</span><span className="badge badge-cyan">Antibiotic</span></div>
            <div className="med-generic">Active: Phenoxymethylpenicillin</div>
            <p className="med-desc">Beta-lactam antibiotic compound.</p>
            <button className="med-btn">Compare Pair</button>
          </div>

          <div className="med-card" onClick={() => { setDrug1("Capecitabine"); setDrug2("Lenalidomide"); handlePredict("Capecitabine", "Lenalidomide"); }}>
            <div className="med-top"><span className="med-brand">Xeloda</span><span className="badge badge-cyan">Oncology</span></div>
            <div className="med-generic">Active: Capecitabine</div>
            <p className="med-desc">Antineoplastic chemotherapeutic compound.</p>
            <button className="med-btn">Compare Pair</button>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {loading ? (
        <SkeletonResults />
      ) : result && (
        <section className="results-container fade-in">
          {/* Risk Banner */}
          <div className="dash-card risk-card">
            <div className="risk-left">
              <span className={`risk-tag ${result.risk_level.includes("HIGH") ? "risk-high" : result.risk_level.includes("MODERATE") ? "risk-mod" : "risk-low"}`}>
                {result.risk_level}
              </span>
              <div className="risk-info">
                <h3>{result.drug1_name} <span className="vs-text">vs</span> {result.drug2_name}</h3>
                <p>Evaluated across 106 interaction effect categories</p>
              </div>
            </div>
            <div className="risk-right">
              <div className="score-dial">
                <span>{result.risk_score}%</span>
                <span className="dial-lbl">Max Risk</span>
              </div>
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="dash-card narrative-card">
            <div className="card-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Clinical Narrative Summary</h3>
              <button type="button" className="btn-secondary" onClick={handleCopyReport}>
                {copied ? "Copied to Clipboard!" : "Copy Summary"}
              </button>
            </div>
            <p className="narrative-p">{result.clinical_narrative}</p>
          </div>

          {/* Results Grid */}
          <div className="results-grid">
            <div className="results-col">
              <div className="dash-card">
                <div className="card-top">
                  <h3>Predicted Interaction Effects</h3>
                  <span className="badge badge-indigo">{result.active_interactions_count} Active</span>
                </div>
                <div className="interactions-list">
                  {result.interactions.map((item, idx) => (
                    <div key={idx} className="interaction-card">
                      <div className="interaction-top">
                        <span className={`sev-tag ${item.severity.includes("High") ? "risk-high" : item.severity.includes("Moderate") ? "risk-mod" : "risk-low"}`}>
                          {item.severity}
                        </span>
                        <span className="prob-pct">{item.confidence_percent}% Confidence</span>
                      </div>
                      <p className="interaction-text">{item.formatted_text}</p>
                      <div className="bar-bg">
                        <div className="bar-fill fill-cyan" style={{ width: `${item.confidence_percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="results-col">
              <div className="dash-card">
                <div className="card-top"><h3>Bio-Similarity Modalities</h3></div>
                <div className="sim-list">
                  <div className="sim-row">
                    <div className="sim-meta"><span className="sim-label">Structural (SS)</span><span className="sim-val">{result.bio_similarity.structural_similarity.toFixed(4)}</span></div>
                    <div className="bar-bg"><div className="bar-fill fill-cyan" style={{ width: `${Math.min(100, result.bio_similarity.structural_similarity * 100)}%` }}></div></div>
                  </div>
                  <div className="sim-row">
                    <div className="sim-meta"><span className="sim-label">Target Protein (TS)</span><span className="sim-val">{result.bio_similarity.target_similarity.toFixed(4)}</span></div>
                    <div className="bar-bg"><div className="bar-fill fill-cyan" style={{ width: `${Math.min(100, result.bio_similarity.target_similarity * 100)}%` }}></div></div>
                  </div>
                  <div className="sim-row">
                    <div className="sim-meta"><span className="sim-label">Gene Ontology (GS)</span><span className="sim-val">{result.bio_similarity.go_similarity.toFixed(4)}</span></div>
                    <div className="bar-bg"><div className="bar-fill fill-green" style={{ width: `${Math.min(100, result.bio_similarity.go_similarity * 100)}%` }}></div></div>
                  </div>
                </div>
              </div>

              <div className="dash-card xai-card">
                <div className="card-top">
                  <h3>Feature Attributions</h3>
                  <span className="badge badge-cyan">Encoder Weights</span>
                </div>
                <p className="xai-sub">Primary Driver: <strong className="gradient-text">{result.xai_modal_attributions.primary_driver}</strong></p>
                <div className="xai-stack">
                  <div className="xai-bar ss-bar" style={{ width: `${result.xai_modal_attributions.structural_weight}%` }}></div>
                  <div className="xai-bar ts-bar" style={{ width: `${result.xai_modal_attributions.target_weight}%` }}></div>
                  <div className="xai-bar gs-bar" style={{ width: `${result.xai_modal_attributions.go_weight}%` }}></div>
                </div>
                <div className="xai-legend">
                  <div className="leg-item"><span className="leg-dot ss-dot"></span> Structural ({result.xai_modal_attributions.structural_weight}%)</div>
                  <div className="leg-item"><span className="leg-dot ts-dot"></span> Target ({result.xai_modal_attributions.target_weight}%)</div>
                  <div className="leg-item"><span className="leg-dot gs-dot"></span> GO ({result.xai_modal_attributions.go_weight}%)</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
