import base64
import hashlib
import hmac
import json
import os
import re
import zlib
from functools import lru_cache
from typing import Literal
import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from data import BRANDS, CLASSES, INTERACTIONS, TEMPLATES

app = FastAPI(title="MediGuard API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])
SECRET = os.getenv("QR_SECRET", "change-me").encode()
API_KEY = os.getenv("API_KEY")
WEIGHT = {"major": 40, "moderate": 20, "minor": 5, "duplicate": 25}
GENERICS = {g for v in BRANDS.values() for g in v}
LANG = {"en": "English", "hi": "Hindi", "gu": "Gujarati"}
DISCLAIMER = "Decision support only. Not a substitute for a doctor's or pharmacist's judgment."


def auth(x_api_key: str | None = Header(None)):
    """Validate API key from request header if API_KEY is configured."""
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")

def resolve(name: str) -> list[str] | None:
    """Resolve a brand/generic medicine name to its list of active ingredients."""
    k = re.sub(r"\s+", " ", name.lower().strip())
    for c in (k, re.sub(r"\s*\d+(\.\d+)?\s*(mg|mcg|g)?$", "", k)):
        if c in BRANDS:
            return BRANDS[c]
        if c in GENERICS:
            return [c]
    return None

def analyze(meds: list[str]) -> tuple[list, list, list]:
    """Analyze a list of medicine names for duplicates, interactions, and class overlaps."""
    resolved: list[dict] = []
    unresolved: list[str] = []
    owner: dict[str, list[str]] = {}

    for m in meds:
        ing = resolve(m)
        if ing is None:
            unresolved.append(m)
            continue
        resolved.append({"input": m, "ingredients": ing})
        for i in ing:
            owner.setdefault(i, []).append(m)

    findings: list[dict] = []

    # Detect duplicate ingredients across different brand names
    for ing, ms in owner.items():
        if len(ms) > 1:
            findings.append({
                "type": "duplicate_ingredient",
                "severity": "duplicate",
                "drugs": [ing],
                "medicines": ms,
                "mechanism": f"{ing} is present in {len(ms)} medicines",
                "watch": "Signs of overdose",
            })

    # Detect pairwise drug interactions
    ings = sorted(owner)
    for i, a in enumerate(ings):
        for b in ings[i + 1:]:
            for x, y, sev, mech, watch in INTERACTIONS:
                if {a, b} == {x, y}:
                    findings.append({
                        "type": "interaction",
                        "severity": sev,
                        "drugs": [a, b],
                        "mechanism": mech,
                        "watch": watch,
                    })

    # Detect same-class duplicates (e.g. multiple NSAIDs)
    by_cls: dict[str, list[str]] = {}
    for i in ings:
        if i in CLASSES:
            by_cls.setdefault(CLASSES[i], []).append(i)
    for cls, members in by_cls.items():
        if len(members) > 1:
            findings.append({
                "type": "class_duplicate",
                "severity": "moderate",
                "drugs": members,
                "mechanism": f"Multiple {cls} drugs together",
                "watch": "Side effects of this drug class",
            })

    return resolved, unresolved, findings

@lru_cache(maxsize=512)
def _explain_cached(
    finding_type: str,
    drugs_tuple: tuple,
    severity: str,
    mechanism: str,
    watch: str,
    view: str,
    lang: str,
) -> str:
    """Generate or look up an explanation for a drug-safety finding. Uses LRU cache (max 512 entries)."""
    text = None
    if os.getenv("GROQ_API_KEY"):
        finding_dict = {
            "type": finding_type,
            "drugs": list(drugs_tuple),
            "severity": severity,
            "mechanism": mechanism,
            "watch": watch,
        }
        try:  # LLM only rephrases the deterministic finding; never decides it
            r = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                timeout=8,
                headers={"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "temperature": 0.2,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                f"Explain this drug-safety finding in {LANG[lang]} for a "
                                f"{'patient in simple words' if view == 'patient' else 'clinician, concisely'}. "
                                "Use ONLY the facts given. Add no drugs, doses or new claims. "
                                "Max 60 words. Tell patients to consult their doctor."
                            ),
                        },
                        {"role": "user", "content": json.dumps(finding_dict)},
                    ],
                },
            )
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            text = None

    if not text:  # safe deterministic fallback
        text = mechanism if view == "doctor" else TEMPLATES[lang][severity]
        if view == "patient" and lang == "en":
            text += f" Watch for: {watch}."
    return text


def explain(f: dict, view: str, lang: str) -> str:
    """Public wrapper that calls the cached explanation generator."""
    return _explain_cached(
        finding_type=f["type"],
        drugs_tuple=tuple(f["drugs"]),
        severity=f["severity"],
        mechanism=f["mechanism"],
        watch=f["watch"],
        view=view,
        lang=lang,
    )

def report(meds: list[str], view: str, lang: str) -> dict:
    """Build a full safety report for a list of medicines."""
    resolved, unresolved, findings = analyze(meds)
    for x in findings:
        x["explanation"] = explain(x, view, lang)

    score = min(100, sum(WEIGHT[x["severity"]] for x in findings))
    has_major = any(x["severity"] == "major" for x in findings)
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
    }

class CheckReq(BaseModel):
    medicines: list[str] = Field(min_length=1, max_length=30)
    view: Literal["doctor", "patient"] = "doctor"
    language: Literal["en", "hi", "gu"] = "en"

class SimReq(CheckReq):
    new_medicine: str

class QRReq(BaseModel):
    medicines: list[str] = Field(min_length=1, max_length=30)
    allergies: list[str] = []

@app.get("/health")
def health(): return {"status": "ok"}

@app.get("/api/drugs/search", dependencies=[Depends(auth)])
def search(q: str):
    q = q.lower().strip()
    return [{"name": n, "ingredients": v} for n, v in BRANDS.items() if q in n][:10]

@app.post("/api/check", dependencies=[Depends(auth)])
def check(r: CheckReq): return report(r.medicines, r.view, r.language)

@app.post("/api/simulate", dependencies=[Depends(auth)])
def simulate(r: SimReq):
    before, after = report(r.medicines, r.view, r.language), report(r.medicines + [r.new_medicine], r.view, r.language)
    seen = {(x["type"], tuple(x["drugs"])) for x in before["findings"]}
    new = [x for x in after["findings"] if (x["type"], tuple(x["drugs"])) not in seen]
    return {"before_score": before["risk_score"], "after_score": after["risk_score"],
            "delta": after["risk_score"] - before["risk_score"], "new_findings": new,
            "risk_level": after["risk_level"], "unresolved": after["unresolved"], "disclaimer": DISCLAIMER}

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
    return {"token": f"{_b64(body)}.{_b64(_sig(body))}"}  # encode this string into the QR on the client

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
