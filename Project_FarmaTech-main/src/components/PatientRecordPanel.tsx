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
      generic: lookup?.generic ?? null,
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
          borderColor: '#a7f3d0',
          background: 'var(--safe-soft)',
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span className="badge badge-low" style={{ background: '#ffffff' }}>
          <BadgeCheck size={12} /> Patient record: loaded
        </span>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="small">
            <b style={{ color: 'var(--text-strong)' }}>{record.name || 'Unnamed patient'}</b>
          </span>
          <span className="med-field">
            ID <b style={{ display: 'inline', color: 'var(--text-body)' }}>{record.patientId || '—'}</b>
          </span>
          <span className="med-field">
            Age <b style={{ display: 'inline', color: 'var(--text-body)' }}>{record.age || record.profile.ageGroup}</b>
          </span>
          <span className="med-field">
            Medications{' '}
            <b style={{ display: 'inline', color: 'var(--text-body)' }}>{record.medicines.length}</b>
          </span>
          <span className="med-field">
            Allergies{' '}
            <b style={{ display: 'inline', color: 'var(--text-body)' }}>{allergyList.length || 'none recorded'}</b>
          </span>
        </div>
      </div>

      {!indicator && (
        <>
          {/* Medication record */}
          <section className="card">
            <div className="card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <FileHeart size={18} style={{ color: 'var(--brand)' }} />
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
                <div className="notice">
                  No medications recorded in this patient record. Load the patient record from their QR pass
                  or add medicines below.
                </div>
              ) : (
                <div>
                  {medicines.map((m) => (
                    <div key={m.recorded} className="data-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Pill size={15} style={{ color: 'var(--brand)' }} />
                        <span className="med-name">{m.recorded}</span>
                        {!m.resolved && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>
                            Not in verified database
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: 8,
                        }}
                      >
                        <span className="med-field">
                          <b>Brand name</b>
                          {m.recorded}
                        </span>
                        <span className="med-field">
                          <b>Generic name</b>
                          {m.generic ?? 'Not recorded in database'}
                        </span>
                        <span className="med-field">
                          <b>Active ingredient</b>
                          {m.ingredients.length > 0 ? m.ingredients.join(', ') : 'Run Safety Check to resolve'}
                        </span>
                        <span className="med-field">
                          <b>Strength</b>
                          {m.strength ?? 'Not recorded in database'}
                        </span>
                        <span className="med-field">
                          <b>Dosage form</b>
                          Not recorded in database
                        </span>
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
                <TriangleAlert size={18} style={{ color: allergyList.length ? 'var(--caution)' : '#94a3b8' }} />
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