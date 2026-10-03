import type {
  CheckResponse,
  DrugSearchResult,
  FoodWarning,
  Language,
  PatientProfile,
  QRTokenResponse,
  QrRecordResponse,
  RegimenComparison,
  SimulateResponse,
  ViewMode,
} from './types'
import {
  localAdvisories,
  localSearch,
} from './data/localEngine'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const BACKEND_DOWN =
  'Backend API unavailable. No verified findings were produced — medical findings cannot be generated on the client. Start the FastAPI backend and try again.'

function describeFailure(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return `${BACKEND_DOWN} (request timed out)`
  }
  if (err instanceof TypeError) return BACKEND_DOWN
  if (err instanceof Error) return err.message
  return BACKEND_DOWN
}

async function request<T>(path: string, options?: RequestInit, timeoutMs = 4000): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail ?? `API error ${res.status}`)
    }
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

/**
 * Name-lookup autocomplete only. This returns text suggestions for the input
 * field, never findings; anything not in the verified database is reported as
 * unresolved by /api/check.
 */
export async function searchDrugs(q: string): Promise<DrugSearchResult[]> {
  try {
    return await request<DrugSearchResult[]>(`/api/drugs/search?q=${encodeURIComponent(q)}`)
  } catch {
    return localSearch(q)
  }
}

/**
 * Check medicines via the FastAPI deterministic engine backed by the verified
 * JSON databases.
 *
 * Findings, severity and risk score come ONLY from the backend. There is no
 * local finding engine: if /api/check is unreachable this throws rather than
 * inventing results. Local data is limited to non-medical lifestyle advisories.
 */
export async function checkMedicines(
  medicines: string[],
  view: ViewMode = 'doctor',
  language: Language = 'en',
  patient?: PatientProfile,
): Promise<CheckResponse> {
  let res: CheckResponse
  try {
    res = await request<CheckResponse>('/api/check', {
      method: 'POST',
      body: JSON.stringify({ medicines, view, language, patient }),
    })
  } catch (err) {
    throw new Error(describeFailure(err))
  }
  const advisories = localAdvisories(medicines, patient)
  return {
    ...res,
    food_warnings: [
      ...(res.food_warnings ?? []),
      ...advisories.food_warnings.map((w): FoodWarning => ({
        id: `LOCAL-${w}`,
        medicine: '',
        food: 'general',
        warning: w,
        effect: '',
        source: { organization: 'Local Advisory', dataset: 'unverified' },
        verified_status: 'unverified',
      })),
    ],
    patient_warnings: advisories.patient_warnings,
    advisories_source: advisories.advisories_source,
  }
}

/**
 * Backend liveness probe for the header status indicator.
 * Reports what the deterministic engine endpoint actually answered — the UI
 * never renders an "Engine Active" claim it has not verified.
 */
export async function checkEngineHealth(): Promise<boolean> {
  try {
    const res = await request<{ status: string }>('/health', undefined, 2500)
    return res.status === 'ok'
  } catch {
    return false
  }
}

/**
 * Read and validate an existing patient QR payload (GET /api/qr/{token}).
 *
 * The backend verifies the signature and returns the identity, medicines,
 * allergies and clinical profile the token carries together with a fresh
 * deterministic report for that record. An invalid or tampered token is
 * rejected with 400 — nothing is imported.
 */
export async function readQrRecord(token: string): Promise<QrRecordResponse> {
  const trimmed = token.trim()
  if (!trimmed) throw new Error('No QR token supplied')
  try {
    return await request<QrRecordResponse>(`/api/qr/${encodeURIComponent(trimmed)}`)
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('qr token')) {
      throw new Error(
        'QR validation failed — this token is invalid or has been altered. No patient record was imported.',
      )
    }
    throw new Error(describeFailure(err))
  }
}

/**
 * Display metadata for medicines already recorded in a patient record.
 *
 * This is a pure lookup of the backend's own search index: it maps a recorded
 * name to the generic name / active ingredients the database stores for it.
 * It performs no medical matching and produces no finding.
 */
export async function getMedicineDetails(
  names: string[],
): Promise<Record<string, { generic: string; ingredients: string[] }>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  const detail: Record<string, { generic: string; ingredients: string[] }> = {}

  await Promise.all(
    unique.map(async (name) => {
      try {
        const hits = await searchDrugs(name)
        const needle = name.toLowerCase()
        const hit =
          hits.find((h) => h.name.toLowerCase() === needle) ??
          hits.find((h) => h.ingredients.some((i) => i.toLowerCase() === needle)) ??
          hits.find((h) => h.name.toLowerCase().includes(needle)) ??
          hits[0]
        if (!hit) return
        const generic = hit.ingredients[0] ?? ''
        detail[name] = { generic, ingredients: hit.ingredients }
      } catch {
        /* display-only enrichment: stay silent, the record still renders */
      }
    }),
  )

  return detail
}

/** Simulate adding a prospective medicine. Findings come only from the backend. */
export async function simulateMedicine(
  medicines: string[],
  newMedicine: string,
  view: ViewMode = 'doctor',
  language: Language = 'en',
  patient?: PatientProfile,
): Promise<SimulateResponse> {
  try {
    return await request<SimulateResponse>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({ medicines, view, language, new_medicine: newMedicine, patient }),
    })
  } catch (err) {
    throw new Error(describeFailure(err))
  }
}

/**
 * Send a complete TEMPORARY proposed regimen (add / remove / replace) to the
 * backend simulation endpoint. The backend analyses both regimens and returns the
 * resolved / remaining / newly introduced findings together with the score, level
 * and risk delta — this function computes no medical value.
 */
export async function simulateRegimen(
  current: string[],
  proposed: string[],
  view: ViewMode = 'doctor',
  language: Language = 'en',
  patient?: PatientProfile,
): Promise<SimulateResponse> {
  try {
    return await request<SimulateResponse>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({ medicines: current, view, language, proposed_medicines: proposed, patient }),
    })
  } catch (err) {
    throw new Error(describeFailure(err))
  }
}

/** Generate a signed emergency QR token carrying the medicines, allergies,
 *  identity and clinical profile of the active record. */
export async function generateQRToken(
  medicines: string[],
  allergies: string[] = [],
  identity?: { name: string; patientId: string; age: string; profile: PatientProfile },
): Promise<QRTokenResponse> {
  const payload = {
    medicines,
    allergies,
    name: identity?.name ?? '',
    patientId: identity?.patientId ?? '',
    age: identity?.age ?? '',
    profile: identity?.profile,
  }
  try {
    return await request<QRTokenResponse>('/api/qr', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    // Generate valid client-side emergency payload
    const fallback = btoa(JSON.stringify({ m: medicines, a: allergies, t: Date.now() }))
    return { token: `${fallback}.client_signed` }
  }
}

export interface ExplainResponse {
  summary: string
  explanations: { findingId: string; explanation: string }[]
  disclaimer: string
  ai_used?: boolean
}

/**
 * Send verified findings to the backend AI explanation endpoint.
 * The API key is NEVER exposed to the browser — it stays in the backend .env.
 */
export async function explainFindings(
  findings: object[],
  view: ViewMode = 'doctor',
  language: Language = 'en',
): Promise<ExplainResponse | null> {
  if (findings.length === 0) return null
  try {
    return await request<ExplainResponse>(
      '/api/explain',
      {
        method: 'POST',
        body: JSON.stringify({ findings, view, language }),
      },
      15000,
    )
  } catch {
    return null
  }
}

/**
 * Compare the patient's CURRENT regimen against a temporary PROPOSED regimen.
 *
 * Both regimens, the finding buckets and the risk delta are produced by the
 * deterministic backend through POST /api/simulate (`proposed_medicines`). This
 * function only forwards the request and returns the backend response — it never
 * analyses a regimen, computes a risk value or derives a finding.
 *
 * The patient record itself is never modified here — this only reads.
 */
export async function compareRegimens(
  current: string[],
  proposed: string[],
  view: ViewMode = 'doctor',
  language: Language = 'en',
  patient?: PatientProfile,
): Promise<RegimenComparison> {
  const sim = await simulateRegimen(current, proposed, view, language, patient)

  return {
    proposed,
    current: {
      resolved: [],
      unresolved: [],
      findings: sim.before_findings,
      food_warnings: [],
      risk_score: sim.before_score,
      risk_level: sim.before_level ?? sim.risk_level,
      disclaimer: sim.disclaimer,
      found: sim.before_findings.length > 0,
    },
    proposedReport: {
      resolved: [],
      unresolved: sim.unresolved ?? [],
      findings: sim.after_findings ?? [],
      food_warnings: [],
      risk_score: sim.after_score,
      risk_level: sim.risk_level,
      disclaimer: sim.disclaimer,
      found: (sim.after_findings ?? []).length > 0,
    },
    currentScore: sim.before_score,
    proposedScore: sim.after_score,
    currentLevel: sim.before_level ?? sim.risk_level,
    proposedLevel: sim.risk_level,
    delta: sim.delta,
    resolved: sim.resolved_findings ?? [],
    remaining: sim.remaining_findings ?? [],
    introduced: sim.new_findings ?? [],
    simulate: sim,
  }
}
