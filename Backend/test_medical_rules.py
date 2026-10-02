"""Complete test suite for the four medical rule categories."""

from fastapi.testclient import TestClient
from database import CONTRAINDICATIONS_DB
from main import app

client = TestClient(app)

def test_1_medicine_lookup():
    """TEST 1 - MEDICINE LOOKUP"""
    # 1. Known medicine (exact match)
    res = client.get("/api/drugs/search?q=acetaminophen").json()
    assert len(res) > 0
    assert any("acetaminophen" in r["name"].lower() for r in res)

    # 2. Different capitalization
    res_cap = client.get("/api/drugs/search?q=AcEtaMinopHen").json()
    assert len(res_cap) > 0
    assert any("acetaminophen" in r["name"].lower() for r in res_cap)

    # 3. Extra whitespace
    res_space = client.get("/api/drugs/search?q=  acetaminophen   ").json()
    assert len(res_space) > 0

    # 4. Unknown medicine (negative case)
    res_unknown = client.get("/api/drugs/search?q=unknown_fake_drug_123").json()
    assert len(res_unknown) == 0


def test_2_drug_drug_interaction():
    """TEST 2 - DRUG-DRUG INTERACTION"""
    # 1. Actual interaction from drugInteractions.json (clopidogrel + warfarin sodium)
    res = client.post("/api/check", json={"medicines": ["clopidogrel", "warfarin sodium"]}).json()
    
    # Verify the finding metadata
    interaction = next((f for f in res["findings"] if f["type"] == "interaction"), None)
    assert interaction is not None
    assert interaction["id"] == "clopidogrel-warfarin"
    assert set(interaction["drugs"]) == {"clopidogrel", "warfarin"}
    assert interaction["mechanism"] == "increased bleeding risk"
    assert interaction["recommendation"] == "monitor for bleeding"
    assert interaction["verified_status"] == "verified"
    assert "organization" in interaction["source"]

    # 2. Reversed drug order
    res_reversed = client.post("/api/check", json={"medicines": ["warfarin sodium", "clopidogrel"]}).json()
    assert any(f["id"] == "clopidogrel-warfarin" for f in res_reversed["findings"])

    # 3. Duplicate input
    res_duplicate = client.post("/api/check", json={"medicines": ["clopidogrel", "clopidogrel", "warfarin sodium"]}).json()
    assert any(f["id"] == "clopidogrel-warfarin" for f in res_duplicate["findings"])

    # 4. Unrelated drug pair (negative case)
    res_unrelated = client.post("/api/check", json={"medicines": ["acetaminophen", "amoxicillin"]}).json()
    assert not any(f["type"] == "interaction" for f in res_unrelated["findings"])


def test_3_patient_condition_contraindication():
    """TEST 3 - PATIENT CONDITION CONTRADICTION"""
    # 1. Actual contradiction (warfarin sodium + pregnancy)
    # The frontend payload would pass `patient: { isPregnant: True }`
    payload = {
        "medicines": ["warfarin sodium"],
        "patient": {
            "isPregnant": True
        }
    }
    res = client.post("/api/check", json=payload).json()
    
    contra = next((f for f in res["findings"] if f["type"] == "contraindication"), None)
    assert contra is not None
    assert contra["id"] == "warfarin-pregnancy"
    assert contra["drugs"] == ["warfarin"]
    assert contra["condition"] == "pregnancy"

    # The database is the source of truth: the rule text must be passed through verbatim.
    record = next(r for r in CONTRAINDICATIONS_DB if r["id"] == "warfarin-pregnancy")
    assert contra["mechanism"] == record["rule"]
    assert "mechanical-heart-valve" in contra["mechanism"]
    assert contra["verified_status"] == "verified"
    assert contra["source"] == record["source"]
    assert "organization" in contra["source"]

    # 2. Negative case: warfarin sodium WITHOUT pregnancy condition
    res_negative = client.post("/api/check", json={"medicines": ["warfarin sodium"]}).json()
    assert not any(f["type"] == "contraindication" for f in res_negative["findings"])
    
    # 3. Negative case: pregnancy WITH a non-contraindicated drug
    payload_safe = {
        "medicines": ["acetaminophen"],
        "patient": {
            "isPregnant": True
        }
    }
    res_safe = client.post("/api/check", json=payload_safe).json()
    assert not any(f["type"] == "contraindication" for f in res_safe["findings"])


def test_4_duplicate_therapy():
    """TEST 4 - DUPLICATE THERAPY"""
    # 1. Actual duplicate therapy from duplicateTherapy.json (acetaminophen + acetaminophen-codeine)
    res = client.post("/api/check", json={"medicines": ["acetaminophen", "acetaminophen and codeine phosphate"]}).json()
    
    dup = next((f for f in res["findings"] if f["type"] == "duplicate_ingredient"), None)
    assert dup is not None
    assert dup["id"] == "acetaminophen-overlap"
    assert set(dup["drugs"]) == {"acetaminophen", "acetaminophen-codeine"}
    assert "deterministic engine can flag the active-ingredient overlap" in dup["mechanism"]
    assert dup["verified_status"] == "verified"
    assert "organization" in dup["source"]

    # 2. Negative case: unrelated drugs
    res_negative = client.post("/api/check", json={"medicines": ["acetaminophen", "clopidogrel"]}).json()
    assert not any(f["type"] == "duplicate_ingredient" for f in res_negative["findings"])

