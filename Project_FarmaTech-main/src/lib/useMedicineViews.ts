import { useEffect, useMemo, useState } from 'react'
import { getMedicineDetails } from '../api'
import type { CheckResponse } from '../types'

export interface MedicineView {
  recorded: string
  generic: string | null
  ingredients: string[]
  strength: string | null
  resolved: boolean
}

/**
 * Read the strength exactly as it appears in the recorded medicine name.
 * Nothing is inferred: a name without a strength returns null and the UI says
 * the database does not record it.
 */
export function recordedStrength(name: string): string | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g)\b/i)
  return m ? `${m[1]} ${m[2].toLowerCase()}` : null
}

/**
 * Resolve recorded medicine names against the verified database.
 *
 * Display-only helper: names already resolved by the latest /api/check
 * response reuse the backend's ingredients; the rest are looked up through
 * GET /api/medicine-details. No finding, severity or risk value is produced
 * here — the deterministic backend stays the source of medical truth.
 */
export function useMedicineViews(
  medicines: string[],
  result?: CheckResponse | null,
): MedicineView[] {
  const [details, setDetails] = useState<Record<string, { generic: string; ingredients: string[] }>>({})

  const key = useMemo(() => medicines.join('|'), [medicines])

  useEffect(() => {
    let cancelled = false
    const missing = medicines.filter(
      (m) => !details[m] && !result?.resolved?.some((r) => r.input.toLowerCase() === m.toLowerCase()),
    )
    if (missing.length === 0) return
    getMedicineDetails(missing).then((d) => {
      if (!cancelled) setDetails((prev) => ({ ...prev, ...d }))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, result])

  return medicines.map((recorded) => {
    const backendResolved = result?.resolved?.find((r) => r.input.toLowerCase() === recorded.toLowerCase())
    const lookup = details[recorded]
    return {
      recorded,
      // The lookup above is skipped for medicines the backend already
      // resolved, so fall back to the backend's own ingredient for the
      // generic name.
      generic: lookup?.generic || backendResolved?.ingredients[0] || null,
      ingredients: backendResolved?.ingredients ?? lookup?.ingredients ?? [],
      strength: recordedStrength(recorded),
      resolved: Boolean(backendResolved) || Boolean(lookup),
    }
  })
}
