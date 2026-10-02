"""The four required core cases and the no-finding contract."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _check(medicines, patient=None):
    payload = {"medicines": medicines}
    if patient:
        payload["patient"] = patient
    return client.post("/api/check", json=payload).json()


def test_case_1_clopidogrel_warfarin_interaction():
    """CORE 1 - clopidogrel + warfarin sodium returns a verified interaction."""
    r = _check(["clopidogrel", "warfarin sodium"])
    f = next((x for x in r["findings"] if x["id"] == "clopidogrel-warfarin"), None)
    assert f is not None
    assert f["type"] == "interaction"
    assert f["severity"] == "major"
    assert f["verified_status"] == "verified"
    assert f["source"]["organization"] == "U.S. Food and Drug Administration (FDA)"
    assert r["found"] is True
    assert r["risk_level"] == "high"


def test_case_2_warfarin_pregnancy_contraindication():
    """CORE 2 - warfarin sodium + pregnancy returns a verified contraindication."""
    r = _check(["warfarin sodium"], {"isPregnant": True})
    f = next((x for x in r["findings"] if x["id"] == "warfarin-pregnancy"), None)
    assert f is not None
    assert f["type"] == "contraindication"
    assert f["condition"] == "pregnancy"
    assert f["verified_status"] == "verified"
    assert r["found"] is True
    assert r["risk_level"] == "high"


def test_case_3_acetaminophen_duplicate_ingredient():
    """CORE 3 - acetaminophen + acetaminophen-codeine returns a verified overlap."""
    r = _check(["acetaminophen", "acetaminophen and codeine phosphate"])
    f = next((x for x in r["findings"] if x["id"] == "acetaminophen-overlap"), None)
    assert f is not None
    assert f["type"] == "duplicate_ingredient"
    assert f["severity"] == "duplicate"
    assert f["verified_status"] == "verified"
    assert r["found"] is True


def test_case_4_metformin_montelukast_no_finding():
    """CORE 4 - metformin + montelukast returns no verified finding."""
    r = _check(["metformin", "montelukast"])
    assert r["findings"] == []
    assert r["found"] is False
    assert r["risk_score"] == 0
    assert r["unresolved"] == []


def test_no_finding_is_not_reported_as_safe():
    """No-finding responses carry no safety claim for the frontend to render."""
    r = _check(["metformin", "montelukast"])
    payload = " ".join(
        str(r.get(k, "")) for k in ("disclaimer", "risk_level", "summary")
    ).lower()
    for unsafe in ("safe", "no risk", "no danger", "guaranteed"):
        assert unsafe not in payload
    assert "decision support" in r["disclaimer"].lower()


def test_found_flag_tracks_findings_for_all_core_cases():
    """found is exactly len(findings) > 0 across the core cases."""
    cases = [
        (["clopidogrel", "warfarin sodium"], None, True),
        (["warfarin sodium"], {"isPregnant": True}, True),
        (["acetaminophen", "acetaminophen and codeine phosphate"], None, True),
        (["metformin", "montelukast"], None, False),
    ]
    for medicines, patient, expected in cases:
        r = _check(medicines, patient)
        assert r["found"] is expected
        assert r["found"] is bool(r["findings"])


def test_findings_are_never_produced_for_unresolved_medicines():
    """An unrecognized medicine yields no finding and is reported as unresolved."""
    r = _check(["UnknownDrug123"])
    assert r["findings"] == []
    assert r["unresolved"] == ["UnknownDrug123"]
    assert r["found"] is False
