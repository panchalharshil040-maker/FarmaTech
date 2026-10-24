import base64
from contextlib import asynccontextmanager
import hashlib
import hmac
import httpx
import json
import logging
import os
import re
import secrets
import sqlite3
import zlib
from typing import Literal, List, Optional
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from data import TEMPLATES
from database import MEDICINES_DB, INTERACTIONS_DB, CONTRAINDICATIONS_DB, DUPLICATE_THERAPY_DB, FOOD_WARNINGS_DB

logger = logging.getLogger("mediguard")

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))
load_dotenv(os.path.join(_BACKEND_DIR, "Data", ".env"))
load_dotenv("Data/.env")
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database schema is created immediately upon app startup."""
    _get_db()
    yield

app = FastAPI(title="MediGuard API", version="0.1.0", lifespan=lifespan)

# ─── CORS ────────────────────────────────────────────────────────────────────
# Cookie-based sessions require credentialed CORS: the browser only accepts a
# Set-Cookie / Access-Control-Allow-Credentials response when the exact origin
# is allowed (a wildcard "*" is rejected by browsers once credentials are on).
# ALLOWED_ORIGINS may list explicit origins; "*" is treated as "reflect any
# origin" which is only appropriate for local development.
_allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
_cors_kwargs = dict(
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
LAN_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"

if "*" in _allowed_origins:
    # Starlette reflects the request origin when allow_origins is ["*"].
    app.add_middleware(CORSMiddleware, allow_origins=["*"], **_cors_kwargs)
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_origin_regex=LAN_ORIGIN_REGEX,
        **_cors_kwargs
    )

# ─── Secrets ────────────────────────────────────────────────────────────────
# AUTH_SECRET signs session cookies. QR_SECRET remains the QR-payload secret.
# They are separate so rotating one cannot silently invalidate the other.
SECRET = os.getenv("QR_SECRET", "change-me").encode()
AUTH_SECRET = (os.getenv("AUTH_SECRET") or os.getenv("QR_SECRET") or "change-me").encode()
API_KEY = os.getenv("API_KEY")

SESSION_COOKIE = "mediguard_session"
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"

# ─── Account / record database ──────────────────────────────────────────────
# A single file-backed SQLite database holds user accounts and each patient's
# saved record. A file (not ":memory:") is required so a registered account and
# its record survive across requests — an in-memory database is recreated for
# every new connection, which made login impossible after registration.
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_AUTH_DB_PATH = os.getenv("AUTH_DB_PATH") or os.path.join(_BASE_DIR, "auth.db")
if not os.path.isabs(_AUTH_DB_PATH):
    _AUTH_DB_PATH = os.path.join(_BASE_DIR, _AUTH_DB_PATH)

_db_conn: sqlite3.Connection | None = None

def _get_db() -> sqlite3.Connection:
    """Return the shared, thread-safe account/record database connection."""
    global _db_conn
    if _db_conn is None:
        _db_conn = sqlite3.connect(_AUTH_DB_PATH, check_same_thread=False)
        _db_conn.row_factory = sqlite3.Row
        _db_conn.execute("PRAGMA journal_mode=WAL")
        _db_conn.execute("PRAGMA busy_timeout=5000")
        _db_conn.execute(
            "CREATE TABLE IF NOT EXISTS users ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "email TEXT UNIQUE NOT NULL, "
            "full_name TEXT, "
            "password_hash TEXT NOT NULL, "
            "role TEXT NOT NULL, "
            "created_at TEXT DEFAULT (datetime('now'))"
            ")"
        )
        _db_conn.execute(
            "CREATE TABLE IF NOT EXISTS patient_records ("
            "user_id INTEGER PRIMARY KEY, "
            "record_json TEXT NOT NULL, "
            "updated_at TEXT DEFAULT (datetime('now')), "
            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
            ")"
        )
        _db_conn.commit()
    return _db_conn



WEIGHT = {"major": 40, "moderate": 20, "minor": 5, "duplicate": 25, "contraindication": 40}
LANG = {"en": "English", "hi": "Hindi", "gu": "Gujarati"}
DISCLAIMER = "Decision support only. Not a substitute for a doctor's or pharmacist's judgment."


def auth(x_api_key: str | None = Header(None)):
    """Validate API key from request header if API_KEY is configured."""
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")

# ─── Password hashing (PBKDF2-HMAC-SHA256, per-user salt) ───────────────────
_PBKDF2_ITERATIONS = 240_000

def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        _PBKDF2_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode().rstrip("="),
        base64.urlsafe_b64encode(dk).decode().rstrip("="),
    )

def _verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt_b64, hash_b64 = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_b64 + "=" * (-len(salt_b64) % 4))
        expected = base64.urlsafe_b64decode(hash_b64 + "=" * (-len(hash_b64) % 4))
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False

# ─── Session tokens ─────────────────────────────────────────────────────────
# A session token identifies the user AND their role:
#     <user_id>.<role>.<hmac>
# The HMAC covers "<user_id>.<role>" so neither part can be altered without
# detection. The role is re-checked against the database on every request, so a
# stale or forged token can never grant a role the account does not hold.

def _sign_session(user_id: int, role: str) -> str:
    payload = f"{user_id}.{role}"
    sig = hmac.new(AUTH_SECRET, payload.encode(), hashlib.sha256).digest()[:16]
    sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{payload}.{sig_b64}"

def _verify_session(token: str) -> dict | None:
    """Verify a session token and return the authoritative account row.

    The token's signature is checked first, then the account is loaded from the
    database. The database row — not the token — decides the role, so a token
    minted before a role change (or a tampered token) cannot grant access.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        user_id_s, role, sig = parts
        payload = f"{user_id_s}.{role}"
        expected = hmac.new(AUTH_SECRET, payload.encode(), hashlib.sha256).digest()[:16]
        expected_b64 = base64.urlsafe_b64encode(expected).decode().rstrip("=")
        if not hmac.compare_digest(sig, expected_b64):
            return None
        db = _get_db()
        row = db.execute(
            "SELECT id, email, full_name, role FROM users WHERE id = ?",
            (int(user_id_s),),
        ).fetchone()
        if row is None:
            return None
        return {"id": row["id"], "email": row["email"],
                "full_name": row["full_name"], "role": row["role"]}
    except Exception:
        return None

def get_current_user(request: Request) -> dict:
    """FastAPI dependency: resolve the authenticated account from the cookie.

    Raises 401 when no valid session cookie is present. The returned dict is the
    authoritative account loaded from the database.
    """
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(401, "Not authenticated")
    user = _verify_session(token)
    if user is None:
        raise HTTPException(401, "Session is invalid or expired")
    return user

def normalize_name(name: str) -> str:
    """Normalize medicine names before matching."""
    name = name.lower().strip()
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"\s*\d+(\.\d+)?\s*(mg|mcg|g|%)?$", "", name)
    return name.strip()

def find_medicine(name: str) -> dict | None:
    """Find a medicine record by brand, Indian brand, generic, Indian generic, id, active ingredients, or RxCUI."""
    if not name or not isinstance(name, str):
        return None
    raw_clean = re.sub(r"\s+", " ", name.lower().strip())
    norm = normalize_name(name)
    
    # 1. Exact match on id, genericName, indianGenericName, brandNames, indianBrandNames, activeIngredientIds, rxcui
    for med in MEDICINES_DB:
        med_id = med.get("id", "").lower().strip()
        gen = med.get("genericName", "").lower().strip()
        ind_gen = med.get("indianGenericName", "").lower().strip()
        brands = [b.lower().strip() for b in med.get("brandNames", [])]
        ind_brands = [b.lower().strip() for b in med.get("indianBrandNames", [])]
        active_ings = [i.lower().strip() for i in med.get("activeIngredientIds", [])]
        rxcuis = [str(r).lower().strip() for r in med.get("rxcui", [])]

        if raw_clean in (med_id, gen, ind_gen) or raw_clean in brands or raw_clean in ind_brands:
            return med
        if raw_clean in active_ings or raw_clean in rxcuis:
            return med

    # 2. Normalized match (dosage/strength removed)
    if norm:
        for med in MEDICINES_DB:
            med_id = normalize_name(med.get("id", ""))
            gen = normalize_name(med.get("genericName", ""))
            ind_gen = normalize_name(med.get("indianGenericName", ""))
            brands = [normalize_name(b) for b in med.get("brandNames", [])]
            ind_brands = [normalize_name(b) for b in med.get("indianBrandNames", [])]

            if norm in (med_id, gen, ind_gen) or norm in brands or norm in ind_brands:
                return med

    return None

def get_canonical_id(name: str) -> str:
    med = find_medicine(name)
    if med:
        return med.get("id", "").lower()
    norm = name.lower().strip()
    for med in MEDICINES_DB:
        med_id = med.get("id", "").lower()
        gen = med.get("genericName", "").lower()
        if norm == med_id or norm == gen:
            return med_id
    return norm

def resolve(name: str) -> list[str] | None:
    """Resolve a brand/generic medicine name to its list of active ingredient IDs."""
    med = find_medicine(name)
    if med:
        return med.get("activeIngredientIds") or [med.get("id", "").lower()]
    return None


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

class UserCreate(BaseModel):
    email: str
    password: str
    role: Literal["patient", "doctor"]
    full_name: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    email: str
    role: str
    full_name: str | None = None

class PatientRecordIn(BaseModel):
    """A patient record saved for the authenticated account.

    The account that owns the record is taken from the session cookie, never
    from a field in this payload — a client cannot address another user's record.
    """
    source: Literal["qr", "manual", "demo"] = "manual"
    name: str = ""
    patientId: str = ""
    age: str = ""
    medicines: List[str] = Field(default_factory=list, max_length=100)
    profile: Optional[PatientProfile] = None
    notes: str = ""

class User(BaseModel):
    id: int
    email: str
    role: str
    created_at: str
    full_name: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str

class SimReq(CheckReq):
    # Backward compatible: the original contract added one medicine.
    new_medicine: str = ""
    # Optional full proposed regimen (add / remove / replace). When supplied it is
    # the authoritative temporary regimen and new_medicine is ignored.
    proposed_medicines: Optional[List[str]] = None

class QRReq(BaseModel):
    medicines: list[str] = Field(min_length=1, max_length=30)
    allergies: list[str] = []
    # Identity + clinical context so an imported pass restores the whole record.
    # Optional: tokens/requests without them still work (empty identity).
    name: str = ""
    patientId: str = ""
    age: str = ""
    profile: Optional[PatientProfile] = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")

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

GROQ_SYSTEM_INSTRUCTION = """You are an explanation assistant for PharmaTech.

Use ONLY the verified findings supplied by the application.
The supplied findings are already verified by the deterministic database engine.

Do not introduce facts that are not present in the supplied findings.
Do not introduce new medical facts.

Do not invent:
- drug interactions
- unsupported interactions
- contraindications
- duplicate therapies
- medicines
- diagnoses
- treatment recommendations
- prescribing decisions
- severity levels

Do not modify the meaning of any database rule.
Do not alter severity or risk.
Do not diagnose, prescribe, or recommend treatment.

If a finding contains an action or recommendation, explain it without changing it.

If no verified finding is supplied, state that no matching verified database finding was provided.
If information is not present in the supplied finding, do not claim it.

Your job is to explain verified findings in simple language, not to independently determine medical facts.

Clearly distinguish database findings from AI-generated explanations.

Do not claim that the explanation is a diagnosis or treatment decision.

Respond with a JSON object strictly matching this schema:
{
  "summary": "Overall plain-language summary of the verified findings",
  "explanations": [
    {
      "findingId": "The exact id of the finding",
      "explanation": "Plain-language explanation of only this verified finding"
    }
  ],
  "disclaimer": "Decision support only. Not a substitute for a doctor's or pharmacist's judgment."
}"""

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

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

def analyze(meds: list[str], patient: PatientProfile | None = None) -> tuple[list, list, list, list]:
    resolved = []
    unresolved = []
    resolved_meds: list[tuple[str, dict]] = []
    
    unique_meds = []
    for m in meds:
        if m not in unique_meds:
            unique_meds.append(m)

    for m in unique_meds:
        med = find_medicine(m)
        if med is None:
            unresolved.append(m)
            continue
        ings = med.get("activeIngredientIds") or [med.get("id", "").lower()]
        resolved.append({"input": m, "ingredients": ings})
        resolved_meds.append((m, med))

    findings = []
    seen_finding_ids = set()

    # Track inputs by ingredient and by medicine ID
    ing_owner: dict[str, list[str]] = {}
    med_owner: dict[str, list[str]] = {}
    for input_name, med in resolved_meds:
        med_id = med.get("id", "").lower()
        med_owner.setdefault(med_id, []).append(input_name)
        for ing in (med.get("activeIngredientIds") or [med_id]):
            ing_owner.setdefault(ing.lower(), []).append(input_name)

    # 1. Duplicate therapy (explicit JSON rules first)
    for dup_rule in DUPLICATE_THERAPY_DB:
        rule_id = dup_rule.get("id")
        med_a = (dup_rule.get("medicineAId") or get_canonical_id(dup_rule.get("medicineA", ""))).lower()
        med_b = (dup_rule.get("medicineBId") or get_canonical_id(dup_rule.get("medicineB", ""))).lower()
        if med_a in med_owner and med_b in med_owner and med_a != med_b:
            if rule_id not in seen_finding_ids:
                seen_finding_ids.add(rule_id)
                findings.append({
                    "id": rule_id,
                    "type": "class_duplicate" if dup_rule.get("type") == "drug-class-overlap" else "duplicate_ingredient",
                    "severity": "duplicate",
                    "drugs": [med_a, med_b],
                    "medicines": [med_owner[med_a][0], med_owner[med_b][0]],
                    "mechanism": dup_rule.get("rule"),
                    "watch": dup_rule.get("importantLimit", "Duplicate therapy risks"),
                    "recommendation": "Review concurrent therapy",
                    "source": dup_rule.get("sourceA", {}),
                    "verified_status": "verified"
                })

    # 1b. Duplicate therapy (active ingredient overlap across multiple products without explicit rule)
    for ing, brands in ing_owner.items():
        if len(brands) > 1:
            dup_id = f"duplicate-{ing}"
            if dup_id not in seen_finding_ids:
                # Check if all pairs in brands are already covered by an explicit rule
                covered = False
                for f in findings:
                    if f.get("type") == "duplicate_ingredient" and set(brands).issubset(set(f.get("medicines", []))):
                        covered = True
                        break
                if not covered:
                    seen_finding_ids.add(dup_id)
                    findings.append({
                        "id": dup_id,
                        "type": "duplicate_ingredient",
                        "severity": "duplicate",
                        "drugs": [ing],
                        "medicines": brands,
                        "mechanism": f"'{ing}' is present in multiple prescribed products.",
                        "watch": "Signs of overdose",
                        "verified_status": "verified"
                    })

    # 2. Drug interactions
    for i, (m1_input, med1) in enumerate(resolved_meds):
        for m2_input, med2 in resolved_meds[i + 1:]:
            med1_id = med1.get("id", "").lower()
            med2_id = med2.get("id", "").lower()
            if med1_id == med2_id:
                continue
            med1_ings = {ing.lower() for ing in med1.get("activeIngredientIds", [])} | {med1_id}
            med2_ings = {ing.lower() for ing in med2.get("activeIngredientIds", [])} | {med2_id}

            for interaction in INTERACTIONS_DB:
                rule_id = interaction.get("id")
                if rule_id in seen_finding_ids:
                    continue

                int_a = (interaction.get("ingredientAId") or get_canonical_id(interaction.get("drugA", ""))).lower()
                int_b = (interaction.get("ingredientBId") or get_canonical_id(interaction.get("drugB", ""))).lower()
                
                match_forward = (int_a in med1_ings and int_b in med2_ings)
                match_reverse = (int_a in med2_ings and int_b in med1_ings)

                if match_forward or match_reverse:
                    seen_finding_ids.add(rule_id)
                    findings.append({
                        "id": rule_id,
                        "type": "interaction",
                        "severity": "major",
                        "drugs": [int_a, int_b],
                        "mechanism": interaction.get("risk", "Interaction detected"),
                        "watch": interaction.get("action", "Monitor"),
                        "recommendation": interaction.get("action", ""),
                        "source": interaction.get("source", {}),
                        "verified_status": "verified"
                    })

    # 3. Patient conditions
    patient_conds = extract_patient_conditions(patient)
    for input_name, med in resolved_meds:
        med_id = med.get("id", "").lower()
        med_ings = {ing.lower() for ing in med.get("activeIngredientIds", [])} | {med_id}

        for contra in CONTRAINDICATIONS_DB:
            rule_id = contra.get("id")
            if rule_id in seen_finding_ids:
                continue

            target_drug = (contra.get("medicineId") or get_canonical_id(contra.get("drug", ""))).lower()
            if target_drug in med_ings:
                cond = contra.get("condition", "")
                if match_condition(cond, patient_conds):
                    seen_finding_ids.add(rule_id)
                    findings.append({
                        "id": rule_id,
                        "type": "contraindication",
                        "severity": "major",
                        "drugs": [target_drug],
                        "condition": cond,
                        "mechanism": contra.get("rule", ""),
                        "watch": "Contraindication",
                        "source": contra.get("source", {}),
                        "verified_status": "verified"
                    })

    # 4. Food warnings (verified from foodwarning.json)
    food_warnings = []
    seen_fw_ids = set()
    for input_name, med in resolved_meds:
        med_id = med.get("id", "").lower()
        med_ings = {ing.lower() for ing in med.get("activeIngredientIds", [])} | {med_id}

        for fw in FOOD_WARNINGS_DB:
            fw_id = fw.get("id")
            if fw_id in seen_fw_ids:
                continue
            target_med = fw.get("medicineId", "").lower()
            if target_med in med_ings:
                seen_fw_ids.add(fw_id)
                food_warnings.append({
                    "id": fw_id,
                    "medicine": fw.get("genericName"),
                    "food": fw.get("food"),
                    "warning": fw.get("warning"),
                    "effect": fw.get("effect"),
                    "source": fw.get("source", {}),
                    "verified_status": "verified"
                })

    return resolved, unresolved, findings, food_warnings


def explain(f: dict, view: str, lang: str) -> str:
    """Generate or look up an explanation for a drug-safety finding deterministically."""
    text = f.get("mechanism", "") if view == "doctor" else TEMPLATES.get(lang, TEMPLATES["en"]).get(f.get("severity", "minor"), f.get("mechanism", ""))
    if view == "patient" and lang == "en" and f.get("watch"):
        text += f" Watch for: {f['watch']}."
    return text


def report(meds: list[str], view: str, lang: str, patient: PatientProfile | None = None) -> dict:
    """Build a full safety report for a list of medicines."""
    resolved, unresolved, findings, food_warnings = analyze(meds, patient)
    
    for x in findings:
        x["explanation"] = explain(x, view, lang)

    score = min(100, sum(WEIGHT.get(x["severity"], 0) for x in findings))
    has_major = any(x["severity"] == "major" or x["severity"] == "contraindication" for x in findings)
    
    if score == 0:
        level = "no_risk"
    elif score >= 40 or has_major:
        level = "high"
    elif score >= 25:
        level = "moderate"
    else:
        level = "low"

    return {
        "resolved": resolved,
        "unresolved": unresolved,
        "findings": findings,
        "food_warnings": food_warnings,
        "risk_score": score,
        "risk_level": level,
        "disclaimer": DISCLAIMER,
        "found": bool(findings)
    }


@app.get("/health")
def health(): return {"status": "ok"}

# ─── Authentication ──────────────────────────────────────────────────────────

def _set_session_cookie(response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )

@app.post("/api/auth/register", status_code=201)
def register(user: UserCreate):
    """Register a new patient or doctor account and start a session."""
    email = user.email.strip().lower()
    if "@" not in email or not email.split("@")[0] or "." not in email.split("@")[-1]:
        raise HTTPException(422, "Please enter a valid email address")
    if len(user.password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    if user.full_name is not None and len(user.full_name.strip()) > 120:
        raise HTTPException(422, "Name is too long")

    db = _get_db()
    existing = db.execute(
        "SELECT id FROM users WHERE email = ?", (email,)
    ).fetchone()
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    password_hash = _hash_password(user.password)
    cursor = db.execute(
        "INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
        (email, password_hash, user.role, (user.full_name or "").strip() or None),
    )
    db.commit()
    user_id = cursor.lastrowid

    token = _sign_session(user_id, user.role)
    resp = JSONResponse(
        status_code=201,
        content={
            "email": email,
            "role": user.role,
            "full_name": (user.full_name or "").strip() or None,
        },
    )
    _set_session_cookie(resp, token)
    return resp

@app.post("/api/auth/login")
def login(user: UserLogin):
    """Verify credentials and start a session."""
    email = user.email.strip().lower()
    db = _get_db()
    row = db.execute(
        "SELECT id, email, full_name, password_hash, role FROM users WHERE email = ?",
        (email,),
    ).fetchone()
    # Same message for unknown email and wrong password: never reveal which
    # accounts exist.
    if row is None or not _verify_password(user.password, row["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")

    token = _sign_session(row["id"], row["role"])
    resp = JSONResponse(content={
        "email": row["email"],
        "role": row["role"],
        "full_name": row["full_name"],
    })
    _set_session_cookie(resp, token)
    return resp

@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    """Return the authenticated account from the session cookie."""
    return {
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"],
        "authenticated": True,
    }

@app.post("/api/auth/logout")
def logout(response: JSONResponse):
    """Invalidate the session cookie."""
    resp = JSONResponse(content={"ok": True})
    resp.delete_cookie(SESSION_COOKIE, path="/")
    return resp

# ─── Patient record persistence ─────────────────────────────────────────────
# Each authenticated account owns at most one saved record. The owner is taken
# from the session cookie, so a client can never read or write another
# account's record by supplying an id.

def _load_record_json(user_id: int) -> str | None:
    db = _get_db()
    row = db.execute(
        "SELECT record_json FROM patient_records WHERE user_id = ?", (user_id,)
    ).fetchone()
    return row["record_json"] if row else None

@app.get("/api/patient-records/me")
def get_my_record(user: dict = Depends(get_current_user)):
    """Load the signed-in account's saved record (404 when none is saved)."""
    record_json = _load_record_json(user["id"])
    if record_json is None:
        raise HTTPException(404, "No saved record")
    return json.loads(record_json)

@app.put("/api/patient-records/me")
def save_my_record(record: PatientRecordIn, user: dict = Depends(get_current_user)):
    """Create or replace the signed-in account's saved record."""
    db = _get_db()
    payload = record.model_dump()
    db.execute(
        "INSERT INTO patient_records (user_id, record_json, updated_at) "
        "VALUES (?, ?, datetime('now')) "
        "ON CONFLICT(user_id) DO UPDATE SET "
        "record_json = excluded.record_json, updated_at = datetime('now')",
        (user["id"], json.dumps(payload)),
    )
    db.commit()
    return {"saved": True, "record": payload}

@app.delete("/api/patient-records/me", status_code=200)
def delete_my_record(user: dict = Depends(get_current_user)):
    """Remove the signed-in account's saved record."""
    db = _get_db()
    db.execute("DELETE FROM patient_records WHERE user_id = ?", (user["id"],))
    db.commit()
    return {"deleted": True}


@app.get("/api/drugs/search", dependencies=[Depends(auth)])
def search(q: str):
    q = q.lower().strip()
    if not q:
        return []
    results = []
    seen_names = set()
    for med in MEDICINES_DB:
        gen = med.get("genericName", "")
        ind_gen = med.get("indianGenericName", "")
        brands = med.get("brandNames", [])
        ind_brands = med.get("indianBrandNames", [])
        med_id = med.get("id", "")
        active_ings = med.get("activeIngredientIds", [])
        rxcuis = [str(r).lower().strip() for r in med.get("rxcui", [])]

        matched = False
        display_name = None
        if q in gen.lower():
            matched = True
            display_name = brands[0] if brands else gen
        elif any(q in b.lower() for b in brands):
            matched = True
            display_name = next((b for b in brands if q in b.lower()), brands[0])
        elif any(q in ib.lower() for ib in ind_brands):
            matched = True
            display_name = next((ib for ib in ind_brands if q in ib.lower()), ind_brands[0])
        elif q in ind_gen.lower() or q in med_id.lower() or any(q in ai.lower() for ai in active_ings) or any(q in r for r in rxcuis):
            matched = True
            display_name = brands[0] if brands else (ind_brands[0] if ind_brands else gen)

        if matched and display_name:
            if display_name.lower() not in seen_names:
                seen_names.add(display_name.lower())
                results.append({
                    "name": display_name,
                    "ingredients": active_ings if active_ings else [gen]
                })
    return results[:10]



@app.post("/api/check", dependencies=[Depends(auth)])
def check(r: CheckReq): 
    # Check if empty or duplicate logic handled in analyze
    return report(r.medicines, r.view, r.language, r.patient)


def _finding_identity(f: dict) -> tuple:
    fid = f.get("id")
    drugs = tuple(sorted(str(d).lower().strip() for d in f.get("drugs", [])))
    if fid:
        return (fid, drugs)
    return (f.get("type", ""), drugs, f.get("condition", ""))


@app.post("/api/simulate", dependencies=[Depends(auth)])
def simulate(r: SimReq):
    """
    Compare the current regimen against a TEMPORARY proposed regimen.

    Two accepted inputs (the endpoint and its original response keys are preserved):
      • new_medicine         → the proposed regimen is current + that medicine (add)
      • proposed_medicines   → the complete proposed regimen (add / remove / replace),
                               which may be an empty list to model removing everything

    Both sides and every comparison value below are produced by the deterministic
    engine: the client only renders what is returned here.
    """
    if r.proposed_medicines is not None:
        proposed = [m for m in r.proposed_medicines]
    else:
        new_med = r.new_medicine.strip()
        if not new_med:
            raise HTTPException(422, "Prospective medicine name cannot be empty")
        proposed = r.medicines + [new_med]

    before = report(r.medicines, r.view, r.language, r.patient)
    after = report(proposed, r.view, r.language, r.patient)

    before_ids = {_finding_identity(x) for x in before["findings"]}
    after_ids = {_finding_identity(x) for x in after["findings"]}
    new_f = [x for x in after["findings"] if _finding_identity(x) not in before_ids]
    resolved_f = [x for x in before["findings"] if _finding_identity(x) not in after_ids]
    remaining_f = [x for x in after["findings"] if _finding_identity(x) in before_ids]

    return {
        "before_score": before["risk_score"],
        "after_score": after["risk_score"],
        "delta": after["risk_score"] - before["risk_score"],
        "before_level": before["risk_level"],
        "risk_level": after["risk_level"],
        "before_findings": before["findings"],
        "after_findings": after["findings"],
        "new_findings": new_f,
        "resolved_findings": resolved_f,
        "remaining_findings": remaining_f,
        "current_medicines": list(r.medicines),
        "proposed_medicines": proposed,
        "unresolved": after["unresolved"],
        "disclaimer": DISCLAIMER,
        "found": bool(new_f)
    }

def call_gemini(findings: list[dict], view: str, language: str) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("Missing GEMINI_API_KEY")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
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


def call_groq(findings: list[dict], view: str, language: str) -> dict:
    if not GROQ_API_KEY:
        raise ValueError("Missing GROQ_API_KEY")

    url = "https://api.groq.com/openai/v1/chat/completions"

    prompt = f"Explain these findings for a {view} in {language} language:\n{json.dumps(findings)}"

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": GROQ_SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 4096
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    response = httpx.post(url, json=payload, headers=headers, timeout=20.0)
    response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    parsed = json.loads(content)
    if "summary" not in parsed or "explanations" not in parsed:
        raise ValueError("Invalid response format from Groq")
    if "disclaimer" not in parsed:
        parsed["disclaimer"] = DISCLAIMER
    return parsed


@app.post("/api/explain", dependencies=[Depends(auth)])
def explain_endpoint(req: ExplainReq):
    provider = (AI_PROVIDER or "groq").lower().strip()
    if provider == "gemini":
        try:
            result = call_gemini(req.findings, req.view, req.language)
            return {**result, "ai_used": True, "provider": "gemini"}
        except Exception as e:
            logger.warning("Gemini AI explanation failed (%s); fallback to deterministic", e)
    else:
        try:
            result = call_groq(req.findings, req.view, req.language)
            return {**result, "ai_used": True, "provider": "groq"}
        except Exception as e:
            logger.warning("Groq AI explanation failed (%s); fallback to deterministic", e)

    explanations = []
    for f in req.findings:
        explanations.append({
            "findingId": f.get("id", "unknown"),
            "explanation": explain(f, req.view, req.language)
        })
    return {
        "summary": "Deterministic findings summary (AI unavailable).",
        "explanations": explanations,
        "disclaimer": DISCLAIMER,
        "ai_used": False,
        "provider": "deterministic"
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

def _qr_profile(profile: Optional[PatientProfile], allergies: list[str]) -> dict:
    """Flatten a PatientProfile into the compact QR payload shape."""
    return {
        "ageGroup": profile.ageGroup if profile else "adult",
        "isPregnant": profile.isPregnant if profile else False,
        "hasRenalImpairment": profile.hasRenalImpairment if profile else False,
        "hasLiverDisease": profile.hasLiverDisease if profile else False,
        "hasCardiacHistory": profile.hasCardiacHistory if profile else False,
        "allergies": allergies,
    }

@app.post("/api/qr", dependencies=[Depends(auth)])
def make_qr(r: QRReq):
    profile = _qr_profile(r.profile, r.allergies or (r.profile.allergies if r.profile else []))
    body = zlib.compress(json.dumps({
        "m": r.medicines,
        "a": profile["allergies"],
        "n": r.name.strip(),
        "id": r.patientId.strip(),
        "g": r.age.strip(),
        "p": {k: v for k, v in profile.items() if k != "allergies"},
    }, separators=(",", ":")).encode())
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
    # Tokens minted before identity was encoded only carry "m" and "a";
    # they import with an empty identity and a default clinical profile.
    allergies = d.get("a") or []
    defaults = _qr_profile(None, allergies)
    carried = {k: v for k, v in (d.get("p") or {}).items() if k in defaults}
    profile = {**defaults, **carried, "allergies": allergies}
    patient = PatientProfile(**profile)
    return {
        "medicines": d.get("m", []),
        "allergies": allergies,
        "name": d.get("n", ""),
        "patientId": d.get("id", ""),
        "age": d.get("g", ""),
        "profile": patient.model_dump(),
        **report(d.get("m", []), "patient", "en", patient),
    }

