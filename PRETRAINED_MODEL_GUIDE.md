# Pre-Trained DDI Model Guide (No Training Required)

This guide explains how to perform **inference, evaluation, and XAI explainability** using the pre-trained Drug-Drug Interaction (DDI) deep learning model checkpoint located at:

`./savepoints/0/model_checkpoint`

> [!NOTE]
> **No Model Retraining Needed**: The model weights have already been trained across 5-fold cross-validation. You can immediately load the pre-trained checkpoint to evaluate predictions or explain feature attributions.

---

## 📊 Pre-Trained Benchmark Results

When evaluated on the test partition (**37,652 test drug pairs**):

| Metric | Score | Percentage |
| :--- | :--- | :--- |
| **Accuracy** | **0.9649** | **96.49%** |
| **Macro Recall** | **0.9472** | **94.72%** |
| **Macro Precision** | **0.9471** | **94.71%** |
| **Micro Recall** | **0.9696** | **96.96%** |
| **Micro Precision** | **0.9667** | **96.67%** |

---

## ⚡ Quickstart Command Line Tool

We provide a standalone CLI script [`predict_pretrained.py`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/predict_pretrained.py) to run model evaluation and predictions directly.

### 1. Evaluate Pre-Trained Model Accuracy & Metrics

To evaluate model accuracy on the 37,652 test dataset pairs:

```bash
python predict_pretrained.py --eval
```

### 2. Predict Interactions for Sample Drug Pairs

To print predicted interaction effects for sample drug pairs in the dataset:

```bash
python predict_pretrained.py --sample-predictions --num-samples 5
```

### 3. Specify Custom Checkpoint Path

If your model checkpoint is stored in a custom path:

```bash
python predict_pretrained.py --checkpoint ./savepoints/0/model_checkpoint --eval
```

---

## 🐍 Python API Usage Guide

If you are incorporating the pre-trained model into custom Python code or notebooks:

### Step 1: Import Dependencies & Load Hyperparameters

```python
import json
import torch
import pandas as pd
from src.model import build_model
from src.utils import convert_tensor, evaluate_model

# 1. Load hyperparameter configuration
with open('./data/hyperparameter.json', 'r') as f:
    hparams = json.load(f)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
```

### Step 2: Load Pre-Trained Model Weights

```python
# 2. Build model architecture & load checkpoint weights
model = build_model(hparams)
model.load_model('./savepoints/0/model_checkpoint')
model.eval()  # Set model to evaluation mode
```

### Step 3: Prepare Input Data & Matrices

```python
# 3. Load test data and bio-similarity matrices
x_test, y_test = pd.read_pickle('./savepoints/0/test_data.pkl')
SS_mat = pd.read_pickle('./data/structural_similarity_matrix.pkl')
TS_mat = pd.read_pickle('./data/target_similarity_matrix.pkl')
GS_mat = pd.read_pickle('./data/GO_similarity_matrix.pkl')
mlb = pd.read_pickle('./data/mlb.pkl')
idx2label = pd.read_pickle('./data/idx2label.pkl')

# Convert features for a subset of drug pairs
SS, TS, GS, y_true = convert_tensor(x_test[:10], y_test[:10], SS_mat, TS_mat, GS_mat, mlb, idx2label)
SS, TS, GS = SS.to(device), TS.to(device), GS.to(device)
```

### Step 4: Run Forward Inference & Extract Predictions

```python
# 4. Forward pass through Autoencoders + DNN predictor
with torch.no_grad():
    _, _, _, pred_logits = model(SS, TS, GS)
    pred_probs = torch.sigmoid(pred_logits)
    pred_binary = (pred_probs > 0.5).int().cpu().numpy()

# Map predicted binary matrix to human-readable interaction labels
predicted_labels = [mlb.classes_[np.where(row > 0)[0]] for row in pred_binary]
print("Sample Prediction 1:", predicted_labels[0])
```

---

## 🔍 Explainable AI (XAI) using Pre-Trained Model

The pre-trained model seamlessly integrates with the XAI pipeline in `predict_ddi_xai/` to explain predictions via Kernel SHAP.

### 1. Generate SHAP Samples from Pre-Trained Data
```bash
python predict_ddi_xai/sampling.py
```
*(Samples background and target test pairs into `shap_train_final.npz` and `shap_test_final.npz`)*

### 2. Compute SHAP Values with Pre-Trained Weights
```bash
python predict_ddi_xai/shap_analysis_kernel.py
```
*(Loads `./savepoints/0/model_checkpoint` and calculates feature attributions for 9,582 bio-similarity features)*

### 3. Visualize SHAP Explanations
Open [`predict_ddi_xai/shap_visualization.ipynb`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/predict_ddi_xai/shap_visualization.ipynb) to inspect:
- **Beeswarm Plots**: Global impact of top Structural (SS), Target (TS), and Gene Ontology (GS) features.
- **Waterfall Plots**: Local push-and-pull contributions for specific drug pairs.
- **Pre-renderedPDF**: View [`predict_ddi_xai/48_waterfall_plots.pdf`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/predict_ddi_xai/48_waterfall_plots.pdf) for 48 evaluated drug interaction explanations.

---

## 📁 Key File Map

| File Path | Description |
| :--- | :--- |
| [`savepoints/0/model_checkpoint`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/savepoints/0/model_checkpoint) | Pre-trained model PyTorch state dict (~183 MB) |
| [`savepoints/0/test_data.pkl`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/savepoints/0/test_data.pkl) | Pre-split test dataset (37,652 drug pairs) |
| [`predict_pretrained.py`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/predict_pretrained.py) | Standalone CLI script for pre-trained model inference |
| [`model_evaluation.ipynb`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/model_evaluation.ipynb) | Interactive notebook evaluating pre-trained model benchmark |
| [`src/model.py`](file:///c:/Users/Aryan%20Saini/Documents/Other/drug-to-drug-interaction-using-XAI/src/model.py) | PyTorch Neural Network architecture (`build_model`) |
