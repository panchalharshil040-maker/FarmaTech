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
            onLoaded={({ record: qr }) =>
              onLoadRecord(
                {
                  source: 'qr',
                  medicines: qr.medicines,
                  profile: { ...EMPTY_PROFILE, allergies: qr.allergies },
                },
                'Patient Record Loaded',
                qr,
              )
            }
          />
        )}

        {/* Demo / Test Patients Section — visible on initial dashboard */}
        <section className="card" style={{ borderColor: 'var(--color-warning-border)', background: 'var(--color-warning-soft)' }}>
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <FlaskConical size={18} style={{ color: 'var(--color-warning)' }} />
              <div>
                <h2 className="card-title">DEMO / TEST PATIENTS</h2>
                <p className="card-sub">
                  Load a verified demo patient to quickly demonstrate the MediGuard workflow.
                </p>
              </div>
            </div>
          </div>
          <div className="card-pad">
            <p className="med-field" style={{ fontSize: '0.75rem', color: 'var(--color-warning-text)', fontStyle: 'italic', marginBottom: 12 }}>
              Demo patients are for demonstration/testing only and are not real patient records.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 14,
              }}
            >
              {DEMO_PATIENTS.map((scenario) => {
                const isPregnant = scenario.profile.isPregnant
                const medCount = scenario.medicines.length
                return (
                  <div key={scenario.id} className="card" style={{ padding: 18, background: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        {scenario.id === 'case-2' && (
                          <span className="badge badge-high" style={{ textAlign: 'center' }}>
                            <AlertTriangle size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            PREGNANCY CASE
                          </span>
                        )}
                        {scenario.id === 'case-3' && (
                          <span className="badge badge-moderate" style={{ textAlign: 'center' }}>
                            <Pill size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            DUPLICATE THERAPY
                          </span>
                        )}
                        {scenario.id === 'case-4' && (
                          <span className="badge badge-low" style={{ textAlign: 'center' }}>
                            <CheckCircle2 size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            CLEAN CASE
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span className="med-name" style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {scenario.title}
                          </span>
                        </div>
                        <p className="med-field" style={{ marginTop: 2, lineHeight: 1.5, fontSize: '0.85rem' }}>
                          {scenario.description}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.8rem' }}>
                        <span className="small muted">Medication(s):</span>
                        <span className="small" style={{ fontWeight: 500 }}>
                          {scenario.medicines.join(', ')}
                        </span>
                      </div>
                      {isPregnant && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                          <Baby size={12} style={{ color: 'var(--color-danger)' }} />
                          <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>
                            Pregnancy
                          </span>
                        </div>
                      )}
                      {medCount > 1 && !isPregnant && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                          <span className="badge badge-moderate" style={{ fontSize: '0.65rem' }}>
                            {medCount} Medicines
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => loadDemoPatient(scenario)}
                        style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        Load Demo Patient
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
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