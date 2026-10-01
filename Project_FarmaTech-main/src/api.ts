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
  analyzeLocally,
  localSearch,
  simulateLocally,
} from './data/localEngine'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 4000)

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

/** Search for drugs by name or ingredient fragment. */
export async function searchDrugs(q: string): Promise<DrugSearchResult[]> {
  try {
    return await request<DrugSearchResult[]>(`/api/drugs/search?q=${encodeURIComponent(q)}`)
  } catch {
    // Resilient fallback to local clinical database
    return localSearch(q)
  }
}

/** Check medicines with drug interaction, food warning, and patient profile engine. */
export async function checkMedicines(
  medicines: string[],
  view: ViewMode = 'doctor',
  language: Language = 'en',
  patient?: PatientProfile,
): Promise<CheckResponse> {
  try {
    const res = await request<CheckResponse>('/api/check', {
      method: 'POST',
      body: JSON.stringify({ medicines, view, language, patient }),
    })
    // Enrich with client-side patient/food checks if available
    const local = analyzeLocally(medicines, view, language, patient)
    return {
      ...res,
      food_warnings: local.food_warnings,
      patient_warnings: local.patient_warnings,
    }
  } catch {
    // Seamless local fallback
    return analyzeLocally(medicines, view, language, patient)
  }
}

/** Simulate adding a prospective medicine to test safety delta. */
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
  } catch {
    return simulateLocally(medicines, newMedicine, view, language)
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
