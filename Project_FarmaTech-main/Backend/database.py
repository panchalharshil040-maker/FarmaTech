import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "Data")

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Missing database file: {filename}")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON in file: {filename}")

try:
    MEDICINES_DB = load_json("medicines.json")
    INTERACTIONS_DB = load_json("drugInteractions.json")
    CONTRAINDICATIONS_DB = load_json("contradiction.json")
    DUPLICATE_THERAPY_DB = load_json("duplicateTherapy.json")
except Exception as e:
    # We will raise the exception. The application won't start if databases are missing/invalid.
    raise e
