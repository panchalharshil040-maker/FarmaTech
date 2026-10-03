/** Data types for PharmaTech / MediGuard clinical decision support system. */

export type ViewMode = 'doctor' | 'patient'
export type Language = 'en' | 'hi' | 'gu'
export type RiskLevel = 'no_risk' | 'low' | 'moderate' | 'high'
export type FindingSeverity = 'major' | 'moderate' | 'minor' | 'duplicate' | 'food' | 'contraindication'
export type AgeGroup = 'adult' | 'elderly' | 'pediatric'

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
  type: 'interaction' | 'duplicate_ingredient' | 'class_duplicate' | 'food_interaction' | 'contraindication' | 'food_warning'
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
  food?: string
  effect?: string
}

export interface PatientProfile {
  ageGroup: AgeGroup
  isPregnant: boolean
  hasRenalImpairment: boolean
  hasLiverDisease: boolean
  hasCardiacHistory: boolean
  allergies: string[]
}

export interface FoodWarning {
  id: string
  medicine: string
  food: string
  warning: string
  effect: string
  source: Record<string, string>
  verified_status: string
}

export interface CheckResponse {
  resolved: ResolvedMedicine[]
  unresolved: string[]
  findings: Finding[]
  food_warnings: FoodWarning[]
  risk_score: number
  risk_level: RiskLevel
  disclaimer: string
  patient_warnings?: string[]
  advisories_source?: 'unverified-local-advisory'
  found?: boolean
}

export interface SimulateResponse {
  before_score: number
  after_score: number
  delta: number
  before_level?: RiskLevel
  before_findings: Finding[]
  after_findings?: Finding[]
  new_findings: Finding[]
  resolved_findings?: Finding[]
  remaining_findings?: Finding[]
  current_medicines?: string[]
  proposed_medicines?: string[]
  risk_level: RiskLevel
  unresolved: string[]
  disclaimer: string
  found?: boolean
  food_warnings?: FoodWarning[]
}

export interface QRTokenResponse {
  token: string
}

/* ─────────────────────────────────────────────────────────────────────────
   Patient record — the ACTIVE clinical context used by every section.
   `profile` is the exact PatientProfile payload sent to the deterministic
   backend engine. Identity fields are record metadata captured at load time;
   they are never sent to the engine and never affect any medical result.
   ───────────────────────────────────────────────────────────────────────── */

export type RecordSource = 'qr' | 'manual' | 'demo'

export interface PatientRecord {
  /** How the record entered the app — displayed so the source is never implied. */
  source: RecordSource
  name: string
  patientId: string
  /** Age as recorded on the source document. Display only. */
  age: string
  /** Medicine names exactly as recorded. This list is what the engine receives. */
  medicines: string[]
  profile: PatientProfile
  /** Extra context carried by an imported QR payload, if present. */
  notes?: string
}

/** Response of GET /api/qr/{token} — a validated record plus its verified report. */
export interface QrRecordResponse {
  medicines: string[]
  allergies: string[]
  /** Identity carried by the token. Empty for tokens minted before identity
   *  was encoded into the payload. */
  name: string
  patientId: string
  age: string
  /** Clinical context carried by the token (allergies duplicated top-level). */
  profile: PatientProfile
  resolved: ResolvedMedicine[]
  unresolved: string[]
  findings: Finding[]
  food_warnings: FoodWarning[]
  risk_score: number
  risk_level: RiskLevel
  disclaimer: string
  found?: boolean
}

/* ─────────────────────────────────────────────────────────────────────────
   Medication optimization — temporary proposed regimen + backend comparison.
   Every clinical value below comes from the backend deterministic engine.
   ───────────────────────────────────────────────────────────────────────── */

export type ChangeKind = 'add' | 'remove' | 'replace'

export interface RegimenChange {
  kind: ChangeKind
  from?: string
  to?: string
}

export interface RegimenComparison {
  /** Proposed regimen that was analysed. */
  proposed: string[]
  /** Backend report for the current (unchanged) regimen. */
  current: CheckResponse
  /** Backend report for the proposed regimen — never null: an empty proposed
   *  regimen is analysed by the backend and returns no findings. */
  proposedReport: CheckResponse | null
  currentScore: number
  proposedScore: number | null
  currentLevel: RiskLevel
  proposedLevel: RiskLevel | null
  delta: number | null
  /** Backend-computed finding buckets for this exact pair of regimens. */
  resolved: Finding[]
  remaining: Finding[]
  introduced: Finding[]
  /** Raw /api/simulate response — the single source of every value above. */
  simulate: SimulateResponse | null
}
