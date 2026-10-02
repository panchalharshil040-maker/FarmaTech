import os
from fastapi.testclient import TestClient
import main as _main
from main import app, GEMINI_API_KEY

client = TestClient(app)
_ORIGINAL_CALL_GEMINI = _main.call_gemini

def test_explain_endpoint_accepts_verified_findings():
    # We will test the fallback mechanism since we shouldn't necessarily make real API calls in CI unless configured,
    # but this verifies the endpoint accepts the findings.
    req = {
        "findings": [
            {
                "id": "clopidogrel-warfarin",
                "type": "drug-drug",
                "drugA": "clopidogrel",
                "drugB": "warfarin sodium",
                "risk": "increased bleeding risk",
                "action": "monitor for bleeding",
                "source": {
                    "organization": "FDA"
                },
                "verified": True
            }
        ],
        "view": "doctor",
        "language": "en"
    }
    res = client.post("/api/explain", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "explanations" in data
    assert len(data["explanations"]) == 1
    assert data["explanations"][0]["findingId"] == "clopidogrel-warfarin"
    assert "explanation" in data["explanations"][0]

def test_explain_empty_findings_rejected():
    req = {
        "findings": [],
        "view": "doctor",
        "language": "en"
    }
    res = client.post("/api/explain", json=req)
    assert res.status_code == 422  # Unprocessable Entity (Pydantic validation)

def test_gemini_failure_fallback(monkeypatch):
    import main
    # If we force an invalid key or simulate failure, it should fallback to deterministic
    monkeypatch.setattr(main, "AI_PROVIDER", "gemini")
    original_key = main.GEMINI_API_KEY
    main.GEMINI_API_KEY = "invalid_key_to_force_failure"
    
    req = {
        "findings": [
            {"id": "test-id", "mechanism": "test mechanism"}
        ]
    }
    try:
        res = client.post("/api/explain", json=req)
        assert res.status_code == 200
        data = res.json()
        assert "Deterministic findings summary" in data["summary"]
        assert data["explanations"][0]["explanation"] == "test mechanism"
    finally:
        main.GEMINI_API_KEY = original_key

def test_api_key_not_exposed():
    # Check that GEMINI_API_KEY is not leaked in the fallback or success response
    req = {
        "findings": [
            {"id": "test-id", "mechanism": "test mechanism"}
        ]
    }
    res = client.post("/api/explain", json=req)
    response_text = res.text
    if GEMINI_API_KEY:
        assert GEMINI_API_KEY not in response_text


def test_explain_fallback_flags_ai_used_false(monkeypatch):
    """The deterministic fallback must be labelled as non-AI."""
    import main
    monkeypatch.setattr(main, "AI_PROVIDER", "gemini")
    original_key = main.GEMINI_API_KEY
    main.GEMINI_API_KEY = None
    try:
        res = client.post(
            "/api/explain",
            json={"findings": [{"id": "test-id", "mechanism": "test mechanism"}]},
        )
        assert res.status_code == 200
        assert res.json()["ai_used"] is False
    finally:
        main.GEMINI_API_KEY = original_key


def test_explain_flags_ai_used_true_on_gemini_success(monkeypatch):
    """When Gemini answers, the response is flagged as AI-generated."""
    import main
    monkeypatch.setattr(main, "AI_PROVIDER", "gemini")

    def fake_call_gemini(findings, view, language):
        return {
            "summary": "plain-language summary",
            "explanations": [
                {"findingId": f.get("id", "unknown"), "explanation": "explanation text"}
                for f in findings
            ],
            "disclaimer": "explanatory only",
        }

    monkeypatch.setattr(main, "call_gemini", fake_call_gemini)
    res = client.post(
        "/api/explain",
        json={"findings": [{"id": "test-id", "mechanism": "test mechanism"}]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ai_used"] is True
    assert body["summary"] == "plain-language summary"
    assert body["explanations"][0]["findingId"] == "test-id"
    assert "mechanism" not in res.text


def test_explain_never_invents_findings_for_empty_input():
    """No verified finding supplied means no explanation is produced."""
    import main

    def explode(findings, view, language):
        raise AssertionError("Gemini must not be called without verified findings")

    main.call_gemini = explode
    try:
        res = client.post("/api/explain", json={"findings": []})
        assert res.status_code == 422
    finally:
        main.call_gemini = _ORIGINAL_CALL_GEMINI


def test_groq_key_detection():
    """Verify GROQ_API_KEY is detected without printing it."""
    import main
    key = main.GROQ_API_KEY
    assert key is not None and len(key) > 0
    assert key != "invalid_key_to_force_failure"


def test_groq_failure_fallback():
    """When Groq fails, should fallback to deterministic."""
    import main
    original_key = main.GROQ_API_KEY
    main.GROQ_API_KEY = "invalid_key_to_force_failure"

    req = {
        "findings": [
            {"id": "test-id", "mechanism": "test mechanism"}
        ]
    }
    try:
        res = client.post("/api/explain", json=req)
        assert res.status_code == 200
        data = res.json()
        assert "Deterministic findings summary" in data["summary"]
        assert data["explanations"][0]["explanation"] == "test mechanism"
        assert data["ai_used"] is False
        assert data["provider"] == "deterministic"
    finally:
        main.GROQ_API_KEY = original_key


def test_groq_success_flags_provider():
    """When Groq succeeds, response should indicate groq provider."""
    import main

    def fake_call_groq(findings, view, language):
        return {
            "summary": "groq summary",
            "explanations": [
                {"findingId": f.get("id", "unknown"), "explanation": "groq explanation"}
                for f in findings
            ],
            "disclaimer": "groq disclaimer",
        }

    original = main.call_groq
    main.call_groq = fake_call_groq
    try:
        res = client.post(
            "/api/explain",
            json={"findings": [{"id": "test-id", "mechanism": "test mechanism"}]},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["ai_used"] is True
        assert body["provider"] == "groq"
        assert body["summary"] == "groq summary"
    finally:
        main.call_groq = original
