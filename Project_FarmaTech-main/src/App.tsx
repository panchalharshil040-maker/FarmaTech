import { useState, useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import Header from './components/Header'
import PatientForm from './components/PatientForm'
import DrugInput from './components/DrugInput'
import ResultsPanel from './components/ResultsPanel'
import SimulatePanel from './components/SimulatePanel'
import QRPanel from './components/QRPanel'
import { checkMedicines, explainFindings } from './api'
import type { CheckResponse, Language, PatientProfile, ViewMode } from './types'
import type { ExplainResponse } from './api'

// ---------------------------------------------------------------------------
// Demo cases — populated via the real /api/check endpoint, never faked
// ---------------------------------------------------------------------------
interface DemoCase {
  label: string
  description: string
  medicines: string[]
  patient: PatientProfile
}

const DEFAULT_PATIENT: PatientProfile = {
  ageGroup: 'adult',
  isPregnant: false,
  hasRenalImpairment: false,
  hasLiverDisease: false,
  hasCardiacHistory: false,
  allergies: [],
}

const DEMO_CASES: DemoCase[] = [
  {
    label: 'Drug-Drug Interaction',
    description: 'Clopidogrel + Warfarin sodium → increased bleeding risk (FDA verified)',
    medicines: ['clopidogrel', 'warfarin sodium'],
    patient: DEFAULT_PATIENT,
  },
  {
    label: 'Contraindication',
    description: 'Warfarin sodium + Pregnancy → contraindicated (FDA label rule)',
    medicines: ['warfarin sodium'],
    patient: { ...DEFAULT_PATIENT, isPregnant: true },
  },
  {
    label: 'Duplicate Therapy',
    description: 'Acetaminophen + Acetaminophen-codeine → active-ingredient overlap',
    medicines: ['acetaminophen', 'acetaminophen and codeine phosphate'],
    patient: DEFAULT_PATIENT,
  },
  {
    label: 'No Verified Match',
    description: 'Metformin + Montelukast → no verified finding in current database',
    medicines: ['metformin', 'montelukast'],
    patient: DEFAULT_PATIENT,
  },
]

export default function App() {
  const [medicines, setMedicines] = useState<string[]>([])
  const [view, setView] = useState<ViewMode>('doctor')
  const [language, setLanguage] = useState<Language>('en')
  const [patient, setPatient] = useState<PatientProfile>(DEFAULT_PATIENT)
  const [result, setResult] = useState<CheckResponse | null>(null)
  const [aiExplain, setAiExplain] = useState<ExplainResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'check' | 'simulate' | 'qr'>('check')

  const addMedicine = useCallback((name: string) => {
    setMedicines((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setResult(null)
    setAiExplain(null)
  }, [])

  const removeMedicine = useCallback((name: string) => {
    setMedicines((prev) => prev.filter((m) => m !== name))
    setResult(null)
    setAiExplain(null)
  }, [])

  const clearAllMedicines = useCallback(() => {
    setMedicines([])
    setResult(null)
    setAiExplain(null)
  }, [])

  const handleCheck = async () => {
    if (medicines.length === 0) return
    setLoading(true)
    setError('')
    setResult(null)
    setAiExplain(null)
    try {
      const data = await checkMedicines(medicines, view, language, patient)
      setResult(data)
      // Only call /api/explain when there are verified findings — never for empty results
      if (data.findings.length > 0) {
        setAiLoading(true)
        explainFindings(data.findings, view, language)
          .then((exp) => setAiExplain(exp))
          .finally(() => setAiLoading(false))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis check failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadDemo = (demo: DemoCase) => {
    setMedicines(demo.medicines)
    setPatient(demo.patient)
    setResult(null)
    setAiExplain(null)
    setError('')
    // Switch to check tab so user can hit the Analyze button
    setActiveTab('check')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Header
        view={view}
        setView={setView}
        language={language}
        setLanguage={setLanguage}
      />

      <main className="container" style={{ padding: '36px 24px 72px', flex: 1 }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '999px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <Sparkles size={14} /> Next-Gen Clinical Decision Support
          </div>

          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '14px',
              letterSpacing: '-0.03em',
            }}
          >
            Intelligent Prescription Safety &{' '}
            <span
              style={{
                background: 'var(--gradient-main)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Drug Interaction Analysis
            </span>
          </h2>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 20px',
              lineHeight: 1.5,
            }}
          >
            Instantly cross-check multi-drug regimens for dangerous pharmacological interactions, duplicate active ingredients, and patient physiological contraindications.
          </p>

          {/* Quick Metrics Badges */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
              <strong>100% Deterministic Engine</strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} />
              <strong>3-Tier Severity Scoring</strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <QrCode size={14} style={{ color: 'var(--accent-violet)' }} />
              <strong>Emergency QR Pass</strong>
            </div>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              padding: '4px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              gap: '4px',
              maxWidth: '600px',
              width: '100%',
            }}
          >
            <button
              onClick={() => setActiveTab('check')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderRadius: 'calc(var(--radius-lg) - 4px)',
                background: activeTab === 'check' ? 'var(--gradient-main)' : 'transparent',
                color: activeTab === 'check' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'check' ? '0 4px 14px rgba(6, 182, 212, 0.3)' : 'none',
              }}
            >
              <ShieldCheck size={16} />
              Safety Check
            </button>

            <button
              onClick={() => setActiveTab('simulate')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderRadius: 'calc(var(--radius-lg) - 4px)',
                background: activeTab === 'simulate' ? 'var(--gradient-main)' : 'transparent',
                color: activeTab === 'simulate' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'simulate' ? '0 4px 14px rgba(139, 92, 246, 0.3)' : 'none',
              }}
            >
              <FlaskConical size={16} />
              What-If Simulator
            </button>

            <button
              onClick={() => setActiveTab('qr')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderRadius: 'calc(var(--radius-lg) - 4px)',
                background: activeTab === 'qr' ? 'var(--gradient-main)' : 'transparent',
                color: activeTab === 'qr' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'qr' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              <QrCode size={16} />
              Emergency QR
            </button>
          </div>
        </div>

        {/* Tab 1: Safety Check */}
        {activeTab === 'check' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Patient Physiological Profile */}
            <PatientForm patient={patient} onChange={setPatient} />

            {/* Drug Input & Preset Pills */}
            <DrugInput
              medicines={medicines}
              onAdd={addMedicine}
              onRemove={removeMedicine}
              onClear={clearAllMedicines}
            />

            {/* Analysis Action Button */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <button
                className="btn-primary"
                onClick={handleCheck}
                disabled={loading || medicines.length === 0}
                style={{
                  padding: '14px 36px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  boxShadow: 'var(--shadow-glow-cyan)',
                  minWidth: '240px',
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} className="animate-spin" /> Analyzing Safety Data...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} /> Analyze Prescription Safety
                  </span>
                )}
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.9rem',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {/* Results Panel */}
            {result && (
              <ResultsPanel
                data={result}
                view={view}
                aiExplain={aiExplain}
                aiLoading={aiLoading}
              />
            )}

            {/* Demo Cases */}
            <div
              style={{
                marginTop: result ? '48px' : '0',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Zap size={18} style={{ color: 'var(--accent-amber)' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Try Verified Demo Cases
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Each demo calls the real /api/check endpoint — no results are faked
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {DEMO_CASES.map((demo) => (
                  <button
                    key={demo.label}
                    onClick={() => handleLoadDemo(demo)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(6, 182, 212, 0.05)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'
                      e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)'
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                      {demo.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {demo.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: What-If Simulator */}
        {activeTab === 'simulate' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <PatientForm patient={patient} onChange={setPatient} />
            <DrugInput
              medicines={medicines}
              onAdd={addMedicine}
              onRemove={removeMedicine}
              onClear={clearAllMedicines}
            />
            <SimulatePanel
              medicines={medicines}
              view={view}
              language={language}
              patient={patient}
            />
          </div>
        )}

        {/* Tab 3: Emergency QR */}
        {activeTab === 'qr' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <DrugInput
              medicines={medicines}
              onAdd={addMedicine}
              onRemove={removeMedicine}
              onClear={clearAllMedicines}
            />
            <QRPanel medicines={medicines} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px 0',
          background: 'var(--bg-secondary)',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}
      >
        <div className="container">
          <p style={{ margin: 0 }}>
            <strong>FarmaTech MediGuard v2.4</strong> — Designed for Clinical Decision Support & Patient Safety.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.72rem' }}>
            Complies with Standard Pharmacovigilance & Drug Interaction Guidelines.
          </p>
        </div>
      </footer>
    </>
  )
}
