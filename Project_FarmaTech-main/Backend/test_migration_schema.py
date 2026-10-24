"""Tests verifying database migration, schema validation, and brand resolution."""

import os
from fastapi.testclient import TestClient
from database import (
    DATA_DIR,
    MEDICINES_DB,
    INTERACTIONS_DB,
    CONTRAINDICATIONS_DB,
    DUPLICATE_THERAPY_DB,
    FOOD_WARNINGS_DB,
    load_json,
    as_records
)
from main import app, find_medicine, resolve

client = TestClient(app)

def test_database_loading_and_counts():
    """Verify all 5 intended active databases load successfully with correct counts."""
    assert len(MEDICINES_DB) == 54
    assert len(INTERACTIONS_DB) == 43
    assert len(CONTRAINDICATIONS_DB) == 39
    assert len(DUPLICATE_THERAPY_DB) == 5
    assert len(FOOD_WARNINGS_DB) == 6

def test_json_parsing_and_no_duplicate_ids():
    """Verify JSON parsing and absence of duplicate IDs in all active databases."""
    db_map = {
        "medicines.json": MEDICINES_DB,
        "drugInteractions.json": INTERACTIONS_DB,
        "contradiction.json": CONTRAINDICATIONS_DB,
        "duplicateTherapy.json": DUPLICATE_THERAPY_DB,
        "foodwarning.json": FOOD_WARNINGS_DB,
    }
    for filename, records in db_map.items():
        raw = load_json(filename)
        unwrapped = as_records(filename, raw)
        assert len(unwrapped) == len(records)
        ids = [r["id"] for r in records]
        assert len(ids) == len(set(ids)), f"Duplicate IDs detected in {filename}"

def test_required_fields_and_source_metadata():
    """Verify required schema fields and source metadata across all databases."""
    # Medicines schema
    for med in MEDICINES_DB:
        for f in ["id", "genericName", "indianGenericName", "brandNames", "indianBrandNames", "activeIngredientIds", "rxcui", "source"]:
            assert f in med, f"Medicine {med.get('id')} missing {f}"
        assert med["source"], f"Medicine {med.get('id')} missing source metadata"

    # Drug interactions schema
    for item in INTERACTIONS_DB:
        for f in ["id", "drugA", "drugB", "ruleType", "risk", "action", "source"]:
            assert f in item, f"Interaction {item.get('id')} missing {f}"
        assert item["source"], f"Interaction {item.get('id')} missing source"

    # Contraindications schema
    for contra in CONTRAINDICATIONS_DB:
        for f in ["id", "drug", "medicineId", "condition", "type", "rule", "source"]:
            assert f in contra, f"Contraindication {contra.get('id')} missing {f}"
        assert contra["source"], f"Contraindication {contra.get('id')} missing source"

    # Duplicate therapy schema
    for dup in DUPLICATE_THERAPY_DB:
        for f in ["id", "type", "rule", "importantLimit", "sourceA", "sourceB"]:
            assert f in dup, f"Duplicate therapy {dup.get('id')} missing {f}"
        assert dup["sourceA"] and dup["sourceB"], f"Duplicate therapy {dup.get('id')} missing source"

    # Food warnings schema
    for fw in FOOD_WARNINGS_DB:
        for f in ["id", "medicineId", "genericName", "food", "warning", "effect", "source"]:
            assert f in fw, f"Food warning {fw.get('id')} missing {f}"
        assert fw["source"], f"Food warning {fw.get('id')} missing source"

def test_referential_integrity():
    """Verify that cross-database references to medicine IDs and ingredients are valid."""
    med_ids = {m["id"] for m in MEDICINES_DB}
    all_ing_ids = {i for m in MEDICINES_DB for i in m.get("activeIngredientIds", [])}

    for contra in CONTRAINDICATIONS_DB:
        assert contra["medicineId"] in med_ids, f"Contraindication {contra['id']} references unknown medicineId {contra['medicineId']}"

    for fw in FOOD_WARNINGS_DB:
        assert fw["medicineId"] in med_ids, f"Food warning {fw['id']} references unknown medicineId {fw['medicineId']}"

    for dup in DUPLICATE_THERAPY_DB:
        ma = dup.get("medicineAId")
        mb = dup.get("medicineBId")
        ing = dup.get("ingredientId")
        if ma:
            assert ma in med_ids, f"Duplicate therapy {dup['id']} references unknown medicineAId {ma}"
        if mb:
            assert mb in med_ids, f"Duplicate therapy {dup['id']} references unknown medicineBId {mb}"
        if ing:
            assert ing in all_ing_ids or ing in med_ids, f"Duplicate therapy {dup['id']} references unknown ingredientId {ing}"

    for item in INTERACTIONS_DB:
        ia = item.get("ingredientAId")
        ib = item.get("ingredientBId")
        if ia:
            assert ia in all_ing_ids or ia in med_ids, f"Interaction {item['id']} references unknown ingredientAId {ia}"
        if ib:
            assert ib in all_ing_ids or ib in med_ids, f"Interaction {item['id']} references unknown ingredientBId {ib}"

def test_representative_medicine_resolution():
    """Verify representative generic and Indian brand name resolution."""
    cases = [
        ("Dolo 650", "acetaminophen", ["paracetamol"]),
        ("Crocin", "acetaminophen", ["paracetamol"]),
        ("Clopilet", "clopidogrel", ["clopidogrel"]),
        ("Thyronorm", "levothyroxine", ["levothyroxine"]),
        ("Warfarin sodium", "warfarin", ["warfarin"]),
        ("Metformin", "metformin", ["metformin"]),
        ("Montelukast", "montelukast", ["montelukast"]),
    ]
    for input_name, expected_id, expected_ings in cases:
        med = find_medicine(input_name)
        assert med is not None, f"Failed to find medicine for '{input_name}'"
        assert med["id"] == expected_id, f"Expected ID {expected_id} for '{input_name}', got {med['id']}"
        ings = resolve(input_name)
        assert ings == expected_ings, f"Expected ingredients {expected_ings} for '{input_name}', got {ings}"

def test_api_check_with_indian_brands():
    """Verify /api/check resolves Indian brand names and detects interactions."""
    # Clopilet (clopidogrel) + Warfarin sodium should detect the clopidogrel-warfarin interaction
    res = client.post("/api/check", json={"medicines": ["Clopilet", "Warfarin sodium"]}).json()
    assert res["unresolved"] == []
    interaction = next((f for f in res["findings"] if f["id"] == "clopidogrel-warfarin"), None)
    assert interaction is not None
    assert interaction["verified_status"] == "verified"

def test_food_warning_matching_montelukast():
    """Verify food warning is attached for montelukast."""
    res = client.post("/api/check", json={"medicines": ["Montelukast"]}).json()
    assert res["unresolved"] == []
    fw = next((w for w in res["food_warnings"] if w["id"] == "FW-MON-001"), None)
    assert fw is not None
    assert fw["food"] == "without regard to time of food ingestion"
    assert "evening" in fw["warning"].lower()

def test_unresolved_medicine_handling():
    """Unresolvable medicine is reported as unresolved without fabricated findings."""
    res = client.post("/api/check", json={"medicines": ["NonExistentDrugXYZ999"]}).json()
    assert res["unresolved"] == ["NonExistentDrugXYZ999"]
    assert res["findings"] == []
    assert res["found"] is False
