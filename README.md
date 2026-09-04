# PredictDDI XAI: Explainable Deep Learning for Drug-Drug Interaction Prediction

PredictDDI is a multi-modal deep learning framework and clinical Web Application designed to predict multi-label Drug-Drug Interaction (DDI) risks and adverse mechanisms. The system combines deep neural network autoencoders across three bio-similarity modalities (Structural, Target Protein, and Gene Ontology similarity) with Kernel SHAP Explainable AI (XAI), a LangGraph agent workflow, Gemini AI drug entity mapping, and an executive Doctor Clinical PDF Report Generator.

> 📚 **Research & Database References**:
> - **Published Research Paper**: ["Multi-modal deep learning for drug-drug interaction prediction"](https://link.springer.com/article/10.1186/s12859-019-3013-0) (*BMC Bioinformatics*, DOI: 10.1186/s12859-019-3013-0)
> - **Primary Drug Knowledgebase**: [DrugBank Online Database (v5.0)](https://go.drugbank.com/)
> - **TDC Benchmark Dataset**: [Therapeutics Data Commons (TDC) DrugBank DDI Benchmark](https://tdcommons.ai/multi_pred_tasks/ddi/)
> - **BioSNAP Network**: [Stanford BioSNAP Drug-Drug Interaction Dataset](https://snap.stanford.edu/biodata/datasets/10001/10001-ChCh-Miner.html)

---

## 🌟 Key Features

- **High-Accuracy Deep Learning Model (96.49% Accuracy)**: Evaluated across 37,652 test drug pairs with 94.72% Macro Recall and 96.96% Micro Recall.
- **Explainable AI (XAI)**: Kernel SHAP feature attribution breaking down structural, target protein, and GO similarity drivers for every interaction.
- **Multi-Drug Prescription Regiment Checker**: Evaluate polypharmacy risks for up to 10 active medications simultaneously.
- **Adaptive View Formats**:
  - **$\le 5$ Medications**: Full $N \times N$ Pairwise Risk Matrix Table with sticky headers and risk color badges.
  - **$> 5$ Medications**: High-density Grouped Risk Summary View with filter chips (`All Pairs`, `🔴 High Risk`, `🟠 Moderate Risk`, `🔵 Low/Safe`).
- **Gemini AI Drug Mapping & Entity Resolution**: Automatically resolves brand names (*Tylenol* $\rightarrow$ *Acetaminophen*), typos (*ashtma* $\rightarrow$ *Asthma*), and health conditions to active pharmaceutical ingredients via interactive verification modal.
- **📄 Doctor Clinical PDF Report Generator**: Export printable, publication-grade clinical reports (`PredictDDI_Clinical_Report.pdf`) complete with pairwise risk matrix tables, detailed interaction mechanisms, bio-similarity scores, hospital header branding, and physician sign-off signature blocks via high-density rasterization.
- **Modern Responsive Web Dashboard**: Built with React, Vite, and FastAPI following a modern biotech theme and clean typography (Plus Jakarta Sans).

---

## 📊 Model Performance & Benchmarks

Evaluated on **37,652 test drug-pair samples** (Fold 0):

| Metric | Score |
| :--- | :--- |
| **Benchmark Accuracy** | **96.49%** |
| **Macro Recall** | **94.72%** |
| **Macro Precision** | **94.71%** |
| **Micro Recall** | **96.96%** |
| **Micro Precision** | **96.67%** |

---

## 🛠️ Quick Start & Setup Instructions

### 1. Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher (with `npm`)

### 2. Environment Setup & Configuration

Clone the repository and create your `.env` configuration file in the project root:

```bash
# Copy environment file template
cp .env.example .env
```

Edit `.env` to add your Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=8000
```

### 3. Pre-trained Model Checkpoint (Optional)

> [!NOTE]
> **Pre-trained Weights Location**: The pre-trained model checkpoint (`model_checkpoint`, ~183 MB) should be located at `savepoints/0/model_checkpoint`. If setting up on a new environment, place or download the checkpoint file into `savepoints/0/`:
> ```bash
> # Create directory if it does not exist
> mkdir -p savepoints/0
> 
> # Download or place the model checkpoint (if downloading from GitHub Releases or Google Drive)
> # curl -L -o savepoints/0/model_checkpoint <MODEL_DOWNLOAD_URL>
> ```

### 4. Backend Setup (FastAPI)

Create a virtual environment, install Python backend dependencies, and start the API server on port **8000**:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (VS Code PowerShell terminal)
.\venv\Scripts\Activate.ps1

# Install Python dependencies
pip install torch numpy pandas scikit-learn fastapi uvicorn pydantic requests google-genai langgraph shap matplotlib python-dotenv

# Start FastAPI backend server
python api_server.py
```
> The backend server will start on **`http://localhost:8000`**.

### 5. Frontend Setup (React + Vite)

In a separate terminal, install Node dependencies and launch the Vite development server on port **5173**:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start React Vite dev server
npm run dev
```

Open your browser and navigate to:
👉 **`http://localhost:5173`**

---

## 📄 Doctor Clinical PDF Report Generation

The application includes an executive clinical report viewer designed for healthcare providers:

1. Enter active medications in the **Multi-Drug Regiment** view.
2. Click **Generate Doctor PDF Report**.
3. View the generated document containing:
   - Active drug pills with brand & generic compound names.
   - Overall max regiment risk badge & score.
   - $N \times N$ Pairwise Risk Matrix Table or Grouped Risk Breakdown.
   - Detailed adverse interaction mechanism descriptions & bio-similarity metrics.
   - Reviewing Physician signature & date review block.
4. Click **Download PDF File** to save `PredictDDI_Clinical_Report.pdf` directly to your system.

---

## 💻 Command Line Inference & Evaluation

Evaluate test metrics or run sample predictions without starting the web server:

```bash
# Evaluate benchmark metrics on 37,652 test pairs
python predict_pretrained.py --eval

# Run sample predictions for drug pairs
python predict_pretrained.py --sample-predictions --num-samples 5
```

---

## 🔍 Explainable AI (XAI) & SHAP Pipeline

The `predict_ddi_xai/` module provides **Kernel SHAP explanations** across all 9,582 bio-similarity features ($3,194 \text{ SS} + 3,194 \text{ TS} + 3,194 \text{ GS}$):

```bash
# 1. Sample background & test reference data
python predict_ddi_xai/sampling.py

# 2. Compute Kernel SHAP feature attributions
python predict_ddi_xai/shap_analysis_kernel.py
```

---

## 🏋️ Model Training (Optional)

> [!NOTE]
> **Pre-trained Model Checkpoint Included**:
> You do **NOT** need to train the model to use PredictDDI. The repository comes pre-loaded with trained model weights (`savepoints/0/model_checkpoint`) and pre-processed similarity matrices (`data/`).

If you wish to re-train the 5-fold cross-validation multi-modal deep learning autoencoder architecture from scratch:

```bash
# Run 5-fold cross-validation training script
python src/run.py
```

---

## 📁 Repository Structure

```
predict_ddi/
├── api_server.py                 # FastAPI REST backend server (Port 8000)
├── gemini_drug_resolver.py       # Gemini AI drug entity mapping & XAI pipeline
├── xai_langgraph_pipeline.py     # LangGraph StateGraph agent execution workflow
├── predict_pretrained.py         # CLI evaluation & inference script
├── data/                         # Bio-similarity matrices (SS, TS, GS) & label mappings
├── savepoints/
│   └── 0/
│       ├── model_checkpoint      # Pre-trained Autoencoder + DNN model weights
│       └── test_data.pkl         # Test partition data
├── src/
│   ├── model.py                  # PyTorch Autoencoder + DNN architecture
│   ├── run.py                    # Training pipeline (Optional)
│   └── utils.py                  # Evaluation metrics & tensor converters
├── frontend/                     # React + Vite frontend application (Port 5173)
│   ├── src/
│   │   ├── components/           # DoctorReportModal, MultiDrugRegimentView, etc.
│   │   ├── services/             # API client services
│   │   ├── assets/               # Medical logo & icons
│   │   └── App.jsx               # Main React dashboard layout
│   ├── style.css                 # CSS design system & print styles
│   ├── vite.config.js            # Vite config with API proxy to 8000
│   └── package.json              # Frontend dependencies
├── predict_ddi_xai/              # Kernel SHAP XAI module
│   ├── sampling.py               # Background/test sampling
│   └── shap_analysis_kernel.py   # SHAP computation engine
├── PRETRAINED_MODEL_GUIDE.md     # Pre-trained checkpoint usage guide
└── README.md                     # Project documentation
```

---

## 📜 License

This project is open-source and available under the MIT License.