import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, CircleAlert, FileHeart, Pill, TriangleAlert } from 'lucide-react'
import { getMedicineDetails } from '../api'
import type { CheckResponse, PatientRecord } from '../types'

interface Props {
  record: PatientRecord
  /** Latest /api/check response for this record — supplies backend-resolved ingredients. */
  result?: CheckResponse | null
  /** Persistent context indicator mode. */
  indicator?: boolean
}

interface MedicineView {
  recorded: string
  generic: string | null
  ingredients: string[]
  strength: string | null
  resolved: boolean
}

/**
 * Read the strength exactly as it appears in the recorded medicine name.
 * Nothing is inferred: a name without a strength returns null and the UI says
 * the database does not record it.
 */
function recordedStrength(name: string): string | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g)\b/i)
  return m ? `${m[1]} ${m[2].toLowerCase()}` : null
}

export default function PatientRecordPanel({ record, result, indicator = false }: Props) {
  const [details, setDetails] = useState<Record<string, { generic: string; ingredients: string[] }>>({})

  const key = useMemo(() => record.medicines.join('|'), [record.medicines])

  useEffect(() => {
    let cancelled = false
    const missing = record.medicines.filter(
      (m) => !details[m] && !result?.resolved?.some((r) => r.input.toLowerCase() === m.toLowerCase()),
    )
    if (missing.length === 0) return
    getMedicineDetails(missing).then((d) => {
      if (!cancelled) setDetails((prev) => ({ ...prev, ...d }))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, result])

  const medicines: MedicineView[] = record.medicines.map((recorded) => {
    const backendResolved = result?.resolved?.find((r) => r.input.toLowerCase() === recorded.toLowerCase())
    const lookup = details[recorded]
    return {
      recorded,
      // The lookup above is skipped for medicines the backend already resolved,
      // so fall back to the backend's own ingredient for the generic name.
      generic: lookup?.generic || backendResolved?.ingredients[0] || null,
      ingredients: backendResolved?.ingredients ?? lookup?.ingredients ?? [],
      strength: recordedStrength(recorded),
      resolved: Boolean(backendResolved) || Boolean(lookup),
    }
  })

  const unresolved = result?.unresolved ?? []
  const allergyList = record.profile.allergies

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Persistent context indicator */}
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

      {!indicator && (
        <>
          {/* Medication record */}
          <section className="card" style={{ maxWidth: 900 }}>
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
                <div className="notice" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  <Pill size={24} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>
                    No medications recorded
                  </div>
                  <div className="med-field" style={{ marginBottom: 'var(--space-3)' }}>
                    Load the patient record from their QR pass or add medicines below.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {medicines.map((m) => (
                    <div
                      key={m.recorded}
                      className="card"
                      style={{
                        boxShadow: 'none',
                        borderColor: m.resolved ? 'var(--color-border-subtle)' : 'var(--color-warning-border)',
                        background: m.resolved ? 'var(--color-bg-surface)' : 'var(--color-warning-soft)',
                      }}
                    >
                      <div className="card-pad" style={{ padding: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                          <Pill size={20} style={{ color: 'var(--color-brand)', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span className="med-name" style={{ fontSize: '1rem' }}>{m.recorded}</span>
                              {!m.resolved && (
                                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                                  Not in verified database
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 'var(--space-3) var(--space-4)',
                          }}
                        >
                          <div>
                            <div className="med-field"><b>Brand name</b></div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>{m.recorded}</div>
                          </div>
                          <div>
                            <div className="med-field"><b>Generic name</b></div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>{m.generic ?? 'Not recorded in database'}</div>
                          </div>
                          <div>
                            <div className="med-field"><b>Active ingredient</b></div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>
                              {m.ingredients.length > 0 ? m.ingredients.join(', ') : 'Run Safety Check to resolve'}
                            </div>
                          </div>
                          {m.strength && (
                            <div>
                              <div className="med-field"><b>Strength</b></div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>{m.strength}</div>
                            </div>
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