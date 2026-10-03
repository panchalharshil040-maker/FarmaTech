import { useCallback, useMemo, useState } from 'react'
import { checkMedicines, explainFindings } from './api'
import type { ExplainResponse } from './api'
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
 * MediGuard shell.
 *
 * The deterministic backend stays the single source of medical truth. This layer
 * owns UI state only: role, language, the ACTIVE patient record and the backend
 * responses produced for that record. No finding, severity or risk value is ever
 * produced here.
 */
export default function App() {
  const [view, setView] = useState<ViewMode>('doctor')
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
      // A validated QR payload already carries a backend-verified report: show it
      // instead of making the doctor re-run the same analysis.
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

  const unloadPatient = useCallback(() => {
    clearResults()
    setRecord(null)
    setLoadedNotice('')
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
      // Groq is asked to explain verified findings only — never to produce them.
      await requestExplanation(data.findings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis check failed')
    } finally {
      setLoading(false)
    }
  }, [activeRecord, language, requestExplanation, view])

  const switchRole = useCallback(
    (next: ViewMode) => {
      setView(next)
    },
    [],
  )

  return (
    <>
      <Header view={view} setView={switchRole} language={language} setLanguage={setLanguage} />

      <main className="page">
        <div className="container">
          <div style={{ marginBottom: 22 }}>
            <span className="eyebrow">{view === 'doctor' ? 'Doctor Dashboard' : 'Patient Dashboard'}</span>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-strong)',
                letterSpacing: '-0.02em',
                marginTop: 2,
              }}
            >
              {view === 'doctor'
                ? 'Clinical Medication Safety Review'
                : 'My Medication Safety Information'}
            </h2>
            <p className="small muted" style={{ marginTop: 4, maxWidth: 760, lineHeight: 1.55 }}>
              {view === 'doctor'
                ? 'Enter a patient record, run the Safety Check, then use the What-if Simulator to compare proposed changes. The deterministic engine produces every finding.'
                : 'View your medications, allergies and the verified safety information for your record.'}
            </p>
          </div>

          {view === 'doctor' ? (
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