"""End-to-end verification of the authentication + record-persistence flow.

Run:  python -m pytest test_auth_flow.py -q
"""
import os
import sqlite3
import tempfile

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture()
def client():
    """A TestClient backed by an isolated, throwaway account database.

    main's module-level connection is redirected to a temp file so these tests
    never read or write a developer's real auth.db.
    """
    tmp = os.path.join(tempfile.mkdtemp(), "test_auth.db")
    main._db_conn = sqlite3.connect(tmp, check_same_thread=False)
    main._db_conn.row_factory = sqlite3.Row
    main._db_conn.execute(
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "email TEXT UNIQUE NOT NULL, "
        "full_name TEXT, "
        "password_hash TEXT NOT NULL, "
        "role TEXT NOT NULL, "
        "created_at TEXT DEFAULT (datetime('now')))"
    )
    main._db_conn.execute(
        "CREATE TABLE IF NOT EXISTS patient_records ("
        "user_id INTEGER PRIMARY KEY, "
        "record_json TEXT NOT NULL, "
        "updated_at TEXT DEFAULT (datetime('now')))"
    )
    main._db_conn.commit()
    c = TestClient(main.app)
    yield c
    try:
        main._db_conn.close()
    finally:
        main._db_conn = None


def test_full_auth_and_record_flow(client):
    # 1. /api/auth/me with no session -> 401
    r = client.get("/api/auth/me")
    assert r.status_code == 401

    # 2. Register a patient
    r = client.post("/api/auth/register", json={
        "email": "patient1@example.com",
        "password": "password123",
        "role": "patient",
        "full_name": "Test Patient",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["role"] == "patient"
    assert body["email"] == "patient1@example.com"
    # Session cookie must be set and HttpOnly
    assert "mediguard_session" in client.cookies
    set_cookie = r.headers.get("set-cookie", "")
    assert "HttpOnly" in set_cookie or "httponly" in set_cookie.lower()

    # 3. /api/auth/me now returns the account
    r = client.get("/api/auth/me")
    assert r.status_code == 200, r.text
    me = r.json()
    assert me["role"] == "patient"
    assert me["email"] == "patient1@example.com"
    assert me["authenticated"] is True

    # 4. Save a patient record
    r = client.put("/api/patient-records/me", json={
        "source": "manual",
        "name": "Test Patient",
        "patientId": "P001",
        "age": "34",
        "medicines": ["warfarin sodium", "clopidogrel"],
        "profile": {
            "ageGroup": "adult",
            "isPregnant": False,
            "hasRenalImpairment": False,
            "hasLiverDisease": False,
            "hasCardiacHistory": True,
            "allergies": ["Penicillin"],
        },
    })
    assert r.status_code == 200, r.text

    # 5. Load it back
    r = client.get("/api/patient-records/me")
    assert r.status_code == 200, r.text
    rec = r.json()
    assert rec["medicines"] == ["warfarin sodium", "clopidogrel"]
    assert rec["profile"]["allergies"] == ["Penicillin"]

    # 6. Duplicate registration rejected
    r = client.post("/api/auth/register", json={
        "email": "patient1@example.com", "password": "password123", "role": "patient",
    })
    assert r.status_code == 409

    # 7. Logout clears the cookie
    r = client.post("/api/auth/logout")
    assert r.status_code == 200
    assert client.cookies.get("mediguard_session") in (None, "")

    # 8. After logout, /api/auth/me and record access are 401
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/patient-records/me").status_code == 401

    # 9. Login again with correct credentials
    r = client.post("/api/auth/login", json={
        "email": "patient1@example.com", "password": "password123",
    })
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "patient"

    # 10. Record survived the logout/login cycle (persistence)
    r = client.get("/api/patient-records/me")
    assert r.status_code == 200
    assert r.json()["medicines"] == ["warfarin sodium", "clopidogrel"]

    # 11. Wrong password rejected
    client.post("/api/auth/logout")
    r = client.post("/api/auth/login", json={
        "email": "patient1@example.com", "password": "wrongpassword",
    })
    assert r.status_code == 401

    # 12. Unknown email rejected with the same message
    r = client.post("/api/auth/login", json={
        "email": "nobody@example.com", "password": "password123",
    })
    assert r.status_code == 401


def test_role_isolation_between_accounts(client):
    """A second patient cannot read the first patient's record."""
    # Register + login patient A, save a record
    client.post("/api/auth/register", json={
        "email": "alice@example.com", "password": "password123", "role": "patient",
    })
    client.put("/api/patient-records/me", json={
        "source": "manual", "name": "Alice", "patientId": "A1",
        "age": "40", "medicines": ["aspirin"],
        "profile": {"ageGroup": "adult", "allergies": []},
    })
    client.post("/api/auth/logout")

    # Register + login patient B
    client.post("/api/auth/register", json={
        "email": "bob@example.com", "password": "password123", "role": "patient",
    })

    # Bob has no record (Alice's is not visible to him)
    r = client.get("/api/patient-records/me")
    assert r.status_code == 404, r.text


def test_role_mismatch_does_not_grant_wrong_dashboard(client):
    """A patient account's session reports role 'patient', never 'doctor'."""
    client.post("/api/auth/register", json={
        "email": "carol@example.com", "password": "password123", "role": "patient",
    })
    r = client.get("/api/auth/me")
    assert r.json()["role"] == "patient"

    # A doctor account reports 'doctor'
    client.post("/api/auth/logout")
    client.post("/api/auth/register", json={
        "email": "drsmith@example.com", "password": "password123", "role": "doctor",
    })
    r = client.get("/api/auth/me")
    assert r.json()["role"] == "doctor"


def test_forged_token_rejected(client):
    """A token with a valid structure but wrong signature is rejected."""
    client.post("/api/auth/register", json={
        "email": "dave@example.com", "password": "password123", "role": "patient",
    })
    real = client.cookies.get("mediguard_session")
    assert real is not None

    # Tamper with the signature
    parts = real.split(".")
    forged = f"{parts[0]}.{parts[1]}.AAAAAAAAAAAAAAAAAAAAAA"
    client.cookies.set("mediguard_session", forged)
    assert client.get("/api/auth/me").status_code == 401

    # Tamper with the role claim (try to become doctor)
    forged2 = f"{parts[0]}.doctor.{parts[2]}"
    client.cookies.set("mediguard_session", forged2)
    r = client.get("/api/auth/me")
    assert r.status_code == 401

    # Restore and confirm the real token still works
    client.cookies.set("mediguard_session", real)
    assert client.get("/api/auth/me").status_code == 200


def test_doctor_cannot_use_patient_record_endpoint_without_session(client):
    """Record endpoints require an authenticated session."""
    assert client.get("/api/patient-records/me").status_code == 401
    assert client.put("/api/patient-records/me", json={
        "medicines": ["x"],
    }).status_code == 401
    assert client.delete("/api/patient-records/me").status_code == 401
