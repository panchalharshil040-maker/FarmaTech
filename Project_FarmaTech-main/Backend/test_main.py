"""Tests for the MediGuard API endpoints."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# --- Health check ---

def test_health():
    """Health endpoint returns ok status."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# --- Drug search ---

def test_drug_search():
    """Search returns matching brands."""
    r = client.get("/api/drugs/search", params={"q": "dolo"})
    assert r.status_code == 200
    names = [d["name"] for d in r.json()]
    assert "dolo 650" in names


# --- Interaction check ---

def test_brand_mapping_and_duplicate():
    """Two brands of paracetamol should trigger a duplicate_ingredient finding."""
    r = client.post("/api/check", json={"medicines": ["Dolo 650", "Crocin"]}).json()
    assert any(
        f["type"] == "duplicate_ingredient" and f["drugs"] == ["paracetamol"]
        for f in r["findings"]
    )


def test_warfarin_ibuprofen_major():
    """Warfarin + Brufen (ibuprofen) is a major interaction → high risk."""
    r = client.post("/api/check", json={"medicines": ["Warfarin", "Brufen"]}).json()
    assert r["risk_level"] == "high"
    assert any(f["severity"] == "major" for f in r["findings"])


def test_combiflam_plus_dolo_duplicate():
    """Combiflam (ibuprofen+paracetamol) + Dolo 650 → duplicate paracetamol."""
    r = client.post("/api/check", json={"medicines": ["Combiflam", "Dolo 650"]}).json()
    assert any(f["drugs"] == ["paracetamol"] for f in r["findings"])


def test_unresolved_drug():
    """Unknown drug name should appear in unresolved list."""
    r = client.post("/api/check", json={"medicines": ["UnknownDrug123"]}).json()
    assert "UnknownDrug123" in r["unresolved"]
    assert r["risk_level"] == "low"


def test_empty_medicines_rejected():
    """Empty medicine list should be rejected with 422."""
    r = client.post("/api/check", json={"medicines": []})
    assert r.status_code == 422


# --- Simulate endpoint ---

def test_simulate_delta():
    """Adding Ecosprin to Warfarin should increase risk score."""
    r = client.post(
        "/api/simulate",
        json={"medicines": ["Warfarin"], "new_medicine": "Ecosprin"},
    ).json()
    assert r["delta"] > 0
    assert r["after_score"] > r["before_score"]


# --- Multi-language / view tests ---

def test_hindi_patient_view():
    """Patient view in Hindi should use Hindi template text."""
    r = client.post(
        "/api/check",
        json={"medicines": ["Warfarin", "Ecosprin"], "view": "patient", "language": "hi"},
    ).json()
    assert "गंभीर" in r["findings"][0]["explanation"]


def test_doctor_view_mechanism():
    """Doctor view should show the raw mechanism text."""
    r = client.post(
        "/api/check",
        json={"medicines": ["Warfarin", "Ecosprin"], "view": "doctor", "language": "en"},
    ).json()
    assert "bleeding" in r["findings"][0]["explanation"].lower()


# --- QR code endpoints ---

def test_qr_roundtrip_and_tamper():
    """QR token encodes medicines+allergies and detects tampering."""
    token = client.post(
        "/api/qr",
        json={"medicines": ["Warfarin", "Brufen"], "allergies": ["penicillin"]},
    ).json()["token"]

    # Valid token decodes correctly
    decoded = client.get(f"/api/qr/{token}").json()
    assert decoded["allergies"] == ["penicillin"]
    assert decoded["risk_level"] == "high"

    # Tampered token returns 400
    assert client.get(f"/api/qr/{token[:-2]}xx").status_code == 400


def test_qr_empty_medicines_rejected():
    """QR endpoint should reject empty medicine list."""
    r = client.post("/api/qr", json={"medicines": [], "allergies": []})
    assert r.status_code == 422
