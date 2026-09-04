---
title: DDI XAI Backend
emoji: 💊
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Drug-Drug Interaction XAI — FastAPI Backend

Explainable AI backend for drug-drug interaction prediction.

- **Model**: Multi-modal deep learning (PyTorch) with 96.49% accuracy
- **XAI**: LangGraph pipeline with Gemini clinical narrative generation
- **API Docs**: [/docs](/docs)

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check & model status |
| `/api/drugs` | GET | Search drug names |
| `/api/predict` | POST | Predict DDI + XAI explanation |
| `/api/resolve-drug` | POST | Resolve brand/generic drug name |
| `/api/suggest-medicines` | POST | AI-powered drug suggestions |
