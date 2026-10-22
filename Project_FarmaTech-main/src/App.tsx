import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HeartPulse } from 'lucide-react'
import {
  checkMedicines,
  deleteMyRecord,
  explainFindings,
  getMe,
  loadMyRecord,
  logoutUser,
  saveMyRecord,
} from './api'
import type { AuthUser, ExplainResponse } from './api'
import AuthScreen from './components/AuthScreen'
import DoctorDashboard from './components/DoctorDashboard'
import Footer from './components/Footer'
import Header from './components/Header'
import PatientDashboard from './components/PatientDashboard'
import type {
  CheckResponse,
  Language,
  PatientProfile,
  PatientRecord,
  ViewMode,
} from './types'

const EMPTY_PROFILE: PatientProfile = {
  ageGroup: 'adult',
  isPregnant: false,
  hasRenalImpairment: false,
  hasLiverDisease: false,
  hasCardiacHistory: false,
  allergies: [],
}

const EMPTY_RECORD: PatientRecord = {
  source: 'manual',
  name: '',
  patientId: '',
  age: '',
  medicines: [],
  profile: EMPTY_PROFILE,
}

/**
 * Single source of truth for which screen the app shows.
 *
 * - `checking`       → session cookie is being verified with the backend
 * - `unauthenticated`→ no valid session; the AuthScreen is the ONLY thing rendered
 * - `authenticated`  → a backend-verified account; exactly one dashboard renders,
 *                      chosen by the role the BACKEND returned (never by the
 *                      browser, a token claim, or a portal click)
 *
 * Exactly one of these states exists at a time, and exactly one top-level
 * branch renders for it. There is no second overlay, no entry screen that can
 * stack over a dashboard, and no path that shows two screens at once.
 */
type AuthState =
  | { status: 'checking' }
  | { status: 'unauthenticated' }
  | {
      status: 'authenticated'
      role: 'patient' | 'doctor'
      email: string
      fullName: string | null
    }

/** How long to wait after the last keystroke before persisting a record.
 *  PatientContextForm fires onChange on every character, so saving must be
 *  debounced to avoid one request per keystroke. */
const SAVE_DEBOUNCE_MS = 800

/**
 * MediGuard shell.
 *
 * The deterministic backend stays the single source of medical truth. This layer
 * owns UI state only: auth session, language, the ACTIVE patient record and the
 * backend responses produced for that record. No finding, severity or risk value
 * is ever produced here.
 */
export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' })
  const [language, setLanguage] = useState<Language>('en')

  /** The loaded patient record — it stays active across every section. */
  const [record, setRecord] = useState<PatientRecord | null>(null)
  const [loadedNotice, setLoadedNotice] = useState('')

  const [result, setResult] = useState<CheckResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiExplain, setAiExplain] = useState<ExplainResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  /** Latest record for flush-on-logout; mirrors `record` without re-rendering. */
  const recordRef = useRef<PatientRecord | null>(null)
  useEffect(() => {
    recordRef.current = record
  }, [record])

  /** Set right before a record is hydrated from the server so the save effect
   *  below does not immediately write back the data it just read. */
  const skipNextSaveRef = useRef(false)

  /**
   * The dashboard role is locked to the authenticated account. The header's
   * role toggle cannot move a patient into the doctor workspace or a doctor
   * into the patient workspace — only a different login can change role.
   */
  const view: ViewMode = auth.status === 'authenticated' ? auth.role : 'doctor'

  const activeRecord: PatientRecord = useMemo(
    () => record ?? EMPTY_RECORD,
    [record],
  )

  const clearResults = useCallback(() => {
    setResult(null)
    setError('')
    setAiExplain(null)
    setAiUnavailable(false)
  }, [])

  /**
   * Ask the backend AI layer to explain verified findings.
   * Falls back to a clear "unavailable" state — it never invents findings.
   */
  const requestExplanation = useCallback(
    async (findings: CheckResponse['findings']) => {
      setAiExplain(null)
      setAiUnavailable(false)
      if (findings.length === 0) return
      setAiLoading(true)
      try {
        const exp = await explainFindings(findings, view, language)
        if (exp) setAiExplain(exp)
        else setAiUnavailable(true)
      } catch {
        setAiUnavailable(true)
      } finally {
        setAiLoading(false)
      }
    },
    [language, view],
  )

  /** Load a patient record from a validated QR payload or manual entry. */
  const loadRecord = useCallback(
    (
      patch: Partial<PatientRecord>,
      notice?: string,
      loadedReport?: CheckResponse,
    ) => {
      clearResults()
      setRecord({
        ...EMPTY_RECORD,
        ...patch,
        profile: { ...EMPTY_PROFILE, ...(patch.profile ?? {}) },
        medicines: patch.medicines ?? [],
      })
      setLoadedNotice(notice ?? 'Patient Record Loaded')
      if (loadedReport) {
        setResult(loadedReport)
        void requestExplanation(loadedReport.findings)
      }
    },
    [clearResults, requestExplanation],
  )

  /** Edit the active record in place. */
  const editRecord = useCallback(
    (patch: Partial<PatientRecord>) => {
      clearResults()
      setLoadedNotice('')
      setRecord((prev) => (prev ? { ...prev, ...patch } : prev))
    },
    [clearResults],
  )

  /** Clear the active record locally AND remove the saved copy server-side. */
  const unloadPatient = useCallback(() => {
    clearResults()
    setRecord(null)
    setLoadedNotice('')
    skipNextSaveRef.current = false
    void deleteMyRecord()
  }, [clearResults])

  const runCheck = useCallback(async () => {
    if (activeRecord.medicines.length === 0) return
    setLoading(true)
    setError('')
    setResult(null)
    setAiExplain(null)
    setAiUnavailable(false)
    try {
      const data = await checkMedicines(activeRecord.medicines, view, language, activeRecord.profile)
      setResult(data)
      await requestExplanation(data.findings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis check failed')
    } finally {
      setLoading(false)
    }
  }, [activeRecord, language, requestExplanation, view])

  const switchRole = useCallback((_next: ViewMode) => {
    /* Intentionally locked. See AuthState: role comes from the backend. */
  }, [])

  /**
   * Session restore on startup. The HttpOnly cookie is verified by the
   * backend; the returned account (not the URL, not localStorage) decides
   * which dashboard opens.
   */
  useEffect(() => {
    let cancelled = false
    void getMe().then((user) => {
      if (cancelled) return
      if (user) {
        setAuth({
          status: 'authenticated',
          role: user.role,
          email: user.email,
          fullName: user.full_name,
        })
      } else {
        setAuth({ status: 'unauthenticated' })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * When a patient session becomes active, restore their saved record from
   * the server. Doctors do not get a persisted record — their loaded record
   * lives for the session only.
   */
  useEffect(() => {
    if (auth.status !== 'authenticated' || auth.role !== 'patient') return
    let cancelled = false
    void loadMyRecord().then((saved) => {
      if (cancelled || !saved) return
      skipNextSaveRef.current = true
      setRecord(saved)
      setLoadedNotice('Patient record restored')
    })
    return () => {
      cancelled = true
    }
  }, [auth])

  /**
   * Debounced persistence for the patient's record. Fires after typing
   * pauses (PatientContextForm emits onChange per keystroke), after a QR or
   * manual load, and after profile edits. Never fires for doctors and never
   * fires for a record that was just hydrated from the server.
   */
  useEffect(() => {
    if (auth.status !== 'authenticated' || auth.role !== 'patient') return
    if (!record) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    const timer = window.setTimeout(() => {
      void saveMyRecord(record)
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [record, auth])

  /** Succeeding login/register: adopt the backend's account and reset session state. */
  const handleAuthenticated = useCallback(
    (user: AuthUser) => {
      setAuth({
        status: 'authenticated',
        role: user.role,
        email: user.email,
        fullName: user.full_name,
      })
      setRecord(null)
      setLoadedNotice('')
      clearResults()
    },
    [clearResults],
  )

  /** Sign out: flush any pending patient edits, kill the cookie, reset state. */
  const handleLogout = useCallback(async () => {
    if (recordRef.current && auth.status === 'authenticated' && auth.role === 'patient') {
      void saveMyRecord(recordRef.current)
    }
    try {
      await logoutUser()
    } catch {
      /* cookie may already be gone — local reset proceeds regardless */
    }
    skipNextSaveRef.current = false
    setAuth({ status: 'unauthenticated' })
    setRecord(null)
    setLoadedNotice('')
    clearResults()
  }, [auth, clearResults])

  /* ── Render: exactly one branch per auth state ──────────────────────── */

  if (auth.status === 'checking') {
    return (
      <div className="auth-loading">
        <div className="auth-loading-inner">
          <div className="auth-loading-mark">
            <HeartPulse size={26} aria-hidden />
          </div>
          <span className="auth-loading-text">Restoring your session…</span>
        </div>
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return <AuthScreen onAuthenticated={handleAuthenticated} />
  }

  /* Authenticated: role is the backend-verified account role; nothing here
     can change it. */
  const role = auth.role
  const fullName = (auth.fullName ?? '').trim()

  return (
    <>
      <Header
        view={role}
        setView={switchRole}
        language={language}
        setLanguage={setLanguage}
        onLogout={handleLogout}
      />
      <main className="page">
        <div className="container">
          {/* Doctor intro stays here; the patient welcome lives inside
              PatientDashboard so the patient layout owns its full structure. */}
          {role === 'doctor' && (
            <div className="dash-intro">
              <span className="eyebrow dash-intro-eyebrow">Doctor Dashboard</span>
              <h2 className="dash-intro-title">Clinical Medication Safety Review</h2>
              {fullName && (
                <p className="dash-intro-sub" style={{ marginTop: 2 }}>
                  Signed in as <b>{fullName}</b>
                </p>
              )}
              <p className="dash-intro-sub">
                Enter a patient record, run the Safety Check, then use the What-if Simulator to compare
                proposed changes. The deterministic engine produces every finding.
              </p>
            </div>
          )}

          {role === 'doctor' ? (
            <DoctorDashboard
              record={record}
              activeRecord={activeRecord}
              loadedNotice={loadedNotice}
              language={language}
              onLoadRecord={loadRecord}
              result={result}
              loading={loading}
              error={error}
              onRunCheck={runCheck}
              aiExplain={aiExplain}
              aiLoading={aiLoading}
              aiUnavailable={aiUnavailable}
            />
          ) : (
            <PatientDashboard
              record={record}
              patientName={fullName}
              loadedNotice={loadedNotice}
              onLoadRecord={loadRecord}
              onEditRecord={editRecord}
              onClearRecord={unloadPatient}
              result={result}
              loading={loading}
              error={error}
              onRunCheck={runCheck}
              aiExplain={aiExplain}
              aiLoading={aiLoading}
              aiUnavailable={aiUnavailable}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
