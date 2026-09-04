import os
import json
import urllib.request
import urllib.error
import re
from typing import Dict, Any, Optional, Tuple, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

# Curated list of clean common dataset generic compounds for high quality candidate matching
WELL_KNOWN_DATASET_DRUGS = [
    "Acetaminophen", "Ibuprofen", "Dextromethorphan", "Menthol", "Diphenhydramine",
    "Pseudoephedrine", "Cetirizine", "Loratadine", "Metformin", "Amlodipine",
    "Lisinopril", "Salbutamol", "Budesonide", "Montelukast", "Aspirin",
    "Naproxen", "Atorvastatin", "Capecitabine", "Phenoxymethylpenicillin", "Codeine"
]

# Known brand to active generic compound map for instant resolution
BRAND_NAME_MAP: Dict[str, str] = {
    "tylenol": "Acetaminophen",
    "panadol": "Acetaminophen",
    "crocin": "Acetaminophen",
    "calpol": "Acetaminophen",
    "advil": "Ibuprofen",
    "motrin": "Ibuprofen",
    "brufen": "Ibuprofen",
    "lipitor": "Atorvastatin",
    "glucophage": "Metformin",
    "zoloft": "Sertraline",
    "prilosec": "Omeprazole",
    "nexium": "Esomeprazole",
    "xeloda": "Capecitabine",
    "penicillin": "Phenoxymethylpenicillin",
    "cofsil": "Menthol",
    "vicks": "Menthol",
    "strepsils": "Menthol",
    "benadryl": "Diphenhydramine",
    "zyrtec": "Cetirizine",
    "claritin": "Loratadine",
    "allegra": "Fexofenadine",
    "sudafed": "Pseudoephedrine",
    "robitussin": "Dextromethorphan",
    "delsym": "Dextromethorphan"
}

# Known Medical Conditions/Symptoms mapped to Human Readable Brand Names with Generic Medical Descriptions
CONDITION_DRUG_MAP: Dict[str, Dict[str, Any]] = {
    "cough": {
        "condition_name": "Cough & Throat Irritation",
        "explanation": "'Cough' is a respiratory symptom, not a medication. Select a cough lozenge or antitussive medication below:",
        "suggestions": [
            {
                "display_name": "Delsym / Robitussin",
                "generic_compound": "Dextromethorphan",
                "description": "Medical Generic: Dextromethorphan - Primary antitussive cough suppressant for dry cough."
            },
            {
                "display_name": "Vicks / Cofsil Lozenge",
                "generic_compound": "Menthol",
                "description": "Medical Generic: Menthol - Oral soothing lozenge relieving throat irritation & cough."
            },
            {
                "display_name": "Benadryl Cough",
                "generic_compound": "Diphenhydramine",
                "description": "Medical Generic: Diphenhydramine - Antihistamine & cough suppressant for allergic cough."
            }
        ]
    },
    "sore throat": {
        "condition_name": "Sore Throat & Pharyngitis",
        "explanation": "'Sore throat' is a throat symptom. Select a soothing lozenge or pain reliever below:",
        "suggestions": [
            {
                "display_name": "Cofsil / Vicks Lozenge",
                "generic_compound": "Menthol",
                "description": "Medical Generic: Menthol - Active cooling & throat soothing lozenge compound."
            },
            {
                "display_name": "Tylenol",
                "generic_compound": "Acetaminophen",
                "description": "Medical Generic: Acetaminophen - First-line analgesic for throat pain relief."
            },
            {
                "display_name": "Advil",
                "generic_compound": "Ibuprofen",
                "description": "Medical Generic: Ibuprofen - NSAID anti-inflammatory reducing pharyngeal swelling."
            }
        ]
    },
    "cold": {
        "condition_name": "Common Cold & Nasal Congestion",
        "explanation": "'Cold' is a respiratory infection symptom. Select a cold relief medication below:",
        "suggestions": [
            {
                "display_name": "Sudafed",
                "generic_compound": "Pseudoephedrine",
                "description": "Medical Generic: Pseudoephedrine - Decongestant relieving sinus pressure & nasal blockage."
            },
            {
                "display_name": "Delsym Cough",
                "generic_compound": "Dextromethorphan",
                "description": "Medical Generic: Dextromethorphan - Cough suppressant for cold-related coughing."
            },
            {
                "display_name": "Zyrtec Cold",
                "generic_compound": "Cetirizine",
                "description": "Medical Generic: Cetirizine - Antihistamine reducing runny nose & sneezing."
            }
        ]
    },
    "asthma": {
        "condition_name": "Asthma & Bronchospasm",
        "explanation": "'Asthma' is a respiratory condition, not a medication. Select a common brand medication below:",
        "suggestions": [
            {
                "display_name": "Ventolin",
                "generic_compound": "Salbutamol",
                "description": "Medical Generic: Salbutamol (Albuterol) - Short-acting bronchodilator for acute asthma relief."
            },
            {
                "display_name": "Pulmicort",
                "generic_compound": "Budesonide",
                "description": "Medical Generic: Budesonide - Inhaled corticosteroid for long-term airway inflammation control."
            },
            {
                "display_name": "Singulair",
                "generic_compound": "Montelukast",
                "description": "Medical Generic: Montelukast - Leukotriene receptor antagonist for bronchospasm prevention."
            },
            {
                "display_name": "Theochron",
                "generic_compound": "Theophylline",
                "description": "Medical Generic: Theophylline - Xanthine bronchodilator for chronic airway obstruction."
            }
        ]
    },
    "fever": {
        "condition_name": "Fever & Pain Relief",
        "explanation": "'Fever' is a symptom, not a medication. Select a common brand medication below:",
        "suggestions": [
            {
                "display_name": "Tylenol",
                "generic_compound": "Acetaminophen",
                "description": "Medical Generic: Acetaminophen - First-line analgesic and fever reducer."
            },
            {
                "display_name": "Advil",
                "generic_compound": "Ibuprofen",
                "description": "Medical Generic: Ibuprofen - Nonsteroidal anti-inflammatory drug (NSAID) for pain & fever."
            },
            {
                "display_name": "Aleve",
                "generic_compound": "Naproxen",
                "description": "Medical Generic: Naproxen - Long-acting NSAID for pain, fever, and inflammation."
            }
        ]
    },
    "headache": {
        "condition_name": "Headache & Migraine",
        "explanation": "'Headache' is a symptom, not a medication. Select a common brand medication below:",
        "suggestions": [
            {
                "display_name": "Tylenol",
                "generic_compound": "Acetaminophen",
                "description": "Medical Generic: Acetaminophen - Common analgesic for tension headaches."
            },
            {
                "display_name": "Advil",
                "generic_compound": "Ibuprofen",
                "description": "Medical Generic: Ibuprofen - NSAID analgesic effective for vascular headaches."
            },
            {
                "display_name": "Bayer Aspirin",
                "generic_compound": "Aspirin",
                "description": "Medical Generic: Aspirin - Classic analgesic for headache and pain relief."
            }
        ]
    },
    "diabetes": {
        "condition_name": "Diabetes Mellitus",
        "explanation": "'Diabetes' is an endocrine condition, not a medication. Select an antidiabetic medication below:",
        "suggestions": [
            {
                "display_name": "Glucophage",
                "generic_compound": "Metformin",
                "description": "Medical Generic: Metformin - First-line biguanide antidiabetic for blood glucose control."
            },
            {
                "display_name": "Tradjenta",
                "generic_compound": "Linagliptin",
                "description": "Medical Generic: Linagliptin - DPP-4 inhibitor for type 2 diabetes management."
            },
            {
                "display_name": "Glucotrol",
                "generic_compound": "Glipizide",
                "description": "Medical Generic: Glipizide - Sulfonylurea agent encouraging insulin secretion."
            }
        ]
    },
    "hypertension": {
        "condition_name": "Hypertension (High Blood Pressure)",
        "explanation": "'Hypertension' is a cardiovascular condition. Select an antihypertensive medication below:",
        "suggestions": [
            {
                "display_name": "Norvasc",
                "generic_compound": "Amlodipine",
                "description": "Medical Generic: Amlodipine - Calcium channel blocker for blood pressure control."
            },
            {
                "display_name": "Zestril",
                "generic_compound": "Lisinopril",
                "description": "Medical Generic: Lisinopril - ACE inhibitor reducing vascular resistance."
            },
            {
                "display_name": "Cozaar",
                "generic_compound": "Losartan",
                "description": "Medical Generic: Losartan - Angiotensin II receptor blocker (ARB)."
            }
        ]
    },
    "high blood pressure": {
        "condition_name": "Hypertension (High Blood Pressure)",
        "explanation": "'High blood pressure' is a cardiovascular condition. Select an antihypertensive medication below:",
        "suggestions": [
            {
                "display_name": "Norvasc",
                "generic_compound": "Amlodipine",
                "description": "Medical Generic: Amlodipine - Calcium channel blocker for blood pressure control."
            },
            {
                "display_name": "Zestril",
                "generic_compound": "Lisinopril",
                "description": "Medical Generic: Lisinopril - ACE inhibitor reducing vascular resistance."
            },
            {
                "display_name": "Cozaar",
                "generic_compound": "Losartan",
                "description": "Medical Generic: Losartan - Angiotensin II receptor blocker (ARB)."
            }
        ]
    },
    "infection": {
        "condition_name": "Bacterial / Viral Infection",
        "explanation": "'Infection' is a disease condition. Select an antimicrobial medication below:",
        "suggestions": [
            {
                "display_name": "Penicillin V",
                "generic_compound": "Phenoxymethylpenicillin",
                "description": "Medical Generic: Phenoxymethylpenicillin - Beta-lactam antibiotic for bacterial infections."
            },
            {
                "display_name": "Zithromax",
                "generic_compound": "Azithromycin",
                "description": "Medical Generic: Azithromycin - Macrolide antibiotic for respiratory tract infections."
            },
            {
                "display_name": "Cipro",
                "generic_compound": "Ciprofloxacin",
                "description": "Medical Generic: Ciprofloxacin - Broad-spectrum fluoroquinolone antibiotic."
            }
        ]
    }
}


def fuzzy_find_candidates(user_input: str, drug_name2idx: Dict[str, int], top_n: int = 30) -> List[str]:
    """Finds top N candidate drug names containing sub-tokens of user input."""
    input_lower = user_input.lower().strip()
    words = [w for w in re.split(r'\W+', input_lower) if len(w) >= 3]

    exact_matches = []
    token_matches = []

    for name in drug_name2idx.keys():
        name_lower = name.lower()
        if input_lower in name_lower:
            exact_matches.append(name)
            if len(exact_matches) >= top_n:
                return exact_matches
        elif words and any(w in name_lower for w in words):
            token_matches.append(name)
            if len(exact_matches) + len(token_matches) >= top_n:
                break

    candidates = exact_matches + token_matches
    if not candidates:
        candidates = [d for d in WELL_KNOWN_DATASET_DRUGS if d in drug_name2idx]

    return candidates[:top_n]


# In-memory mapping cache
RESOLUTION_CACHE: Dict[str, Dict[str, Any]] = {}


def resolve_drug_with_gemini(user_input: str, drug_name2idx: Dict[str, int]) -> Dict[str, Any]:
    """
    Uses Gemini API to map common/brand medicine names to exact generic compound names.
    """
    input_clean = user_input.strip()
    if not input_clean:
        return {"mapped_name": None, "confidence": 0.0, "reasoning": "Empty input"}

    cache_key = input_clean.lower()

    # 1. Check direct Brand Name Map
    if cache_key in BRAND_NAME_MAP:
        mapped_generic = BRAND_NAME_MAP[cache_key]
        if mapped_generic in drug_name2idx:
            result = {
                "mapped_name": mapped_generic,
                "drug_id": drug_name2idx[mapped_generic],
                "confidence": 1.0,
                "reasoning": f"Mapped brand name '{input_clean}' to active generic compound '{mapped_generic}'.",
                "is_ai_mapped": True
            }
            RESOLUTION_CACHE[cache_key] = result
            return result

    # 2. Check in-memory Cache
    if cache_key in RESOLUTION_CACHE:
        return RESOLUTION_CACHE[cache_key]

    # Direct exact match check
    if input_clean in drug_name2idx:
        result = {
            "mapped_name": input_clean,
            "drug_id": drug_name2idx[input_clean],
            "confidence": 1.0,
            "reasoning": f"Verified dataset compound ID {drug_name2idx[input_clean]}.",
            "is_ai_mapped": False
        }
        RESOLUTION_CACHE[cache_key] = result
        return result

    # Direct case-insensitive match
    for name, idx in drug_name2idx.items():
        if input_clean.lower() == name.lower():
            result = {
                "mapped_name": name,
                "drug_id": idx,
                "confidence": 1.0,
                "reasoning": f"Case-insensitive match in dataset ID {idx}.",
                "is_ai_mapped": False
            }
            RESOLUTION_CACHE[cache_key] = result
            return result

    # Find candidate dataset drugs
    candidates = fuzzy_find_candidates(input_clean, drug_name2idx, top_n=40)

    # Prompt Gemini API
    prompt = f"""You are a pharmaceutical chemistry AI middleman.
A user entered the medicine/brand name: "{input_clean}".
Your task is to identify the active generic compound or closest equivalent in this list of available ML dataset compounds:
{json.dumps(candidates)}

Respond ONLY with a valid JSON object in this format (no markdown formatting):
{{
  "mapped_name": "<exact string from the provided candidates list>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<short sentence explaining the mapping>"
}}
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            GEMINI_API_URL,
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            response_text = resp.read().decode("utf-8")

        response_json = json.loads(response_text)
        raw_content = response_json["candidates"][0]["content"]["parts"][0]["text"].strip()
        raw_content = re.sub(r'^```json\s*', '', raw_content, flags=re.MULTILINE)
        raw_content = re.sub(r'^```\s*', '', raw_content, flags=re.MULTILINE).strip()

        ai_parsed = json.loads(raw_content)
        mapped_name = ai_parsed.get("mapped_name")

        if mapped_name and mapped_name in drug_name2idx:
            result = {
                "mapped_name": mapped_name,
                "drug_id": drug_name2idx[mapped_name],
                "confidence": ai_parsed.get("confidence", 0.9),
                "reasoning": ai_parsed.get("reasoning", f"Mapped '{input_clean}' to dataset compound."),
                "is_ai_mapped": True
            }
            RESOLUTION_CACHE[cache_key] = result
            return result

    except Exception as e:
        print(f"Gemini API resolution note for '{input_clean}': {e}")

    # Fallback
    fallback_name = candidates[0] if candidates else "Acetaminophen"
    result = {
        "mapped_name": fallback_name,
        "drug_id": drug_name2idx.get(fallback_name, 30),
        "confidence": 0.5,
        "reasoning": f"Dataset compound candidate '{fallback_name}'.",
        "is_ai_mapped": False
    }
    RESOLUTION_CACHE[cache_key] = result
    return result


def suggest_medicines_with_gemini(user_input: str, drug_name2idx: Dict[str, int]) -> Dict[str, Any]:
    """
    Analyzes input query via Gemini AI or pre-defined condition map.
    If input is not a recognized medicine or condition, sets is_unrecognized to True.
    """
    clean_input = user_input.strip()
    if not clean_input:
        return {"is_condition": False, "is_unrecognized": False, "query": "", "suggestions": []}

    input_key = clean_input.lower()

    # Check direct exact match or case-insensitive match in drug dataset
    if clean_input in drug_name2idx or any(clean_input.lower() == k.lower() for k in drug_name2idx.keys()):
        matched_name = clean_input if clean_input in drug_name2idx else [k for k in drug_name2idx.keys() if clean_input.lower() == k.lower()][0]
        return {
            "is_condition": False,
            "is_unrecognized": False,
            "query": clean_input,
            "direct_match": {
                "display_name": matched_name,
                "generic_compound": matched_name,
                "drug_id": drug_name2idx[matched_name]
            },
            "suggestions": []
        }

    # 1. Check direct or fuzzy Brand map match (e.g. Tylenol -> Acetaminophen)
    import difflib

    best_brand_match = None
    best_brand_ratio = 0.0
    for brand_k, generic_v in BRAND_NAME_MAP.items():
        if input_key == brand_k:
            best_brand_match = generic_v
            best_brand_ratio = 1.0
            break
        ratio = difflib.SequenceMatcher(None, input_key, brand_k).ratio()
        if ratio > 0.8 and ratio > best_brand_ratio:
            best_brand_ratio = ratio
            best_brand_match = generic_v

    if best_brand_match and best_brand_match in drug_name2idx:
        return {
            "is_condition": True,
            "is_unrecognized": False,
            "query": clean_input,
            "condition_name": f"Brand Name Verification ({clean_input.capitalize()})",
            "explanation": f"'{clean_input.capitalize()}' is a brand/common medicine name. Select the active generic dataset compound below:",
            "suggestions": [
                {
                    "display_name": f"{clean_input.capitalize()} ({best_brand_match})",
                    "generic_compound": best_brand_match,
                    "drug_id": drug_name2idx[best_brand_match],
                    "description": f"Medical Generic: {best_brand_match} - Active compound in {clean_input.capitalize()}."
                }
            ]
        }

    # 2. Check pre-defined Condition Map with fuzzy typo matching (e.g. ashtma -> asthma)
    best_cond_data = None
    best_cond_ratio = 0.0
    for cond_key, cond_data in CONDITION_DRUG_MAP.items():
        if cond_key in input_key or input_key in cond_key:
            best_cond_data = cond_data
            best_cond_ratio = 1.0
            break
        ratio = difflib.SequenceMatcher(None, input_key, cond_key).ratio()
        if ratio >= 0.7 and ratio > best_cond_ratio:
            best_cond_ratio = ratio
            best_cond_data = cond_data

    if best_cond_data:
        valid_suggs = []
        for item in best_cond_data["suggestions"]:
            gen = item["generic_compound"]
            if gen in drug_name2idx:
                item_copy = dict(item)
                item_copy["drug_id"] = drug_name2idx[gen]
                valid_suggs.append(item_copy)

        if valid_suggs:
            return {
                "is_condition": True,
                "is_unrecognized": False,
                "query": clean_input,
                "condition_name": best_cond_data["condition_name"],
                "explanation": f"Detected query '{clean_input}' as condition '{best_cond_data['condition_name']}'. Select a recommended active medication below:",
                "suggestions": valid_suggs
            }

    # Query Gemini API to evaluate if query is a medical term / brand name and get dataset matches
    candidates = fuzzy_find_candidates(clean_input, drug_name2idx, top_n=25)
    prompt = f"""You are an expert clinical pharmacology AI assistant.
A user entered the query: "{clean_input}".
First, evaluate: Is "{clean_input}" a real medical medicine, brand name, health condition, or symptom? Or is it non-medical / gibberish (e.g., "banana", "asdf123", "computer")?

If it IS a valid medical query or brand name:
Suggest 2 to 4 relevant pharmaceutical medications from this list of available dataset compounds: {json.dumps(candidates)}.
For each suggestion, provide:
- "display_name": Common human-readable brand/common name (e.g., "Ventolin", "Tylenol", "Singulair")
- "generic_compound": exact generic medical name from the candidates list
- "description": Medical Generic Name: <generic_compound> - <short clinical purpose>

If it is NOT a recognized medicine or condition:
Set "is_valid_medical_query": false and "suggestions": [].

Respond ONLY with a valid JSON object in this format (no markdown):
{{
  "is_valid_medical_query": true,
  "is_condition": true,
  "condition_name": "Condition or Brand Category Name",
  "explanation": "Short sentence explaining query",
  "suggestions": [
    {{
      "display_name": "Common Brand Name",
      "generic_compound": "exact generic compound from candidates list",
      "description": "Medical Generic: <generic_compound> - short description"
    }}
  ]
}}
"""

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            GEMINI_API_URL,
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            response_text = resp.read().decode("utf-8")
            response_json = json.loads(response_text)
            raw_content = response_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            raw_content = re.sub(r'^```json\s*', '', raw_content, flags=re.MULTILINE)
            raw_content = re.sub(r'^```\s*', '', raw_content, flags=re.MULTILINE).strip()
            ai_parsed = json.loads(raw_content)

            if ai_parsed.get("is_valid_medical_query") is False:
                return {
                    "is_condition": True,
                    "is_unrecognized": True,
                    "query": clean_input,
                    "condition_name": "Unrecognized Term",
                    "explanation": f"'{clean_input}' is not a recognized medicine or health condition that can be evaluated in this dataset.",
                    "suggestions": []
                }

            suggs = ai_parsed.get("suggestions", [])
            valid_suggs = []
            for s in suggs:
                gen = s.get("generic_compound")
                if gen and gen in drug_name2idx:
                    s["drug_id"] = drug_name2idx[gen]
                    valid_suggs.append(s)

            if valid_suggs:
                return {
                    "is_condition": ai_parsed.get("is_condition", True),
                    "is_unrecognized": False,
                    "query": clean_input,
                    "condition_name": ai_parsed.get("condition_name", clean_input.capitalize()),
                    "explanation": ai_parsed.get("explanation", f"Recommendations for '{clean_input}':"),
                    "suggestions": valid_suggs
                }
    except Exception as e:
        print(f"Gemini API suggest note for '{clean_input}': {e}")

    # Fallback if non-medical query or Gemini API fails to match candidates
    return {
        "is_condition": True,
        "is_unrecognized": True,
        "query": clean_input,
        "condition_name": "Unrecognized Term",
        "explanation": f"'{clean_input}' is not a recognized medicine or health condition in our database.",
        "suggestions": []
    }
