import React from 'react';

export default function ModelSpecsView() {
  return (
    <div className="tab-view fade-in">
      <section className="dash-card">
        <div className="card-top">
          <div className="card-title">
            <h2>Model Architecture & Explainable AI (XAI) Specifications</h2>
            <p>Multi-modal deep learning framework combining Autoencoders, Deep Neural Networks, Kernel SHAP, and LangGraph workflow orchestration</p>
          </div>
        </div>

        {/* Core Model Metric Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-val">96.49%</span>
            <span className="metric-lbl">Benchmark Accuracy</span>
          </div>
          <div className="metric-card">
            <span className="metric-val">94.71%</span>
            <span className="metric-lbl">Macro Precision</span>
          </div>
          <div className="metric-card">
            <span className="metric-val">94.72%</span>
            <span className="metric-lbl">Macro Recall</span>
          </div>
          <div className="metric-card">
            <span className="metric-val">96.67%</span>
            <span className="metric-lbl">Micro Precision</span>
          </div>
          <div className="metric-card">
            <span className="metric-val">96.96%</span>
            <span className="metric-lbl">Micro Recall</span>
          </div>
          <div className="metric-card">
            <span className="metric-val">37,652</span>
            <span className="metric-lbl">Test Drug Pairs</span>
          </div>
        </div>

        {/* Visual Deep Learning Architecture Flow */}
        <div className="arch-pipeline-card">
          <div className="card-title">
            <h3>5-Node StateGraph Neural Execution Pipeline</h3>
            <p>End-to-end multi-modal encoder compression and LangGraph orchestration flow</p>
          </div>
          <div className="pipeline-flow-grid">
            <div className="pipeline-step-box">
              <span className="step-num-tag">Node 1</span>
              <span className="step-title">Entity Resolution</span>
              <span className="step-desc">Gemini AI resolves drug brand names & clinical conditions to canonical DB SMILES/IDs.</span>
            </div>
            <div className="pipeline-step-box">
              <span className="step-num-tag">Node 2</span>
              <span className="step-title">Bio-Feature Extraction</span>
              <span className="step-desc">Extracts 9,582 feature dimensions across SS (Structure), TS (Target), & GS (Gene Ontology).</span>
            </div>
            <div className="pipeline-step-box">
              <span className="step-num-tag">Node 3</span>
              <span className="step-title">Autoencoder Latent Code</span>
              <span className="step-desc">3 x Deep Autoencoders compress input spaces into 200d latent code vectors (600d total).</span>
            </div>
            <div className="pipeline-step-box">
              <span className="step-num-tag">Node 4</span>
              <span className="step-title">7-Layer PyTorch DNN</span>
              <span className="step-desc">Predicts multi-label probabilities across 106 interaction templates with Sigmoid logits.</span>
            </div>
            <div className="pipeline-step-box">
              <span className="step-num-tag">Node 5</span>
              <span className="step-title">XAI & Diagnosis Report</span>
              <span className="step-desc">Calculates Kernel SHAP feature weights & generates structured clinical diagnosis narratives.</span>
            </div>
          </div>
        </div>

        <div className="about-grid">
          <div className="about-box">
            <h3>Multi-Modal Bio-Similarity Compression</h3>
            <p>Processes 9,582 total feature dimensions split equally across three biological similarity modalities:</p>
            <ul className="about-list">
              <li><strong>Structural Bio-Similarity (SS)</strong>: 3,194 Tanimoto molecular fingerprint coefficient similarities.</li>
              <li><strong>Target Protein Similarity (TS)</strong>: 3,194 protein binding profile similarities.</li>
              <li><strong>Gene Ontology Annotation (GS)</strong>: 3,194 functional annotation biological process similarities.</li>
            </ul>
          </div>

          <div className="about-box">
            <h3>Autoencoder + Deep Neural Network (DNN)</h3>
            <p>Each bio-modality passes through a dedicated deep Autoencoder encoder to compress raw high-dimensional features into 200-dimensional latent code vectors (total 600 latent code size). Concatenated latent vectors feed into a 7-layer Deep Neural Network predicting multi-label logit probabilities across 106 interaction effect categories.</p>
          </div>

          <div className="about-box">
            <h3>Explainable AI (XAI) & LangGraph Engine</h3>
            <p>Integrated with <strong>Kernel SHAP</strong> feature attributions and a compiled 5-node <strong>LangGraph StateGraph Engine</strong> that logs entity resolution, feature extraction, PyTorch forward pass, latent norm attributions, and clinical diagnosis narratives in real-time.</p>
          </div>
        </div>

        {/* Paper & Database Citation Box */}
        <div className="paper-citation-box">
          <div className="citation-header">
            <div>
              <h4>Published Research Paper & Database Benchmark</h4>
              <p>Multi-modal deep learning for drug-drug interaction prediction (BMC Bioinformatics)</p>
            </div>
          </div>
          <div className="citation-links-grid" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            <p className="citation-link">
              <strong>Published Research Article:</strong>{' '}
              <a href="https://link.springer.com/article/10.1186/s12859-019-3013-0" target="_blank" rel="noopener noreferrer">
                BMC Bioinformatics (DOI: 10.1186/s12859-019-3013-0) ↗
              </a>
            </p>
            <p className="citation-link">
              <strong>💊 Primary Drug Database (DrugBank):</strong>{' '}
              <a href="https://go.drugbank.com/" target="_blank" rel="noopener noreferrer">
                DrugBank Online Knowledgebase (v5.0) ↗
              </a>
            </p>
            <p className="citation-link">
              <strong>🔬 TDC Benchmark DDI Dataset:</strong>{' '}
              <a href="https://tdcommons.ai/multi_pred_tasks/ddi/" target="_blank" rel="noopener noreferrer">
                Therapeutics Data Commons (TDC) DrugBank DDI Benchmark ↗
              </a>
            </p>
            <p className="citation-link">
              <strong>🧬 BioSNAP Interaction Network:</strong>{' '}
              <a href="https://snap.stanford.edu/biodata/datasets/10001/10001-ChCh-Miner.html" target="_blank" rel="noopener noreferrer">
                Stanford BioSNAP Drug-Drug Interaction Dataset ↗
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


