import { BadgeCheck, CircleAlert, FileHeart, Pill, TriangleAlert } from 'lucide-react'
import type { CheckResponse, PatientRecord } from '../types'
import { useMedicineViews } from '../lib/useMedicineViews'

interface Props {
  record: PatientRecord
  /** Latest /api/check response for this record — supplies backend-resolved ingredients. */
  result?: CheckResponse | null
  /** Persistent context indicator mode. */
  indicator?: boolean
  /**
   * Render the built-in "record loaded" banner. The clinician dashboard turns
   * this off and renders its own patient-context strip instead.
   */
  showIndicator?: boolean
}

/**
 * Read-only medication record view (clinician surface). Resolution logic
 * lives in useMedicineViews so the patient dashboard shares one lookup path.
 */
export default function PatientRecordPanel({ record, result, indicator = false, showIndicator = true }: Props) {
  const medicines = useMedicineViews(record.medicines, result)

  const unresolved = result?.unresolved ?? []
  const allergyList = record.profile.allergies

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Persistent context indicator */}
      {showIndicator && (
        <div
          className="card"
          style={{
            borderColor: 'var(--color-success-border)',
            background: 'var(--color-success-soft)',
            padding: '11px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span className="badge badge-safe" style={{ background: 'var(--color-bg-surface)' }}>
            <BadgeCheck size={12} /> Patient record: loaded
          </span>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="small">
              <b style={{ color: 'var(--color-text-primary)' }}>{record.name || 'Unnamed patient'}</b>
            </span>
            <span className="med-field">
              ID <b style={{ display: 'inline', color: 'var(--color-text-secondary)' }}>{record.patientId || '—'}</b>
            </span>
            <span className="med-field">
              Age <b style={{ display: 'inline', color: 'var(--color-text-secondary)' }}>{record.age || record.profile.ageGroup}</b>
            </span>
            <span className="med-field">
              Medications{' '}
              <b style={{ display: 'inline', color: 'var(--color-text-secondary)' }}>{record.medicines.length}</b>
            </span>
            <span className="med-field">
              Allergies{' '}
              <b style={{ display: 'inline', color: 'var(--color-text-secondary)' }}>{allergyList.length || 'none recorded'}</b>
            </span>
          </div>
        </div>
      )}

      {!indicator && (
        <>
          {/* Medication record */}
          <section className="card">
            <div className="card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <FileHeart size={18} style={{ color: 'var(--color-brand)' }} />
                <div>
                  <h2 className="card-title">Current Patient Medication Record</h2>
                  <p className="card-sub">
                    {record.medicines.length} recorded medication{record.medicines.length === 1 ? '' : 's'} ·
                    brand → generic → active ingredient as held in the verified database.
                  </p>
                </div>
              </div>
            </div>
            <div className="card-pad">
              {medicines.length === 0 ? (
                <div className="notice dd-med-empty">
                  <Pill size={24} aria-hidden />
                  <div className="dd-med-empty-title">No medications recorded</div>
                  <div className="med-field">
                    Load the patient record from their QR pass or add medicines below.
                  </div>
                </div>
              ) : (
                <div className="dd-med-list">
                  {medicines.map((m) => (
                    <div
                      key={m.recorded}
                      className={m.resolved ? 'dd-med-row' : 'dd-med-row dd-med-row--review'}
                    >
                      <Pill size={18} className="dd-med-icon" aria-hidden />
                      <div className="dd-med-body">
                        <div className="dd-med-title">
                          <span className="med-name">{m.recorded}</span>
                          {!m.resolved && (
                            <span className="badge badge-neutral">Not in verified database</span>
                          )}
                        </div>
                        <div className="dd-med-meta">
                          <span>
                            <b>Generic</b> {m.generic ?? 'Not recorded in database'}
                          </span>
                          <span>
                            <b>Active</b>{' '}
                            {m.ingredients.length > 0 ? m.ingredients.join(', ') : 'Run Safety Check to resolve'}
                          </span>
                          {m.strength && (
                            <span>
                              <b>Strength</b> {m.strength}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unresolved.length > 0 && (
                <div className="notice notice-warn" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <CircleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    Not found in the verified database: <b>{unresolved.join(', ')}</b>. These entries are
                    reported as unresolved — no interaction, duplicate-therapy or contraindication rule was
                    checked for them.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Allergies */}
          <section className="card">
            <div className="card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <TriangleAlert size={18} style={{ color: allergyList.length ? 'var(--color-warning)' : 'var(--color-text-muted)' }} />
                <div>
                  <h2 className="card-title">Patient Allergies</h2>
                  <p className="card-sub">
                    Recorded allergy context. Not a drug–drug interaction category.
                  </p>
                </div>
              </div>
            </div>
            <div className="card-pad" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allergyList.length === 0 ? (
                <span className="notice" style={{ borderStyle: 'dashed' }}>
                  No recorded allergies
                </span>
              ) : (
                allergyList.map((a) => (
                  <span key={a} className="badge badge-moderate" style={{ textTransform: 'none', fontSize: '0.78rem' }}>
                    {a}
                  </span>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
