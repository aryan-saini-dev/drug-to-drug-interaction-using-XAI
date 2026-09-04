// In production (Vercel), set VITE_API_BASE_URL to your Render backend URL e.g. https://ddi-xai-backend.onrender.com/api
// In local dev the Vite proxy rewrites /api → http://localhost:8000/api so leave this as /api
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function fetchDrugAutocomplete(query, limit = 15) {
  const res = await fetch(`${API_BASE}/drugs?query=${encodeURIComponent(query)}&limit=${limit}`);
  return await res.json();
}

export async function resolveDrug(drugName) {
  const res = await fetch(`${API_BASE}/resolve-drug`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drug_name: drugName })
  });
  return await res.json();
}

export async function suggestMedicines(query) {
  const res = await fetch(`${API_BASE}/suggest-medicines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

export async function predictDDI(drug1, drug2) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drug1, drug2 })
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error processing prediction.");
  }
  return await res.json();
}

export async function fetchGraphSchema() {
  const res = await fetch(`${API_BASE}/graph`);
  return await res.json();
}

export async function fetchHealthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return await res.json();
}
