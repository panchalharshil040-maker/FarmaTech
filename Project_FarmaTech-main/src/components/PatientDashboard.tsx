import { useState } from 'react'
import { CircleAlert, CircleMinus, HeartPulse, Pill, ScanLine, ShieldCheck, UserPlus } from 'lucide-react'
import type { ExplainResponse } from '../api'
import type { CheckResponse, PatientRecord } from '../types'
import { useMedicineViews } from '../lib/useMedicineViews'
import MedicineSearch from './MedicineSearch'
import PatientContextForm from './PatientContextForm'
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

const CHECK_SCOPE = ['Drug–Drug Interactions', 'Duplicate Therapy', 'Contraindications', 'Food Interactions']

/**
 * PATIENT DASHBOARD — read-only view of the patient's own medication safety
 * information. Clinician-only features (patient selection, medication
 * optimization, what-if simulation) are deliberately not present here.
 *
 * Section order follows what a patient needs first:
 *   1. What medicines are on my record
 *   2. The safety check and its verified findings
 *   3. What needs review (unresolved names, health context)
 *   4. QR pass, printable summary and the medical disclaimer
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
  /* Hook must run before the no-record early return — an empty list is a no-op. */
  const medicineViews = useMedicineViews(record?.medicines ?? [], result)

  if (!record) {
    return (
      <div className="stack">
        <section className="card pd-empty">
          <div className="card-pad pd-empty-pad">
            <span className="pd-empty-mark" aria-hidden>
              <HeartPulse size={26} />
            </span>
            <span className="eyebrow dash-intro-eyebrow">My Medication Safety</span>
            <h2 className="pd-empty-title">No medication record loaded</h2>
            <p className="pd-empty-text">
              Load your own QR medication pass, or enter the medicines from your prescription to see the
              verified safety information for your record.
            </p>
            <div className="pd-empty-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => setMode(mode === 'scan' ? 'none' : 'scan')}
              >
                <ScanLine size={16} /> Scan my QR pass
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => setMode(mode === 'manual' ? 'none' : 'manual')}
              >
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
                  name: qr.name ?? '',
                  patientId: qr.patientId ?? '',
                  age: qr.age ?? '',
                  medicines: qr.medicines,
                  profile: { ...EMPTY_PROFILE, ...qr.profile, allergies: qr.allergies },
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

  const unresolved = result?.unresolved ?? []

  return (
    <div className="stack">
      {loadedNotice && <div className="notice notice-safe">✓ {loadedNotice}</div>}

      {/* 1 — Record at a glance */}
      <section className="card pd-strip" aria-label="My medication record summary">
        <div className="pd-strip-id">
          <span className="pd-strip-avatar" aria-hidden>
            <HeartPulse size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow dash-intro-eyebrow">My record</p>
            <h2 className="pd-strip-name">{record.name || 'My medication record'}</h2>
          </div>
        </div>
        <dl className="pd-strip-facts">
          <div className="pd-strip-fact">
            <dt>Record ID</dt>
            <dd>{record.patientId || '—'}</dd>
          </div>
          <div className="pd-strip-fact">
            <dt>Age</dt>
            <dd>{record.age || record.profile.ageGroup}</dd>
          </div>
          <div className="pd-strip-fact">
            <dt>Medicines</dt>
            <dd>{record.medicines.length}</dd>
          </div>
          <div className="pd-strip-fact">
            <dt>Source</dt>
            <dd style={{ textTransform: 'capitalize' }}>{record.source}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onClearRecord}>
          Clear my record
        </button>
      </section>

      {/* 2 — My medicines */}
      <section className="card">
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Pill size={18} style={{ color: 'var(--color-health-teal)' }} />
            <div>
              <h2 className="card-title">My Medicines</h2>
              <p className="card-sub">
                The medicines on your record, exactly as entered. Ask your doctor or pharmacist before
                changing anything.
              </p>
            </div>
          </div>
        </div>
        <div className="card-pad pd-meds">
          <MedicineSearch
            exclude={record.medicines}
            placeholder="Search the medicine on your prescription…"
            onSelect={(name) =>
              onEditRecord({
                medicines: record.medicines.some((m) => m.toLowerCase() === name.toLowerCase())
                  ? record.medicines
                  : [...record.medicines, name],
              })
            }
          />

          {record.medicines.length === 0 ? (
            <div className="pd-meds-empty">
              <Pill size={22} aria-hidden />
              <span>No medicines on your record yet. Search above to add the first one.</span>
            </div>
          ) : (
            <ul className="pd-med-list">
              {medicineViews.map((m) => (
                <li
                  key={m.recorded}
                  className={m.resolved ? 'pd-med' : 'pd-med pd-med--review'}
                >
                  <div className="pd-med-main">
                    <Pill size={16} className="pd-med-icon" aria-hidden />
                    <div className="pd-med-body">
                      <div className="pd-med-title">
                        <span className="med-name">{m.recorded}</span>
                        {!m.resolved && (
                          <span className="badge badge-moderate">Not in verified database</span>
                        )}
                      </div>
                      <div className="pd-med-details">
                        <span>
                          <b>Generic</b>
                          {m.generic ?? 'Not recorded'}
                        </span>
                        <span>
                          <b>Active ingredient</b>
                          {m.ingredients.length > 0
                            ? m.ingredients.join(', ')
                            : 'Run a safety check to resolve'}
                        </span>
                        {m.strength && (
                          <span>
                            <b>Strength</b>
                            {m.strength}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pd-med-action">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() =>
                        onEditRecord({ medicines: record.medicines.filter((x) => x !== m.recorded) })
                      }
                    >
                      <CircleMinus size={13} /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {unresolved.length > 0 && (
            <div className="notice notice-warn" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CircleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
              <span>
                Not found in the verified database: <b>{unresolved.join(', ')}</b>. These entries were not
                checked against interaction, duplicate-therapy or contraindication rules.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 3 — Safety check: call-to-action before a run, results after */}
      {!result && !loading && !error && (
        <section className="card pd-cta">
          <div className="pd-cta-pad">
            <span className="pd-cta-icon" aria-hidden>
              <ShieldCheck size={20} />
            </span>
            <h2 className="pd-cta-title">Check my medication safety</h2>
            <p className="pd-cta-text">
              Analyze your active medication record for verified interactions, duplicates and
              contraindications.
            </p>
            <ul className="pd-cta-tags">
              {CHECK_SCOPE.map((c) => (
                <li key={c} className="badge badge-info" style={{ textTransform: 'none', fontSize: '0.74rem' }}>
                  {c}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary btn-lg pd-cta-btn"
              onClick={onRunCheck}
              disabled={loading || record.medicines.length === 0}
            >
              <ShieldCheck size={16} />
              {loading ? 'Analyzing…' : 'Analyze My Medication Safety'}
            </button>
            <p className="pd-cta-count">
              {record.medicines.length === 0
                ? 'No medicine on your record yet — add a medicine first.'
                : `Analysing ${record.medicines.length} medicine${record.medicines.length === 1 ? '' : 's'} from your record.`}
            </p>
          </div>
        </section>
      )}

      {(result || loading || error) && (
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
      )}

      {/* 4 — Health information used by the verified rules */}
      <PatientContextForm
        profile={record.profile}
        onChange={(profile) => onEditRecord({ profile })}
        title="My Health Information"
        hint="Recorded here so the verified database rules can be checked against your situation."
      />

      {/* 5 — QR pass, printable summary, disclaimer */}
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
