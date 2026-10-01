import os
from fastapi.testclient import TestClient
from main import app, GEMINI_API_KEY

client = TestClient(app)

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

def test_gemini_failure_fallback():
    import main
    # If we force an invalid key or simulate failure, it should fallback to deterministic
    original_key = main.GEMINI_API_KEY
    main.GEMINI_API_KEY = "invalid_key_to_force_failure"
    
    req = {
        "findings": [
            {"id": "test-id", "mechanism": "test mechanism"}
        ]
    }
    res = client.post("/api/explain", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "Deterministic findings summary" in data["summary"]
    assert data["explanations"][0]["explanation"] == "test mechanism"
    
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
