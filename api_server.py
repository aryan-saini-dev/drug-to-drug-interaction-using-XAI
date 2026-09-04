import os
import sys
import json
import torch
import numpy as np
import pandas as pd
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add src directory to system path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from model import build_model
from utils import convert_tensor

app = FastAPI(
    title="PredictDDI XAI API",
    description="Explainable Deep Learning for Drug-Drug Interaction Prediction",
    version="1.0.0"
)

# CORS middleware — in production set ALLOWED_ORIGINS env var to your Vercel URL
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and datasets
MODEL = None
DEVICE = None
HPARAMS = None
SS_MAT = None
TS_MAT = None
GS_MAT = None
MLB = None
IDX2LABEL = None
DRUG_NAME2IDX = None
IDX2DRUG_NAME = None
EFFECT2IDX = None
IDX2EFFECT = None


def load_resources():
    global MODEL, DEVICE, HPARAMS, SS_MAT, TS_MAT, GS_MAT, MLB, IDX2LABEL
    global DRUG_NAME2IDX, IDX2DRUG_NAME, EFFECT2IDX, IDX2EFFECT

    print("Initializing PredictDDI model & datasets...")
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    with open('./data/hyperparameter.json', 'r') as f:
        HPARAMS = json.load(f)

    # Load model
    MODEL = build_model(HPARAMS)
    MODEL.load_model('./savepoints/0/model_checkpoint')
    MODEL.eval()

    # Load data matrices & mappings
    SS_MAT = pd.read_pickle('./data/structural_similarity_matrix.pkl')
    TS_MAT = pd.read_pickle('./data/target_similarity_matrix.pkl')
    GS_MAT = pd.read_pickle('./data/GO_similarity_matrix.pkl')
    MLB = pd.read_pickle('./data/mlb.pkl')
    IDX2LABEL = pd.read_pickle('./data/idx2label.pkl')

    DRUG_NAME2IDX = pd.read_pickle('./data/drugName2idx.pkl')
    IDX2DRUG_NAME = {v: k for k, v in DRUG_NAME2IDX.items()}

    EFFECT2IDX = pd.read_pickle('./data/effect2idx.pkl')
    IDX2EFFECT = {v: k for k, v in EFFECT2IDX.items()}

    print(f"Loaded {len(DRUG_NAME2IDX)} drugs and {len(IDX2EFFECT)} interaction templates successfully.")


# Load resources on module import
load_resources()


# Request / Response Schemas
class PredictionRequest(BaseModel):
    drug1: str
    drug2: str


class InteractionDetail(BaseModel):
    label_id: int
    raw_template: str
    formatted_text: str
    probability: float
    confidence_percent: float
    severity: str


class ModalityBreakdown(BaseModel):
    structural_similarity: float
    target_similarity: float
    go_similarity: float
    overall_bio_similarity: float


class XAIAttribution(BaseModel):
    structural_weight: float
    target_weight: float
    go_weight: float
    primary_driver: str


class PredictionResponse(BaseModel):
    drug1_name: str
    drug1_id: int
    drug2_name: str
    drug2_id: int
    risk_level: str
    risk_score: float
    active_interactions_count: int
    interactions: List[InteractionDetail]
    bio_similarity: ModalityBreakdown
    xai_modal_attributions: XAIAttribution


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "model_checkpoint": "./savepoints/0/model_checkpoint",
        "device": str(DEVICE),
        "total_drugs": len(DRUG_NAME2IDX) if DRUG_NAME2IDX else 0,
        "total_interaction_types": len(IDX2EFFECT) if IDX2EFFECT else 0,
        "test_accuracy": "96.49%"
    }


@app.get("/api/drugs")
def search_drugs(query: Optional[str] = Query(None, description="Search term for drug names"), limit: int = 50):
    if not DRUG_NAME2IDX:
        raise HTTPException(status_code=500, detail="Data not loaded")

    drugs = []
    query_lower = query.lower().strip() if query else ""

    for name, idx in DRUG_NAME2IDX.items():
        if not query_lower or query_lower in name.lower():
            drugs.append({"id": idx, "name": name})
            if len(drugs) >= limit:
                break

    return {"count": len(drugs), "drugs": drugs}


from gemini_drug_resolver import resolve_drug_with_gemini, suggest_medicines_with_gemini, RESOLUTION_CACHE


class DrugResolveRequest(BaseModel):
    drug_name: str


class DrugSuggestRequest(BaseModel):
    query: str


@app.post("/api/resolve-drug")
def resolve_drug_api(req: DrugResolveRequest):
    res = get_resources()
    drug_name2idx = res["drug_name2idx"]
    result = resolve_drug_with_gemini(req.drug_name, drug_name2idx)
    return result


@app.post("/api/suggest-medicines")
def suggest_medicines_api(req: DrugSuggestRequest):
    res = get_resources()
    drug_name2idx = res["drug_name2idx"]
    result = suggest_medicines_with_gemini(req.query, drug_name2idx)
    return result


from xai_langgraph_pipeline import ddi_langgraph_app, get_resources


@app.get("/api/graph")
def get_graph_schema():
    """Returns LangGraph StateGraph architecture & node flow metadata."""
    return {
        "engine": "LangGraph v0.2+",
        "nodes": [
            {"id": "resolve_drugs", "name": "Node 1: Drug Entity Resolution"},
            {"id": "extract_bio_features", "name": "Node 2: Bio-Similarity Feature Extraction"},
            {"id": "model_inference", "name": "Node 3: PyTorch Model Inference"},
            {"id": "xai_explainability", "name": "Node 4: XAI Feature Attribution & Narrative"},
            {"id": "synthesize_report", "name": "Node 5: Report Synthesis"}
        ],
        "edges": [
            ["START", "resolve_drugs"],
            ["resolve_drugs", "extract_bio_features"],
            ["extract_bio_features", "model_inference"],
            ["model_inference", "xai_explainability"],
            ["xai_explainability", "synthesize_report"],
            ["synthesize_report", "END"]
        ]
    }


@app.post("/api/predict")
def predict_ddi(req: PredictionRequest):
    # Execute prediction via LangGraph StateGraph compiled workflow
    initial_state = {
        "drug1_input": req.drug1,
        "drug2_input": req.drug2,
        "node_execution_log": []
    }

    try:
        final_state = ddi_langgraph_app.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph execution error: {str(e)}")

    if final_state.get("error"):
        raise HTTPException(status_code=404, detail=final_state["error"])

    bio_sim = final_state["bio_similarity"]
    xai = final_state["xai_attributions"]
    interactions = [InteractionDetail(**item) for item in final_state["predictions"]]

    return {
        "drug1_name": final_state["drug1_name"],
        "drug1_id": final_state["drug1_id"],
        "drug2_name": final_state["drug2_name"],
        "drug2_id": final_state["drug2_id"],
        "risk_level": final_state["risk_level"],
        "risk_score": final_state["max_risk_score"],
        "active_interactions_count": len([i for i in interactions if i.probability >= 0.5]),
        "interactions": interactions,
        "bio_similarity": ModalityBreakdown(**bio_sim),
        "xai_modal_attributions": XAIAttribution(**xai),
        "clinical_narrative": final_state["clinical_narrative"],
        "langgraph_execution_log": final_state["node_execution_log"]
    }


@app.get("/")
def root():
    return {
        "service": "PredictDDI XAI FastAPI Server",
        "status": "online",
        "docs_url": "/docs",
        "api_endpoints": ["/api/health", "/api/drugs", "/api/resolve-drug", "/api/suggest-medicines", "/api/predict", "/api/graph"]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=False)

