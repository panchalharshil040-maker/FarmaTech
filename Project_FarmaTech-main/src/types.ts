/** Data types for FarmaTech / MediGuard clinical decision support system. */

export type ViewMode = 'doctor' | 'patient'
export type Language = 'en' | 'hi' | 'gu'
export type RiskLevel = 'low' | 'moderate' | 'high'
export type FindingSeverity = 'major' | 'moderate' | 'minor' | 'duplicate' | 'food' | 'contraindication'

export interface DrugSearchResult {
  name: string
  ingredients: string[]
  category?: string
}

export interface ResolvedMedicine {
  input: string
  ingredients: string[]
}

export interface Finding {
  id?: string
  type: 'interaction' | 'duplicate_ingredient' | 'class_duplicate' | 'food_interaction' | 'contraindication'
  severity: FindingSeverity
  drugs: string[]
  medicines?: string[]
  mechanism: string
  watch: string
  explanation: string
  recommendation?: string
  condition?: string
  source?: Record<string, string>
  verified_status?: string
}

export interface PatientProfile {
  ageGroup: 'adult' | 'elderly' | 'pediatric'
  isPregnant: boolean
  hasRenalImpairment: boolean
  hasLiverDisease: boolean
  hasCardiacHistory: boolean
  allergies: string[]
}

export interface CheckResponse {
  resolved: ResolvedMedicine[]
  unresolved: string[]
  findings: Finding[]
  risk_score: number
  risk_level: RiskLevel
  disclaimer: string
  food_warnings?: string[]
  patient_warnings?: string[]
  advisories_source?: 'unverified-local-advisory'
  found?: boolean
}

export interface SimulateResponse {
  before_score: number
  after_score: number
  delta: number
  new_findings: Finding[]
  risk_level: RiskLevel
  unresolved: string[]
  disclaimer: string
}

export interface QRTokenResponse {
  token: string
}
