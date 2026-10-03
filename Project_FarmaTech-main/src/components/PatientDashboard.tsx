import { useState } from 'react'
import { CircleMinus, FileHeart, HeartPulse, ScanLine, UserPlus } from 'lucide-react'
import type { ExplainResponse } from '../api'
import type { CheckResponse, PatientRecord } from '../types'
import MedicineSearch from './MedicineSearch'
import PatientContextForm from './PatientContextForm'
import PatientRecordPanel from './PatientRecordPanel'
import PatientSummary from './PatientSummary'
import QRPanel from './QRPanel'
import QrImportPanel from './QrImportPanel'
import RecordSetupForm from './RecordSetupForm'
import SafetyCheckPanel from './SafetyCheckPanel'

interface Props {
  record: PatientRecord | null
  loadedNotice: string
  onLoadRecord: (
    patch: Partial<PatientRecord>,
    notice?: string,
    loadedReport?: CheckResponse,
  ) => void
  onEditRecord: (patch: Partial<PatientRecord>) => void
  onClearRecord: () => void
  result: CheckResponse | null
  loading: boolean
  error: string
  onRunCheck: () => void
  aiExplain: ExplainResponse | null
  aiLoading: boolean
  aiUnavailable: boolean
}

/**
 * PATIENT DASHBOARD — read-only view of the patient's own medication safety
 * information. Clinician-only features (patient selection, medication
 * optimization, what-if simulation) are deliberately not present here.
 */
export default function PatientDashboard({
  record,
  loadedNotice,
  onLoadRecord,
  onEditRecord,
  onClearRecord,
  result,
  loading,
  error,
  onRunCheck,
  aiExplain,
  aiLoading,
  aiUnavailable,
}: Props) {
  const [mode, setMode] = useState<'none' | 'scan' | 'manual'>('none')

  if (!record) {
    return (
      <div className="stack">
        <section className="card">
          <div className="card-pad" style={{ display: 'grid', gap: 14, justifyItems: 'center', textAlign: 'center', padding: '32px 20px' }}>
            <span className="eyebrow">My Medication Safety</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-strong)' }}>
              No medication record loaded
            </h2>
            <p className="small muted" style={{ maxWidth: 520, lineHeight: 1.55 }}>
              Load your own QR medication pass, or enter the medicines from your prescription to see the
              verified safety information for your record.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setMode(mode === 'scan' ? 'none' : 'scan')}>
                <ScanLine size={16} /> Scan my QR pass
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => setMode(mode === 'manual' ? 'none' : 'manual')}>
                <UserPlus size={16} /> Enter my medicines
              </button>
            </div>
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

        {mode === 'manual' && (
          <RecordSetupForm
            title="My medication record"
            subtitle="Enter the medicines exactly as they appear on your prescription or discharge summary."
            defaultAgeGroup="adult"
            onCancel={() => setMode('none')}
            onCreate={(created) => onLoadRecord({ ...created, source: 'manual' }, 'Patient Record Loaded')}
          />
        )}
      </div>
    )
  }

  return (
    <div className="stack">
      {loadedNotice && <div className="notice notice-safe">✓ {loadedNotice}</div>}

      <section className="card">
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <HeartPulse size={18} style={{ color: 'var(--brand)' }} />
            <div>
              <h2 className="card-title">Patient Profile</h2>
              <p className="card-sub">The medication record this page describes.</p>
            </div>
          </div>
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClearRecord}>
            Clear my record
          </button>
        </div>
        <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <div className="stat-box">
            <div className="eyebrow">Name</div>
            <div className="med-name" style={{ textTransform: 'none' }}>{record.name || 'Not recorded'}</div>
          </div>
          <div className="stat-box">
            <div className="eyebrow">Record ID</div>
            <div className="med-name" style={{ textTransform: 'none' }}>{record.patientId || 'Not recorded'}</div>
          </div>
          <div className="stat-box">
            <div className="eyebrow">Age</div>
            <div className="med-name" style={{ textTransform: 'none' }}>{record.age || record.profile.ageGroup}</div>
          </div>
          <div className="stat-box">
            <div className="eyebrow">Medications</div>
            <div className="med-name">{record.medicines.length}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <FileHeart size={18} style={{ color: 'var(--brand)' }} />
            <div>
              <h2 className="card-title">My Medications</h2>
              <p className="card-sub">
                Medicines on your record, as entered. Ask your doctor or pharmacist before changing anything.
              </p>
            </div>
          </div>
        </div>
        <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
          <MedicineSearch
            exclude={record.medicines}
            placeholder="Search the medicine on your prescription…"
            onSelect={(name) => onEditRecord({ medicines: [...record.medicines, name] })}
          />
          {record.medicines.length === 0 ? (
            <div className="notice">No medicines recorded yet.</div>
          ) : (
            record.medicines.map((m) => (
              <div key={m} className="data-row" style={{ padding: '9px 12px' }}>
                <span className="med-name">{m}</span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => onEditRecord({ medicines: record.medicines.filter((x) => x !== m) })}
                >
                  <CircleMinus size={13} /> Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <PatientRecordPanel record={record} result={result} />

      <PatientContextForm
        profile={record.profile}
        onChange={(profile) => onEditRecord({ profile })}
        title="My Health Information"
        hint="Recorded here so the verified database rules can be checked against your situation."
      />

      <SafetyCheckPanel
        record={record}
        view="patient"
        result={result}
        loading={loading}
        error={error}
        onRun={onRunCheck}
        aiExplain={aiExplain}
        aiLoading={aiLoading}
        aiUnavailable={aiUnavailable}
      />

      <QRPanel record={record} />

      <PatientSummary record={record} result={result} />

      <div className="notice notice-warn">
        <b>Medical disclaimer.</b> MediGuard shows information produced by a deterministic medication-safety
        engine over verified databases. Decision support only. Not a substitute for a doctor&rsquo;s or
        pharmacist&rsquo;s clinical judgment. If you feel unwell or think something is wrong, contact your
        clinician.
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