import { useState } from 'react'
import {
  ClipboardList,
  FlaskConical,
  ScanLine,
  UserPlus,
  ChevronRight,
  AlertTriangle,
  Baby,
  Pill,
  CheckCircle2,
} from 'lucide-react'
import type { ExplainResponse } from '../api'
import type { DemoScenario } from '../lib/demoCases'
import type { CheckResponse, Language, PatientRecord } from '../types'
import { DEMO_SCENARIOS } from '../lib/demoCases'
import MedicationOptimization from './MedicationOptimization'
import PatientRecordPanel from './PatientRecordPanel'
import PatientSummary from './PatientSummary'
import QRPanel from './QRPanel'
import QrImportPanel from './QrImportPanel'
import SafetyCheckPanel from './SafetyCheckPanel'
import RecordSetupForm from './RecordSetupForm'

const DEMO_PATIENTS: DemoScenario[] = [
  DEMO_SCENARIOS.find((s) => s.id === 'case-2')!,
  DEMO_SCENARIOS.find((s) => s.id === 'case-3')!,
  DEMO_SCENARIOS.find((s) => s.id === 'case-4')!,
]

type Phase = 'new-patient' | 'patient-loaded'

interface Props {
  record: PatientRecord | null
  activeRecord: PatientRecord
  loadedNotice: string
  language: Language
  onLoadRecord: (
    patch: Partial<PatientRecord>,
    notice?: string,
    loadedReport?: CheckResponse,
  ) => void
  result: CheckResponse | null
  loading: boolean
  error: string
  onRunCheck: () => void
  aiExplain: ExplainResponse | null
  aiLoading: boolean
  aiUnavailable: boolean
}

export default function DoctorDashboard({
  record,
  activeRecord,
  loadedNotice,
  language,
  onLoadRecord,
  result,
  loading,
  error,
  onRunCheck,
  aiExplain,
  aiLoading,
  aiUnavailable,
}: Props) {
  const [phase, setPhase] = useState<Phase>(record ? 'patient-loaded' : 'new-patient')
  const [mode, setMode] = useState<'none' | 'scan'>('none')

  const handleNewPatientSubmit = (created: PatientRecord) => {
    onLoadRecord({ ...created, source: 'manual' }, 'Patient Record Loaded')
    setPhase('patient-loaded')
  }

  const handleNewPatientCancel = () => {
    setMode('none')
  }

  const loadDemoPatient = (scenario: DemoScenario) => {
    const demoRecord: Partial<PatientRecord> = {
      source: 'demo',
      name: `Demo Patient ${scenario.label.replace('Case ', '')}`,
      patientId: `DEMO-${scenario.id.toUpperCase()}`,
      age: scenario.profile.ageGroup,
      medicines: scenario.medicines,
      profile: scenario.profile,
    }
    onLoadRecord(demoRecord, `Demo Patient ${scenario.label.replace('Case ', '')} Loaded`)
    setPhase('patient-loaded')
  }

  /* ── Phase 1: New Patient / Manual Entry ──────────────────────────── */
  if (phase === 'new-patient') {
    return (
      <div className="stack">
        <section className="card">
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <UserPlus size={18} style={{ color: 'var(--brand)' }} />
              <div>
                <h2 className="card-title">New Patient Record</h2>
                <p className="card-sub">Enter patient identity, clinical context, and medications.</p>
              </div>
            </div>
          </div>
          <div className="card-pad">
            <RecordSetupForm
              title="Patient Information"
              subtitle="Enter the patient exactly as written on the clinical document."
              defaultAgeGroup="adult"
              onCreate={handleNewPatientSubmit}
              onCancel={handleNewPatientCancel}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <ScanLine size={18} style={{ color: 'var(--brand)' }} />
              <div>
                <h2 className="card-title">Or Scan Patient QR</h2>
                <p className="card-sub">Load a patient record from a validated QR pass.</p>
              </div>
            </div>
          </div>
          <div className="card-pad">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMode('scan')}
              style={{ width: '100%' }}
            >
              <ScanLine size={16} /> Scan with Camera or Paste Token
            </button>
          </div>
        </section>

        {mode === 'scan' && (
          <QrImportPanel
            onLoaded={({ record: qr }) => {
              onLoadRecord(
                {
                  source: 'qr',
                  name: qr.name ?? '',
                  patientId: qr.patientId ?? '',
                  age: qr.age ?? '',
                  medicines: qr.medicines,
                  profile: { ...EMPTY_PROFILE, ...qr.profile, allergies: qr.allergies },
                },
                'Patient Record Loaded',
                qr,
              )
              setPhase('patient-loaded')
              setMode('none')
            }}
          />
        )}

        {/* Demo / Test Patients Section — visible on initial dashboard */}
        <section className="card demo-section">
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <FlaskConical size={18} style={{ color: 'var(--color-text-muted)' }} />
              <div>
                <h2 className="card-title" style={{ fontSize: '0.95rem' }}>Demo / Test Patients</h2>
                <p className="card-sub">
                  Load a verified demo scenario to demonstrate the MediGuard workflow.
                </p>
              </div>
            </div>
          </div>
          <div className="card-pad" style={{ paddingTop: 14 }}>
            <div className="demo-grid">
              {DEMO_PATIENTS.map((scenario) => {
                const isPregnant = scenario.profile.isPregnant
                /* Badge config per case */
                const badge =
                  scenario.id === 'case-2'
                    ? { cls: 'badge badge-high', icon: <AlertTriangle size={10} aria-hidden="true" />, label: 'Contraindication' }
                    : scenario.id === 'case-3'
                    ? { cls: 'badge badge-moderate', icon: <Pill size={10} aria-hidden="true" />, label: 'Duplicate Therapy' }
                    : { cls: 'badge badge-neutral', icon: <CheckCircle2 size={10} aria-hidden="true" />, label: 'No Verified Match' }

                return (
                  <div key={scenario.id} className="demo-card">
                    {/* Case title row */}
                    <div className="demo-card-header">
                      <span className="eyebrow demo-case-label">
                        {scenario.id === 'case-2'
                          ? 'Pregnancy Safety Case'
                          : scenario.id === 'case-3'
                          ? 'Duplicate Therapy Case'
                          : 'Clean Medication Case'}
                      </span>
                    </div>

                    {/* Medicine list */}
                    <div className="demo-card-meds">
                      {scenario.medicines.map((m) => (
                        <span key={m} className="demo-med-name">{m}</span>
                      ))}
                      {isPregnant && (
                        <span className="badge badge-high demo-context-badge" aria-label="Pregnancy recorded">
                          <Baby size={10} aria-hidden="true" /> Pregnancy recorded
                        </span>
                      )}
                    </div>

                    {/* Result badge */}
                    <div className="demo-card-result">
                      <span className={badge.cls} style={{ gap: 5 }}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>

                    {/* Action */}
                    <button
                      type="button"
                      className="btn btn-primary demo-load-btn"
                      onClick={() => loadDemoPatient(scenario)}
                      aria-label={`Load demo patient: ${scenario.title}`}
                    >
                      Load Demo Patient
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="demo-disclaimer">
              Demo patients are for demonstration/testing only and are not real patient records.
            </p>
          </div>
        </section>
      </div>
    )
  }

/* ── Phase 2: Patient Loaded — Linear Clinical Workflow ───────────── */
  return (
    <div className="stack">
      {loadedNotice && <div className="notice notice-safe">✓ {loadedNotice}</div>}

      {/* Safety Check Section */}
      <SafetyCheckPanel
        record={activeRecord}
        view="doctor"
        result={result}
        loading={loading}
        error={error}
        onRun={onRunCheck}
        aiExplain={aiExplain}
        aiLoading={aiLoading}
        aiUnavailable={aiUnavailable}
      />

      {/* What-if Medication Optimization Simulator */}
      <MedicationOptimization record={activeRecord} language={language} />

      {/* Patient Record & Outputs */}
      <div className="card" style={{ borderColor: 'var(--color-info-border)' }}>
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <ClipboardList size={18} style={{ color: 'var(--color-brand)' }} />
            <div>
              <h2 className="card-title">Patient Record & Outputs</h2>
              <p className="card-sub">Medication reconciliation, summary report, and QR pass.</p>
            </div>
          </div>
        </div>
        <div className="card-pad" style={{ display: 'grid', gap: 16 }}>
          <PatientRecordPanel record={activeRecord} result={result} />
          <PatientSummary record={activeRecord} result={result} />
          <QRPanel record={activeRecord} />
        </div>
      </div>
    </div>
  )
}

const EMPTY_PROFILE = {
  ageGroup: 'adult' as const,
  isPregnant: false,
  hasRenalImpairment: false,
  hasLiverDisease: false,
  hasCardiacHistory: false,
  allergies: [] as string[],
}