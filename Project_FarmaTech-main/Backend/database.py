import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "Data")

# Keys a database file may use to wrap its array of verified rule records.
RECORD_KEYS = ("records", "rules", "items", "data")

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Missing database file: {filename}")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON in file: {filename}")

def as_records(filename, payload):
    """Return the list of verified rule records held by a database file.

    A database ships either a bare JSON array of records or an object that wraps
    the array next to dataset metadata, e.g. {"metadata": {...}, "records": [...]}.
    Iterating the wrapped form yields its keys, so unwrap it once here and hand
    the deterministic engine a plain list of record objects. Record contents,
    including source metadata, are passed through untouched.
    """
    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict):
        records = next(
            (payload[k] for k in RECORD_KEYS if isinstance(payload.get(k), list)),
            None,
        )
        if records is None:
            raise ValueError(
                f"Unrecognised structure in file: {filename}. Expected an array of records "
                f"or an object with a '{RECORD_KEYS[0]}' array, got keys {sorted(payload)}"
            )
    else:
        raise ValueError(
            f"Unrecognised structure in file: {filename}. "
            f"Expected an array of records or an object, got {type(payload).__name__}"
        )

    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(
                f"Invalid record at index {index} in file: {filename}. "
                f"Expected an object, got {type(record).__name__}"
            )
    return records

try:
    MEDICINES_DB = as_records("medicines.json", load_json("medicines.json"))
    INTERACTIONS_DB = as_records("drugInteractions.json", load_json("drugInteractions.json"))
    CONTRAINDICATIONS_DB = as_records("contradiction.json", load_json("contradiction.json"))
    DUPLICATE_THERAPY_DB = as_records("duplicateTherapy.json", load_json("duplicateTherapy.json"))
    FOOD_WARNINGS_DB = as_records("foodwarning.json", load_json("foodwarning.json"))
except Exception as e:
    # We will raise the exception. The application won't start if databases are missing/invalid.
    raise e
