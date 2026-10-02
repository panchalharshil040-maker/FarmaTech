# MediGuard Backend (MVP)
FastAPI backend over the verified JSON medical databases, with a deterministic
rule engine as the only source of medical truth and an optional Gemini
explanation layer.

## Run
pip install -r requirements.txt
cp .env.example .env   # set GEMINI_API_KEY, API_KEY, QR_SECRET, ALLOWED_ORIGINS
uvicorn main:app --reload      # docs at http://127.0.0.1:8000/docs
pytest

`.env` is loaded automatically at import time via python-dotenv.

## Endpoints
GET  /health | GET /api/drugs/search?q=acetaminophen | POST /api/check | POST /api/simulate
POST /api/explain | POST /api/qr | GET /api/qr/{token}
Send header x-api-key if API_KEY is set.

## Medical truth
`Data/*.json` are the verified source of truth. `analyze()` in `main.py` is the
only thing that decides interactions, contraindications, duplicate therapy,
severity and risk score. Findings carry `id`, `verified_status` and `source`.

`POST /api/explain` is presentation-only. Gemini receives verified findings and
may only restate them. It never determines interactions, contraindications,
duplicate therapy, medicine identity, severity, risk score, diagnosis or
treatment. `GEMINI_API_KEY` stays server-side and is never sent to the browser.

Responses include `ai_used` (true = Gemini, false = deterministic fallback), so
the UI never labels fallback text as AI-generated.

When the database returns no matching rule, the response has `found: false` and
an empty `findings` list. This means "no verified finding", not "safe" — the UI
must not present it as a safety guarantee.

## IMPORTANT
data.py holds a small legacy DEMO dataset used only for localized patient-view
templates (English/Hindi/Gujarati). It is not a source of interactions or
contraindications. A pharmacist/doctor must review the Hindi/Gujarati
template text before any real patient use.

Not yet included: user accounts, database (PostgreSQL), audit log, deployment.
