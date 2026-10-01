# MediGuard Backend (MVP)
FastAPI backend: brand->generic mapping, deterministic interaction/duplicate engine,
What-If simulator, Groq explainer (with safe fallback), signed QR tokens.

## Run
pip install -r requirements.txt
cp .env.example .env   # set GROQ_API_KEY, API_KEY, QR_SECRET
uvicorn main:app --reload      # docs at http://127.0.0.1:8000/docs
pytest

## Endpoints
GET  /health | GET /api/drugs/search?q=dolo | POST /api/check | POST /api/simulate
POST /api/qr | GET /api/qr/{token}
Send header x-api-key if API_KEY is set.

## IMPORTANT
data.py is a small DEMO dataset (23 names, 16 rules). A pharmacist/doctor must review and
expand it, and Hindi/Gujarati text must be human-verified, before any real patient use.
Not yet included: user accounts, database (PostgreSQL), audit log, deployment.
