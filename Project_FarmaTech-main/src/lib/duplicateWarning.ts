import medsData from '../../Backend/Data/medicines.json'

export interface MedicineClassification {
  type: 'brand' | 'generic'
  ingredients: string[]
  record: any
}

export interface DuplicateWarningMatch {
  med1: string
  type1: 'brand' | 'generic'
  med2: string
  type2: 'brand' | 'generic'
}

/**
 * Classifies a medicine name as either 'brand' or 'generic'
 * using the verified medicines database.
 */
export function classifyMedicine(name: string): MedicineClassification | null {
  const norm = name.toLowerCase().trim()
  if (!norm) return null

  // 1. Exact match across all medicines
  for (const med of medsData as any[]) {
    const activeIngs: string[] = (med.activeIngredientIds || [med.id]).map((i: string) => i.toLowerCase().trim())
    const medId = (med.id || '').toLowerCase().trim()
    const gen = (med.genericName || '').toLowerCase().trim()
    const indGen = (med.indianGenericName || '').toLowerCase().trim()
    const indBrands: string[] = (med.indianBrandNames || []).map((b: string) => b.toLowerCase().trim())
    const brands: string[] = (med.brandNames || []).map((b: string) => b.toLowerCase().trim())

    // 1. Brand match
    if (indBrands.includes(norm)) {
      return { type: 'brand', ingredients: activeIngs, record: med }
    }
    for (const b of brands) {
      if (norm === b && norm !== medId && norm !== gen && norm !== indGen && !activeIngs.includes(norm)) {
        return { type: 'brand', ingredients: activeIngs, record: med }
      }
    }

    // 2. Generic match
    const generics = [medId, gen, indGen, ...activeIngs]
    if (generics.includes(norm) || generics.some((g) => g && norm === g.split(' ')[0])) {
      return { type: 'generic', ingredients: activeIngs, record: med }
    }
  }

  // 2. Strip strength / dosage (e.g. 'Aspirin 75mg' -> 'Aspirin', 'Glycomet 500' -> 'Glycomet')
  const normStripped = norm.replace(/\s*\b\d+(\.\d+)?\s*(mg|mcg|g|ml)?\b/gi, '').trim()
  if (normStripped && normStripped !== norm) {
    for (const med of medsData as any[]) {
      const activeIngs: string[] = (med.activeIngredientIds || [med.id]).map((i: string) => i.toLowerCase().trim())
      const medId = (med.id || '').toLowerCase().trim()
      const gen = (med.genericName || '').toLowerCase().trim()
      const indGen = (med.indianGenericName || '').toLowerCase().trim()
      const indBrands: string[] = (med.indianBrandNames || []).map((b: string) => b.toLowerCase().trim())
      const brands: string[] = (med.brandNames || []).map((b: string) => b.toLowerCase().trim())

      if (indBrands.includes(normStripped)) {
        return { type: 'brand', ingredients: activeIngs, record: med }
      }
      for (const b of brands) {
        if (normStripped === b && normStripped !== medId && normStripped !== gen && normStripped !== indGen && !activeIngs.includes(normStripped)) {
          return { type: 'brand', ingredients: activeIngs, record: med }
        }
      }

      const generics = [medId, gen, indGen, ...activeIngs]
      if (generics.includes(normStripped) || generics.some((g) => g && normStripped === g.split(' ')[0])) {
        return { type: 'generic', ingredients: activeIngs, record: med }
      }
    }
  }

  return null
}

/**
 * Checks if adding `newMed` alongside `existingMeds` produces a generic-brand or brand-generic
 * duplicate active ingredient warning.
 *
 * Requirements:
 * - Brand + Generic or Generic + Brand match sharing an active ingredient -> return match
 * - Brand + Brand or Generic + Generic -> return null (no warning)
 * - Different ingredients -> return null
 */
export function checkDuplicateWarning(
  existingMeds: string[],
  newMed: string,
): DuplicateWarningMatch | null {
  const newInfo = classifyMedicine(newMed)
  if (!newInfo) return null

  for (const ex of existingMeds) {
    const exInfo = classifyMedicine(ex)
    if (!exInfo) continue

    const hasCommonIngredient = exInfo.ingredients.some((i) => newInfo.ingredients.includes(i))
    if (hasCommonIngredient) {
      if (
        (exInfo.type === 'generic' && newInfo.type === 'brand') ||
        (exInfo.type === 'brand' && newInfo.type === 'generic')
      ) {
        return {
          med1: ex,
          type1: exInfo.type,
          med2: newMed,
          type2: newInfo.type,
        }
      }
    }
  }

  return null
}
