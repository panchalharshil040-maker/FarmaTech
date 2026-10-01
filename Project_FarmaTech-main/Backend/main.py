import base64
import hashlib
import hmac
import json
import os
import re
import zlib
from typing import Literal, List, Optional
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data import TEMPLATES
from database import MEDICINES_DB, INTERACTIONS_DB, CONTRAINDICATIONS_DB, DUPLICATE_THERAPY_DB

app = FastAPI(title="MediGuard API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])
SECRET = os.getenv("QR_SECRET", "change-me").encode()
API_KEY = os.getenv("API_KEY")
WEIGHT = {"major": 40, "moderate": 20, "minor": 5, "duplicate": 25, "contraindication": 40}
LANG = {"en": "English", "hi": "Hindi", "gu": "Gujarati"}
DISCLAIMER = "Decision support only. Not a substitute for a doctor's or pharmacist's judgment."


def auth(x_api_key: str | None = Header(None)):
    """Validate API key from request header if API_KEY is configured."""
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")

def normalize_name(name: str) -> str:
    """Normalize medicine names before matching."""
    name = name.lower().strip()
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"\s*\d+(\.\d+)?\s*(mg|mcg|g)?$", "", name)
    return name.strip()

def get_canonical_id(name: str) -> str:
    norm = name.lower().strip()
    for med in MEDICINES_DB:
        med_id = med.get("id", "").lower()
        gen = med.get("genericName", "").lower()
        if norm == med_id or norm == gen:
            return med_id
    return norm

def resolve(name: str) -> list[str] | None:
    """Resolve a brand/generic medicine name to its list of active ingredient IDs."""
    norm = normalize_name(name)
    ids = set()
    for med in MEDICINES_DB:
        med_id = med.get("id", "").lower()
        gen = med.get("genericName", "").lower()
        brands = [b.lower().strip() for b in med.get("brandNames", [])]
        if norm == gen or norm in brands or norm == med_id:
            ids.add(med_id)
    return list(ids) if ids else None

class PatientProfile(BaseModel):
    ageGroup: Literal['adult', 'elderly', 'pediatric'] = 'adult'
    isPregnant: bool = False
    hasRenalImpairment: bool = False
    hasLiverDisease: bool = False
    hasCardiacHistory: bool = False
    allergies: List[str] = Field(default_factory=list)

class CheckReq(BaseModel):
    medicines: list[str] = Field(min_length=1, max_length=30)
    view: Literal["doctor", "patient"] = "doctor"
    language: Literal["en", "hi", "gu"] = "en"
    patient: Optional[PatientProfile] = None

class ExplainReq(BaseModel):
    findings: list[dict] = Field(..., min_length=1)
    view: Literal["doctor", "patient"] = "doctor"
    language: Literal["en", "hi", "gu"] = "en"

class SimReq(CheckReq):
    new_medicine: str

class QRReq(BaseModel):
    medicines: list[str] = Field(min_length=1, max_length=30)
    allergies: list[str] = []

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_SYSTEM_INSTRUCTION = """You are an explanation assistant for PharmaTech.

Use ONLY the verified findings supplied by the application.

The supplied findings come from a verified medical database.

Do not introduce facts that are not present in the supplied findings.

Do not invent:
- drug interactions
- contraindications
- duplicate therapies
- medicines
- diagnoses
- treatment recommendations
- severity levels

Do not modify the meaning of any database rule.

If a finding contains an action or recommendation, explain it without changing it.

If no verified finding is supplied, state that no matching verified database finding was provided.

Your job is to explain verified findings in simple language, not to independently determine medical facts.

Clearly distinguish database findings from AI-generated explanations.

Do not claim that the explanation is a diagnosis or treatment decision."""

def extract_patient_conditions(patient: PatientProfile | None) -> list[str]:
    if not patient:
        return []
    conds = []
    if patient.isPregnant:
        conds.append("pregnancy")
    if patient.hasRenalImpairment:
        conds.append("renal impairment")
    if patient.hasLiverDisease:
        conds.append("liver disease")
    if patient.hasCardiacHistory:
        conds.append("cardiac history")
    for a in patient.allergies:
        conds.append(a.lower())
    return conds

def match_condition(db_condition: str, patient_conditions: list[str]) -> bool:
    db_cond_lower = db_condition.lower()
    for pc in patient_conditions:
        if pc in db_cond_lower or db_cond_lower in pc:
            return True
    return False

def analyze(meds: list[str], patient: PatientProfile | None = None) -> tuple[list, list, list]:
    resolved = []
    unresolved = []
    owner = {}
    
    unique_meds = []
    for m in meds:
        if m not in unique_meds:
            unique_meds.append(m)

    for m in unique_meds:
        ings = resolve(m)
        if ings is None:
            unresolved.append(m)
            continue
        resolved.append({"input": m, "ingredients": ings})
        for i in ings:
            owner.setdefault(i, []).append(m)

    findings = []

    # 1. Duplicate therapy (same ingredient)
    for ing, brands in owner.items():
        if len(brands) > 1:
            findings.append({
                "id": f"duplicate-{ing}",
                "type": "duplicate_ingredient",
                "severity": "duplicate",
                "drugs": [ing],
                "medicines": brands,
                "mechanism": f"'{ing}' is present in multiple prescribed products.",
                "watch": "Signs of overdose",
                "verified_status": "verified"
            })

    # 1b. Duplicate therapy (explicit JSON rules)
    for dup_rule in DUPLICATE_THERAPY_DB:
        med_a = get_canonical_id(dup_rule.get("medicineA", ""))
        med_b = get_canonical_id(dup_rule.get("medicineB", ""))
        if med_a in owner and med_b in owner and med_a != med_b:
            findings.append({
                "id": dup_rule.get("id"),
                "type": "class_duplicate" if dup_rule.get("type") == "drug-class-overlap" else "duplicate_ingredient",
                "severity": "duplicate",
                "drugs": [med_a, med_b],
                "mechanism": dup_rule.get("rule"),
                "watch": dup_rule.get("importantLimit", "Duplicate therapy risks"),
                "recommendation": "Review concurrent therapy",
                "source": dup_rule.get("sourceA", {}),
                "verified_status": "verified"
            })

    # 2. Drug interactions
    ings_list = list(owner.keys())
    for i, a in enumerate(ings_list):
        for b in ings_list[i + 1:]:
            for interaction in INTERACTIONS_DB:
                drug_a = get_canonical_id(interaction.get("drugA", ""))
                drug_b = get_canonical_id(interaction.get("drugB", ""))
                if {a, b} == {drug_a, drug_b}:
                    findings.append({
                        "id": interaction.get("id"),
                        "type": "interaction",
                        "severity": "major",
                        "drugs": [a, b],
                        "mechanism": interaction.get("risk", "Interaction detected"),
                        "watch": interaction.get("action", "Monitor"),
                        "recommendation": interaction.get("action", ""),
                        "source": interaction.get("source", {}),
                        "verified_status": "verified"
                    })

    # 3. Patient conditions
    patient_conds = extract_patient_conditions(patient)
    for a in ings_list:
        for contra in CONTRAINDICATIONS_DB:
            drug = get_canonical_id(contra.get("drug", ""))
            if a == drug:
                cond = contra.get("condition", "")
                if match_condition(cond, patient_conds):
                    findings.append({
                        "id": contra.get("id"),
                        "type": "contraindication",
                        "severity": "major",
                        "drugs": [a],
                        "condition": cond,
                        "mechanism": contra.get("rule", ""),
                        "watch": "Contraindication",
                        "source": contra.get("source", {}),
                        "verified_status": "verified"
                    })

    return resolved, unresolved, findings


def explain(f: dict, view: str, lang: str) -> str:
    """Generate or look up an explanation for a drug-safety finding deterministically."""
    text = f.get("mechanism", "") if view == "doctor" else TEMPLATES.get(lang, TEMPLATES["en"]).get(f.get("severity", "minor"), f.get("mechanism", ""))
    if view == "patient" and lang == "en" and f.get("watch"):
        text += f" Watch for: {f['watch']}."
    return text


def report(meds: list[str], view: str, lang: str, patient: PatientProfile | None = None) -> dict:
    """Build a full safety report for a list of medicines."""
    resolved, unresolved, findings = analyze(meds, patient)
    
    for x in findings:
        x["explanation"] = explain(x, view, lang)

    score = min(100, sum(WEIGHT.get(x["severity"], 0) for x in findings))
    has_major = any(x["severity"] == "major" or x["severity"] == "contraindication" for x in findings)
    
    if score >= 60 or has_major:
        level = "high"
    elif score >= 20:
        level = "moderate"
    else:
        level = "low"

    return {
        "resolved": resolved,
        "unresolved": unresolved,
        "findings": findings,
        "risk_score": score,
        "risk_level": level,
        "disclaimer": DISCLAIMER,
        "found": True
    }


@app.get("/health")
def health(): return {"status": "ok"}


@app.get("/api/drugs/search", dependencies=[Depends(auth)])
def search(q: str):
    q = q.lower().strip()
    results = []
    for med in MEDICINES_DB:
        name = med.get("genericName", "")
        brands = med.get("brandNames", [])
        if q in name.lower() or any(q in b.lower() for b in brands):
            results.append({"name": brands[0] if brands else name, "ingredients": [name]})
    return results[:10]


@app.post("/api/check", dependencies=[Depends(auth)])
def check(r: CheckReq): 
    # Check if empty or duplicate logic handled in analyze
    rep = report(r.medicines, r.view, r.language, r.patient)
    if not rep["resolved"]:
        rep["found"] = False
    return rep


@app.post("/api/simulate", dependencies=[Depends(auth)])
def simulate(r: SimReq):
    before = report(r.medicines, r.view, r.language, r.patient)
    after = report(r.medicines + [r.new_medicine], r.view, r.language, r.patient)
    
    seen = {(x.get("id"), tuple(x["drugs"])) for x in before["findings"]}
    new_f = [x for x in after["findings"] if (x.get("id"), tuple(x["drugs"])) not in seen]
    
    return {
        "before_score": before["risk_score"], 
        "after_score": after["risk_score"],
        "delta": after["risk_score"] - before["risk_score"], 
        "new_findings": new_f,
        "risk_level": after["risk_level"], 
        "unresolved": after["unresolved"], 
        "disclaimer": DISCLAIMER,
        "found": after["found"]
    }

def call_gemini(findings: list[dict], view: str, language: str) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = f"Explain these findings for a {view} in {language} language:\n{json.dumps(findings)}"
    
    payload = {
        "system_instruction": {
            "parts": [{"text": GEMINI_SYSTEM_INSTRUCTION}]
        },
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "summary": {"type": "STRING"},
                    "explanations": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "findingId": {"type": "STRING"},
                                "explanation": {"type": "STRING"}
                            },
                            "required": ["findingId", "explanation"]
                        }
                    },
                    "disclaimer": {"type": "STRING"}
                },
                "required": ["summary", "explanations", "disclaimer"]
            }
        }
    }
    
    response = httpx.post(url, json=payload, timeout=10.0)
    response.raise_for_status()
    
    data = response.json()
    content = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(content)

@app.post("/api/explain", dependencies=[Depends(auth)])
def explain_endpoint(req: ExplainReq):
    try:
        return call_gemini(req.findings, req.view, req.language)
    except Exception as e:
        # Fallback to deterministic engine
        explanations = []
        for f in req.findings:
            explanations.append({
                "findingId": f.get("id", "unknown"),
                "explanation": explain(f, req.view, req.language)
            })
        return {
            "summary": "Deterministic findings summary (AI unavailable).",
            "explanations": explanations,
            "disclaimer": DISCLAIMER
        }

def _sig(b: bytes) -> bytes:
    """Compute a truncated HMAC-SHA256 signature."""
    return hmac.new(SECRET, b, hashlib.sha256).digest()[:16]

def _b64(b: bytes) -> str:
    """URL-safe base64 encode without padding."""
    return base64.urlsafe_b64encode(b).decode().rstrip("=")

def _unb64(s: str) -> bytes:
    """URL-safe base64 decode with padding restoration."""
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

@app.post("/api/qr", dependencies=[Depends(auth)])
def make_qr(r: QRReq):
    body = zlib.compress(json.dumps({"m": r.medicines, "a": r.allergies}, separators=(",", ":")).encode())
    return {"token": f"{_b64(body)}.{_b64(_sig(body))}"}

@app.get("/api/qr/{token}")
def read_qr(token: str):
    try:
        b, s = token.split(".")
        body = _unb64(b)
        if not hmac.compare_digest(_sig(body), _unb64(s)): raise ValueError
        d = json.loads(zlib.decompress(body))
    except Exception:
        raise HTTPException(400, "Invalid or tampered QR token")
    return {"medicines": d["m"], "allergies": d["a"], **report(d["m"], "patient", "en")}

