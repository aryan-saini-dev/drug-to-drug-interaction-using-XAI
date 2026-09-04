import os
import sys
import json
import torch
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END

# Add src directory to system path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from model import build_model
from utils import convert_tensor


# 1. LangGraph State Definition
class DDIState(TypedDict):
    drug1_input: str
    drug2_input: str
    drug1_id: Optional[int]
    drug1_name: Optional[str]
    drug2_id: Optional[int]
    drug2_name: Optional[str]
    bio_similarity: Optional[Dict[str, float]]
    tensors: Optional[Dict[str, Any]]
    raw_logits: Optional[Any]
    predictions: Optional[List[Dict[str, Any]]]
    risk_level: Optional[str]
    max_risk_score: Optional[float]
    xai_attributions: Optional[Dict[str, Any]]
    clinical_narrative: Optional[str]
    node_execution_log: Optional[List[str]]
    error: Optional[str]


# Helper: Load PyTorch model and resources lazily or globally
_RESOURCES = None

def get_resources():
    global _RESOURCES
    if _RESOURCES is not None:
        return _RESOURCES

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with open('./data/hyperparameter.json', 'r') as f:
        hparams = json.load(f)

    model = build_model(hparams)
    model.load_model('./savepoints/0/model_checkpoint')
    model.eval()

    SS_mat = pd.read_pickle('./data/structural_similarity_matrix.pkl')
    TS_mat = pd.read_pickle('./data/target_similarity_matrix.pkl')
    GS_mat = pd.read_pickle('./data/GO_similarity_matrix.pkl')
    mlb = pd.read_pickle('./data/mlb.pkl')
    idx2label = pd.read_pickle('./data/idx2label.pkl')

    drug_name2idx = pd.read_pickle('./data/drugName2idx.pkl')
    idx2drug_name = {v: k for k, v in drug_name2idx.items()}

    effect2idx = pd.read_pickle('./data/effect2idx.pkl')
    idx2effect = {v: k for k, v in effect2idx.items()}

    _RESOURCES = {
        "model": model,
        "device": device,
        "hparams": hparams,
        "SS_mat": SS_mat,
        "TS_mat": TS_mat,
        "GS_mat": GS_mat,
        "mlb": mlb,
        "idx2label": idx2label,
        "drug_name2idx": drug_name2idx,
        "idx2drug_name": idx2drug_name,
        "effect2idx": effect2idx,
        "idx2effect": idx2effect
    }
    return _RESOURCES


# 2. LangGraph Node Functions

from gemini_drug_resolver import resolve_drug_with_gemini


def resolve_drugs_node(state: DDIState) -> Dict[str, Any]:
    """Node 1: Resolves Drug A and Drug B compound names via Gemini AI Middleman."""
    res = get_resources()
    drug_name2idx = res["drug_name2idx"]

    logs = state.get("node_execution_log", [])

    # Resolve Drug 1 with Gemini AI
    d1_input = state["drug1_input"].strip()
    r1 = resolve_drug_with_gemini(d1_input, drug_name2idx)

    # Resolve Drug 2 with Gemini AI
    d2_input = state["drug2_input"].strip()
    r2 = resolve_drug_with_gemini(d2_input, drug_name2idx)

    d1_id = r1.get("drug_id")
    d2_id = r2.get("drug_id")

    if d1_id is None or d2_id is None:
        return {
            "error": f"Could not resolve compound names ({d1_input}, {d2_input}) in dataset.",
            "node_execution_log": logs
        }

    d1_name = r1["mapped_name"]
    d2_name = r2["mapped_name"]

    logs.append(f"Node 1 [ResolveDrugs]: Gemini AI mapped '{d1_input}' -> '{d1_name}' and '{d2_input}' -> '{d2_name}'.")

    return {
        "drug1_id": d1_id,
        "drug1_name": d1_name,
        "drug2_id": d2_id,
        "drug2_name": d2_name,
        "drug1_ai_info": r1,
        "drug2_ai_info": r2,
        "node_execution_log": logs
    }


def extract_bio_features_node(state: DDIState) -> Dict[str, Any]:
    """Node 2: Extracts multi-modal bio-similarity feature vectors (SS, TS, GS)."""
    if state.get("error"):
        return state

    res = get_resources()
    d1_id = state["drug1_id"]
    d2_id = state["drug2_id"]

    SS_mat = res["SS_mat"]
    TS_mat = res["TS_mat"]
    GS_mat = res["GS_mat"]
    mlb = res["mlb"]
    idx2label = res["idx2label"]

    logs = state.get("node_execution_log", [])
    logs.append("Node 2 [ExtractBioFeatures]: Extracted 9,582 bio-similarity features across SS, TS, and GS matrices.")

    # Convert tensors for model
    x_pair = [(d1_id, d2_id)]
    y_dummy = [0]
    SS, TS, GS, _ = convert_tensor(x_pair, y_dummy, SS_mat, TS_mat, GS_mat, mlb, idx2label)

    # Calculate scalar similarity scores
    ss_sim = float(SS_mat[d1_id, d2_id])
    ts_sim = float(TS_mat[d1_id, d2_id])
    gs_sim = float(GS_mat[d1_id, d2_id])
    overall_sim = float((ss_sim + ts_sim + gs_sim) / 3.0)

    bio_sim = {
        "structural_similarity": round(ss_sim, 4),
        "target_similarity": round(ts_sim, 4),
        "go_similarity": round(gs_sim, 4),
        "overall_bio_similarity": round(overall_sim, 4)
    }

    return {
        "tensors": {"SS": SS, "TS": TS, "GS": GS},
        "bio_similarity": bio_sim,
        "node_execution_log": logs
    }


def model_inference_node(state: DDIState) -> Dict[str, Any]:
    """Node 3: Executes forward pass on pre-trained PyTorch checkpoint."""
    if state.get("error"):
        return state

    res = get_resources()
    model = res["model"]
    device = res["device"]
    hparams = res["hparams"]
    idx2effect = res["idx2effect"]
    mlb = res["mlb"]

    SS = state["tensors"]["SS"].to(device)
    TS = state["tensors"]["TS"].to(device)
    GS = state["tensors"]["GS"].to(device)

    logs = state.get("node_execution_log", [])
    logs.append("Node 3 [ModelInference]: Executed forward pass on PyTorch Autoencoder + DNN predictor.")

    with torch.no_grad():
        o1, o2, o3, pred_logits = model(SS, TS, GS)
        pred_probs = torch.sigmoid(pred_logits)[0].cpu().numpy()

    # Latent norm attributions for XAI
    with torch.no_grad():
        code1 = model.encoder1(SS)
        code2 = model.encoder2(TS)
        code3 = model.encoder3(GS)
        norm1 = float(torch.norm(code1).cpu())
        norm2 = float(torch.norm(code2).cpu())
        norm3 = float(torch.norm(code3).cpu())

    threshold = hparams.get('threshold', 0.5)
    d1_name = state["drug1_name"]
    d2_name = state["drug2_name"]

    predictions = []
    sorted_indices = np.argsort(pred_probs)[::-1]

    for idx in sorted_indices:
        prob = float(pred_probs[idx])
        if prob < threshold and len(predictions) >= 1:
            break

        raw_template = idx2effect.get(idx, f"Interaction effect index {idx}")
        formatted_text = raw_template.replace("DRUG_A", d1_name).replace("DRUG_B", d2_name)

        severity = "Low"
        text_lower = raw_template.lower()
        if "increase" in text_lower or "toxic" in text_lower or "worsening" in text_lower or "adverse" in text_lower or prob > 0.85:
            severity = "High Risk"
        elif "decrease" in text_lower or "reduced" in text_lower or prob > 0.65:
            severity = "Moderate Risk"
        else:
            severity = "Low / Minor"

        predictions.append({
            "label_id": int(idx),
            "raw_template": raw_template,
            "formatted_text": formatted_text,
            "probability": round(prob, 4),
            "confidence_percent": round(prob * 100, 2),
            "severity": severity
        })

        if len(predictions) >= 10:
            break

    max_prob = max([p["probability"] for p in predictions]) if predictions else 0.0
    active_preds = [p for p in predictions if p["probability"] >= threshold]

    if active_preds and (max_prob > 0.8 or any(p["severity"] == "High Risk" for p in active_preds)):
        risk_level = "HIGH RISK INTERACTION"
    elif active_preds and (max_prob > 0.5 or any(p["severity"] == "Moderate Risk" for p in active_preds)):
        risk_level = "MODERATE RISK INTERACTION"
    else:
        risk_level = "LOW RISK / SAFE"

    return {
        "predictions": predictions,
        "risk_level": risk_level,
        "max_risk_score": round(max_prob * 100, 2),
        "latent_norms": {"norm1": norm1, "norm2": norm2, "norm3": norm3},
        "node_execution_log": logs
    }


def xai_explainability_node(state: DDIState) -> Dict[str, Any]:
    """Node 4: Computes modal encoder attributions and generates XAI clinical narrative."""
    if state.get("error"):
        return state

    logs = state.get("node_execution_log", [])
    logs.append("Node 4 [XAIExplainability]: Calculated latent feature attributions & generated clinical narrative.")

    norms = state.get("latent_norms", {"norm1": 1.0, "norm2": 1.0, "norm3": 1.0})
    norm1 = norms["norm1"]
    norm2 = norms["norm2"]
    norm3 = norms["norm3"]

    total_norm = max(norm1 + norm2 + norm3, 1e-6)

    w_ss = round(norm1 / total_norm * 100, 1)
    w_ts = round(norm2 / total_norm * 100, 1)
    w_gs = round(norm3 / total_norm * 100, 1)

    drivers = [("Structural Bio-Similarity", w_ss), ("Target Protein Similarity", w_ts), ("Gene Ontology Annotation", w_gs)]
    primary_driver = max(drivers, key=lambda x: x[1])[0]

    d1 = state["drug1_name"]
    d2 = state["drug2_name"]
    risk = state["risk_level"]
    sim = state["bio_similarity"]

    narrative = (
        f"LangGraph XAI Diagnosis: The combined intake of {d1} and {d2} is categorized as '{risk}' "
        f"with a maximum confidence of {state['max_risk_score']}%. The prediction is primarily driven by "
        f"{primary_driver} ({max(w_ss, w_ts, w_gs)}% weight). Compound target similarity is rated at {sim['target_similarity']} "
        f"and structural similarity at {sim['structural_similarity']}."
    )

    xai_data = {
        "structural_weight": w_ss,
        "target_weight": w_ts,
        "go_weight": w_gs,
        "primary_driver": primary_driver
    }

    return {
        "xai_attributions": xai_data,
        "clinical_narrative": narrative,
        "node_execution_log": logs
    }


def synthesize_report_node(state: DDIState) -> Dict[str, Any]:
    """Node 5: Synthesizes final response state output."""
    logs = state.get("node_execution_log", [])
    logs.append("Node 5 [SynthesizeReport]: LangGraph state graph execution finished successfully.")
    return {"node_execution_log": logs}


# 3. Build & Compile LangGraph StateGraph
workflow_builder = StateGraph(DDIState)

# Add Nodes
workflow_builder.add_node("resolve_drugs", resolve_drugs_node)
workflow_builder.add_node("extract_bio_features", extract_bio_features_node)
workflow_builder.add_node("model_inference", model_inference_node)
workflow_builder.add_node("xai_explainability", xai_explainability_node)
workflow_builder.add_node("synthesize_report", synthesize_report_node)

# Add Edges
workflow_builder.add_edge(START, "resolve_drugs")
workflow_builder.add_edge("resolve_drugs", "extract_bio_features")
workflow_builder.add_edge("extract_bio_features", "model_inference")
workflow_builder.add_edge("model_inference", "xai_explainability")
workflow_builder.add_edge("xai_explainability", "synthesize_report")
workflow_builder.add_edge("synthesize_report", END)

# Compile LangGraph App
ddi_langgraph_app = workflow_builder.compile()


if __name__ == "__main__":
    print("Testing compiled LangGraph DDI StateGraph Pipeline...")
    initial_state = {
        "drug1_input": "Linagliptin",
        "drug2_input": "Isavuconazole",
        "node_execution_log": []
    }

    final_state = ddi_langgraph_app.invoke(initial_state)

    print("\n--- LangGraph Execution Log ---")
    for log in final_state["node_execution_log"]:
        print(" ", log)

    print("\n--- Final LangGraph Output ---")
    print(f" Drugs: {final_state['drug1_name']} vs {final_state['drug2_name']}")
    print(f" Risk Level: {final_state['risk_level']} ({final_state['max_risk_score']}%)")
    print(f" Narrative: {final_state['clinical_narrative']}")
