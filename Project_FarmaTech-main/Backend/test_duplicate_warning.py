import json
import os
import re

meds_path = os.path.join(os.path.dirname(__file__), 'Data', 'medicines.json')
meds = json.load(open(meds_path, encoding='utf-8'))

def classify_medicine(name):
    norm = name.lower().strip()
    # Check exact/case-insensitive match across all medicines
    for med in meds:
        active_ings = [i.lower().strip() for i in med.get('activeIngredientIds') or [med.get('id')]]
        med_id = med.get('id', '').lower().strip()
        gen = med.get('genericName', '').lower().strip()
        ind_gen = med.get('indianGenericName', '').lower().strip()
        ind_brands = [b.lower().strip() for b in med.get('indianBrandNames', [])]
        brands = [b.lower().strip() for b in med.get('brandNames', [])]

        # 1. Brand match
        if norm in ind_brands:
            return {'type': 'brand', 'ingredients': active_ings, 'record': med}
        for b in brands:
            if norm == b and norm not in (med_id, gen, ind_gen, *active_ings):
                return {'type': 'brand', 'ingredients': active_ings, 'record': med}

        # 2. Generic match
        generics = [med_id, gen, ind_gen, *active_ings]
        if norm in generics or any(norm == g.split()[0] for g in generics if g):
            return {'type': 'generic', 'ingredients': active_ings, 'record': med}

    # If no exact match, try stripping strength/dosage (e.g. 'Aspirin 75mg' -> 'Aspirin', 'Glycomet 500' -> 'Glycomet')
    norm_stripped = re.sub(r'\s*\b\d+(\.\d+)?\s*(mg|mcg|g|ml)?\b', '', norm).strip()
    if norm_stripped and norm_stripped != norm:
        for med in meds:
            active_ings = [i.lower().strip() for i in med.get('activeIngredientIds') or [med.get('id')]]
            med_id = med.get('id', '').lower().strip()
            gen = med.get('genericName', '').lower().strip()
            ind_gen = med.get('indianGenericName', '').lower().strip()
            ind_brands = [b.lower().strip() for b in med.get('indianBrandNames', [])]
            brands = [b.lower().strip() for b in med.get('brandNames', [])]

            if norm_stripped in ind_brands:
                return {'type': 'brand', 'ingredients': active_ings, 'record': med}
            for b in brands:
                if norm_stripped == b and norm_stripped not in (med_id, gen, ind_gen, *active_ings):
                    return {'type': 'brand', 'ingredients': active_ings, 'record': med}

            generics = [med_id, gen, ind_gen, *active_ings]
            if norm_stripped in generics or any(norm_stripped == g.split()[0] for g in generics if g):
                return {'type': 'generic', 'ingredients': active_ings, 'record': med}

    return None

def check_duplicate_warning(existing_meds, new_med):
    new_info = classify_medicine(new_med)
    if not new_info:
        return None
    for ex in existing_meds:
        ex_info = classify_medicine(ex)
        if not ex_info:
            continue
        # Check if they share any active ingredient
        has_common_ingredient = any(i in ex_info['ingredients'] for i in new_info['ingredients'])
        if has_common_ingredient:
            # Must be one generic and one brand
            if (ex_info['type'] == 'generic' and new_info['type'] == 'brand') or \
               (ex_info['type'] == 'brand' and new_info['type'] == 'generic'):
                return {
                    'med1': ex,
                    'type1': ex_info['type'],
                    'med2': new_med,
                    'type2': new_info['type'],
                }
    return None

def test_examples():
    # 1. Aspirin (generic) + Ecosprin (brand) -> Show warning
    w1 = check_duplicate_warning(['Aspirin'], 'Ecosprin')
    assert w1 is not None, "Aspirin + Ecosprin should show warning"
    assert w1['type1'] == 'generic' and w1['type2'] == 'brand'
    print("Test 1 Passed: Aspirin + Ecosprin ->", w1)

    # 2. Ecosprin (brand) + Aspirin (generic) -> Show warning
    w2 = check_duplicate_warning(['Ecosprin'], 'Aspirin')
    assert w2 is not None, "Ecosprin + Aspirin should show warning"
    assert w2['type1'] == 'brand' and w2['type2'] == 'generic'
    print("Test 2 Passed: Ecosprin + Aspirin ->", w2)

    # 3. Metformin (generic) + Glycomet (brand) -> Show warning
    w3 = check_duplicate_warning(['Metformin'], 'Glycomet')
    assert w3 is not None, "Metformin + Glycomet should show warning"
    assert w3['type1'] == 'generic' and w3['type2'] == 'brand'
    print("Test 3 Passed: Metformin + Glycomet ->", w3)

    # 4. Glycomet (brand) + Metformin (generic) -> Show warning
    w4 = check_duplicate_warning(['Glycomet'], 'Metformin')
    assert w4 is not None, "Glycomet + Metformin should show warning"
    assert w4['type1'] == 'brand' and w4['type2'] == 'generic'
    print("Test 4 Passed: Glycomet + Metformin ->", w4)

    # 5. Dolo 650 (brand) + Crocin (brand) -> Do not show this warning
    w5 = check_duplicate_warning(['Dolo 650'], 'Crocin')
    assert w5 is None, "Dolo 650 + Crocin should NOT show warning"
    print("Test 5 Passed: Dolo 650 + Crocin -> None (No warning)")

    # 6. Generic + Generic (Paracetamol + Acetaminophen) -> Do not show this warning
    w6 = check_duplicate_warning(['Paracetamol'], 'Acetaminophen')
    assert w6 is None, "Paracetamol + Acetaminophen should NOT show warning"
    print("Test 6 Passed: Paracetamol + Acetaminophen -> None (No warning)")

    # 7. Unrelated drugs (Aspirin + Metformin) -> Do not show warning
    w7 = check_duplicate_warning(['Aspirin'], 'Metformin')
    assert w7 is None, "Aspirin + Metformin should NOT show warning"
    print("Test 7 Passed: Aspirin + Metformin -> None (No warning)")

if __name__ == '__main__':
    test_examples()
