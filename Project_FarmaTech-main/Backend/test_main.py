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
    r = client.get("/api/drugs/search", params={"q": "acetaminophen"})
    assert r.status_code == 200
    names = [d["name"].lower() for d in r.json()]
    assert any("acetaminophen" in n for n in names)

# --- Interaction check ---
def test_duplicate_ingredient():
    """Two medicines with overlapping ingredients should trigger a duplicate finding."""
    r = client.post("/api/check", json={"medicines": ["acetaminophen", "acetaminophen and codeine phosphate"]}).json()
    assert any(f["type"] in ("duplicate_ingredient", "active-ingredient-overlap") for f in r["findings"])

def test_clopidogrel_warfarin_major():
    """clopidogrel + warfarin sodium is a major interaction."""
    r = client.post("/api/check", json={"medicines": ["clopidogrel", "warfarin sodium"]}).json()
    assert r["risk_level"] == "high"
    assert any(f["severity"] == "major" for f in r["findings"])

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
    """Adding clopidogrel to warfarin sodium should increase risk score."""
    r = client.post(
        "/api/simulate",
        json={"medicines": ["warfarin sodium"], "new_medicine": "clopidogrel"},
    ).json()
    assert r["delta"] > 0
    assert r["after_score"] > r["before_score"]

def test_simulate_interaction():
    """Proposed medicine creating a known interaction is detected as a new finding."""
    r = client.post(
        "/api/simulate",
        json={"medicines": ["clopidogrel"], "new_medicine": "warfarin sodium"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["delta"] == 40
    assert data["after_score"] == 40
    assert data["before_score"] == 0
    assert len(data["new_findings"]) == 1
    assert data["new_findings"][0]["id"] == "clopidogrel-warfarin"
    assert data["found"] is True

def test_simulate_duplicate_therapy():
    """Proposed medicine creating duplicate therapy is detected as a new finding."""
    r = client.post(
        "/api/simulate",
        json={"medicines": ["simvastatin"], "new_medicine": "rosuvastatin calcium"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["delta"] == 25
    assert len(data["new_findings"]) == 1
    assert data["new_findings"][0]["id"] == "simvastatin-rosuvastatin-overlap"
    assert data["found"] is True

def test_simulate_contraindication_with_patient_condition():
    """Proposed medicine contraindication against patient condition is detected."""
    r = client.post(
        "/api/simulate",
        json={
            "medicines": ["metformin"],
            "new_medicine": "warfarin sodium",
            "patient": {"isPregnant": True},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["delta"] == 40
    assert any(f.get("id") == "warfarin-pregnancy" for f in data["new_findings"])
    assert data["found"] is True

def test_simulate_no_matching_verified_finding():
    """Proposed medicine with no interaction has 0 delta and no new findings."""
    r = client.post(
        "/api/simulate",
        json={"medicines": ["metformin"], "new_medicine": "montelukast"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["delta"] == 0
    assert len(data["new_findings"]) == 0
    assert data["found"] is False

def test_simulate_existing_before_finding_not_reported_as_new():
    """A finding that already existed BEFORE adding the medicine must not be in new_findings."""
    r = client.post(
        "/api/simulate",
        json={
            "medicines": ["clopidogrel", "warfarin sodium"],
            "new_medicine": "montelukast",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["before_score"] == 40
    assert data["after_score"] == 40
    assert data["delta"] == 0
    assert len(data["new_findings"]) == 0
    assert data["found"] is False

def test_simulate_empty_proposed_medicine_rejected():
    """Empty proposed medicine should return 422."""
    r = client.post(
        "/api/simulate",
        json={"medicines": ["warfarin sodium"], "new_medicine": "   "},
    )
    assert r.status_code == 422

# --- Multi-language / view tests ---
def test_hindi_patient_view():
    """Patient view in Hindi should use Hindi template text."""
    r = client.post(
        "/api/check",
        json={"medicines": ["clopidogrel", "warfarin sodium"], "view": "patient", "language": "hi"},
    ).json()
    assert "गंभीर खतरा" in r["findings"][0]["explanation"] or r["findings"][0]["severity"] == "major"

def test_doctor_view_mechanism():
    """Doctor view should show the raw mechanism text."""
    r = client.post(
        "/api/check",
        json={"medicines": ["clopidogrel", "warfarin sodium"], "view": "doctor", "language": "en"},
    ).json()
    assert "bleeding" in r["findings"][0]["explanation"].lower() or "interaction" in r["findings"][0]["explanation"].lower()

# --- QR code endpoints ---
def test_qr_roundtrip_and_tamper():
    """QR token encodes medicines+allergies and detects tampering."""
    token = client.post(
        "/api/qr",
        json={"medicines": ["warfarin sodium", "clopidogrel"], "allergies": ["penicillin"]},
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
