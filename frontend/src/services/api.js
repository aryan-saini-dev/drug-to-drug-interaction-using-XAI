// Priority: runtime config.js (HF Static Space) → Vite env var (Vercel) → /api proxy (local dev)
const API_BASE =
  (typeof window !== "undefined" && window.APP_CONFIG?.API_BASE_URL &&
   !window.APP_CONFIG.API_BASE_URL.includes("REPLACE_WITH"))
    ? window.APP_CONFIG.API_BASE_URL
    : (import.meta.env.VITE_API_BASE_URL ?? "/api");

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

export async function fetchHealthCheck(signal) {
  const res = await fetch(`${API_BASE}/health`, signal ? { signal } : {});
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return await res.json();
}
