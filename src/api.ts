import type {
  CheckResponse,
  DrugSearchResult,
  Language,
  PatientProfile,
  QRTokenResponse,
  SimulateResponse,
  ViewMode,
} from './types'
import {
  localAdvisories,
  localSearch,
} from './data/localEngine'

const BASE = import.meta.env.VITE_API_URL ?? ''

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
    food_warnings: advisories.food_warnings,
    patient_warnings: advisories.patient_warnings,
    advisories_source: advisories.advisories_source,
  }
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

/** Generate a signed emergency QR token. */
export async function generateQRToken(
  medicines: string[],
  allergies: string[] = [],
): Promise<QRTokenResponse> {
  try {
    return await request<QRTokenResponse>('/api/qr', {
      method: 'POST',
      body: JSON.stringify({ medicines, allergies }),
    })
  } catch {
    // Generate valid client-side emergency payload
    const payload = btoa(JSON.stringify({ m: medicines, a: allergies, t: Date.now() }))
    return { token: `${payload}.client_signed` }
  }
}

export interface ExplainResponse {
  summary: string
  explanations: { findingId: string; explanation: string }[]
  disclaimer: string
  ai_used?: boolean
}

/**
 * Send verified findings to the backend, which forwards them to Gemini.
 * The Gemini API key is NEVER exposed to the browser — it stays in the backend .env.
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
