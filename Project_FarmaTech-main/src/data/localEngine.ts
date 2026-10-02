import type { DrugSearchResult, PatientProfile } from '../types'

export const LOCAL_BRANDS: Record<string, string[]> = {
  'dolo 650': ['paracetamol'],
  'dolo': ['paracetamol'],
  'crocin': ['paracetamol'],
  'calpol': ['paracetamol'],
  'combiflam': ['ibuprofen', 'paracetamol'],
  'brufen': ['ibuprofen'],
  'voveran': ['diclofenac'],
  'zerodol': ['aceclofenac'],
  'ecosprin': ['aspirin'],
  'clopitab': ['clopidogrel'],
  'glycomet': ['metformin'],
  'pan 40': ['pantoprazole'],
  'pan': ['pantoprazole'],
  'aten': ['atenolol'],
  'amlong': ['amlodipine'],
  'telma': ['telmisartan'],
  'storvas': ['atorvastatin'],
  'lipitor': ['atorvastatin'],
  'ciplox': ['ciprofloxacin'],
  'azithral': ['azithromycin'],
  'warfarin': ['warfarin'],
  'ginkgo': ['ginkgo'],
  'ashwagandha': ['ashwagandha'],
}

export const LOCAL_CLASSES: Record<string, string> = {
  ibuprofen: 'NSAID',
  diclofenac: 'NSAID',
  aceclofenac: 'NSAID',
  atorvastatin: 'Statin',
}

/**
 * General lifestyle text (diet, timing). Informational only.
 * NOT a medical finding source and NOT derived from the verified JSON databases.
 */
export const LOCAL_FOOD_WARNINGS: Record<string, string> = {
  atorvastatin: 'Avoid Grapefruit juice (inhibits CYP3A4 metabolism, drastically increasing drug exposure).',
  lipitor: 'Avoid Grapefruit juice (inhibits CYP3A4 metabolism, drastically increasing drug exposure).',
  warfarin: 'Maintain steady intake of Vitamin K foods (spinach, kale, broccoli). Avoid alcohol & cranberries.',
  atenolol: 'Avoid high alcohol consumption (can cause severe orthostatic hypotension).',
  amlong: 'Avoid Grapefruit juice (can enhance blood pressure lowering effect excessively).',
  ciprofloxacin: 'Avoid taking with dairy products (milk, yogurt) or calcium-fortified juice (reduces absorption).',
}

export function localSearch(query: string): DrugSearchResult[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const results: DrugSearchResult[] = []
  for (const [name, ingredients] of Object.entries(LOCAL_BRANDS)) {
    if (name.includes(q) || ingredients.some((i) => i.includes(q))) {
      results.push({ name, ingredients })
    }
  }
  return results.slice(0, 10)
}

export function localResolve(name: string): string[] | null {
  const k = name.toLowerCase().trim()
  const cleaned = k.replace(/\s*\d+(\.\d+)?\s*(mg|mcg|g)?$/, '')
  if (LOCAL_BRANDS[k]) return LOCAL_BRANDS[k]
  if (LOCAL_BRANDS[cleaned]) return LOCAL_BRANDS[cleaned]
  const generics = Object.values(LOCAL_BRANDS).flat()
  if (generics.includes(k)) return [k]
  if (generics.includes(cleaned)) return [cleaned]
  return null
}

export interface LocalAdvisories {
  food_warnings: string[]
  patient_warnings: string[]
  advisories_source: 'unverified-local-advisory'
}

/**
 * Lifestyle/dietary text only.
 *
 * This function deliberately produces NO findings, NO severity and NO risk score.
 * Medical findings come exclusively from the FastAPI deterministic engine backed
 * by the verified JSON databases.
 */
export function localAdvisories(
  medicines: string[],
  patient?: PatientProfile,
): LocalAdvisories {
  const resolvedIngredients = new Set<string>()
  for (const m of medicines) {
    const ings = localResolve(m)
    if (ings) for (const i of ings) resolvedIngredients.add(i)
  }

  const foodWarnings: string[] = []
  const typedNames = medicines.map((m) => m.toLowerCase().trim())
  for (const [key, warning] of Object.entries(LOCAL_FOOD_WARNINGS)) {
    const mentioned =
      resolvedIngredients.has(key) || typedNames.some((n) => n.includes(key))
    if (mentioned && !foodWarnings.includes(warning)) {
      foodWarnings.push(warning)
    }
  }

  const patientWarnings: string[] = []
  if (patient?.isPregnant) {
    const flagged = [...resolvedIngredients].filter((i) =>
      ['warfarin', 'aspirin', 'telmisartan'].includes(i),
    )
    if (flagged.length > 0) {
      patientWarnings.push(
        `General pregnancy caution: ${flagged.join(', ')} — this is unverified advisory text, not a database finding. The verified engine reports any contraindication above.`,
      )
    }
  }
  if (patient?.hasRenalImpairment) {
    const flagged = [...resolvedIngredients].filter((i) =>
      ['ibuprofen', 'diclofenac', 'aceclofenac'].includes(i),
    )
    if (flagged.length > 0) {
      patientWarnings.push(
        `General renal caution: ${flagged.join(', ')} — this is unverified advisory text, not a database finding.`,
      )
    }
  }

  return {
    food_warnings: foodWarnings,
    patient_warnings: patientWarnings,
    advisories_source: 'unverified-local-advisory',
  }
}
