import { useState } from 'react'
import { CircleMinus, Save } from 'lucide-react'
import type { AgeGroup, PatientRecord } from '../types'
import MedicineSearch from './MedicineSearch'

interface Props {
  title: string
  subtitle: string
  /** Present when editing an existing record. */
  initial?: PatientRecord
  defaultAgeGroup?: AgeGroup
  compact?: boolean
  onCreate: (record: PatientRecord) => void
  onCancel: () => void
}

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'adult', label: 'Adult' },
  { value: 'elderly', label: 'Elderly' },
]

/**
 * Record entry / edit form.
 *
 * Identity fields are document metadata — they are stored for display and are
 * never sent to the deterministic engine. Only `medicines` and `profile` reach
 * /api/check and /api/simulate.
 */
export default function RecordSetupForm({
  title,
  subtitle,
  initial,
  defaultAgeGroup = 'adult',
  compact = false,
  onCreate,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [patientId, setPatientId] = useState(initial?.patientId ?? '')
  const [age, setAge] = useState(initial?.age ?? '')
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(initial?.profile.ageGroup ?? defaultAgeGroup)
  const [isPregnant, setIsPregnant] = useState(initial?.profile.isPregnant ?? false)
  const [allergies, setAllergies] = useState((initial?.profile.allergies ?? []).join(', '))
  const [medicines, setMedicines] = useState<string[]>(initial?.medicines ?? [])

  const submit = () => {
    onCreate({
      source: initial?.source ?? 'manual',
      name: name.trim(),
      patientId: patientId.trim(),
      age: age.trim(),
      medicines,
      profile: {
        ageGroup,
        isPregnant,
        hasRenalImpairment: initial?.profile.hasRenalImpairment ?? false,
        hasLiverDisease: initial?.profile.hasLiverDisease ?? false,
        hasCardiacHistory: initial?.profile.hasCardiacHistory ?? false,
        allergies: allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      },
    })
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">{title}</h2>
          <p className="card-sub">{subtitle}</p>
        </div>
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div>
            <label className="section-label" htmlFor="rec-name" style={{ display: 'block', marginBottom: 6 }}>
              Patient name
            </label>
            <input id="rec-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="As on the record" />
          </div>
          <div>
            <label className="section-label" htmlFor="rec-id" style={{ display: 'block', marginBottom: 6 }}>
              Patient ID
            </label>
            <input id="rec-id" className="field" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Record identifier" />
          </div>
          <div>
            <label className="section-label" htmlFor="rec-age" style={{ display: 'block', marginBottom: 6 }}>
              Age
            </label>
            <input id="rec-age" className="field" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 62" />
          </div>
          <div>
            <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>
              Age group (engine field)
            </span>
            <div className="tabbar" style={{ padding: 3 }}>
              {AGE_GROUPS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  className={ageGroup === g.value ? 'tab tab-active' : 'tab'}
                  style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                  onClick={() => setAgeGroup(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 12px',
            border: '1px solid var(--border-base)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            width: 'fit-content',
          }}
        >
          <input
            id="rec-pregnant"
            type="checkbox"
            checked={isPregnant}
            onChange={(e) => setIsPregnant(e.target.checked)}
          />
          <span className="small" style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
            Pregnancy recorded
          </span>
        </label>

        <div>
          <label className="section-label" htmlFor="rec-allergy" style={{ display: 'block', marginBottom: 6 }}>
            Allergies (comma-separated)
          </label>
          <input
            id="rec-allergy"
            className="field"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, Sulfa"
          />
        </div>

        {!initial && (
          <div style={{ display: 'grid', gap: 8 }}>
            <MedicineSearch
              exclude={medicines}
              label={`Active medications (${medicines.length})`}
              onSelect={(name) => setMedicines((prev) => (prev.some((m) => m.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]))}
            />
            {medicines.map((m) => (
              <div key={m} className="data-row" style={{ padding: '8px 12px' }}>
                <span className="med-name">{m}</span>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setMedicines((prev) => prev.filter((x) => x !== m))}>
                  <CircleMinus size={13} /> Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={submit}>
            <Save size={15} /> {compact ? 'Save record details' : 'Load patient record'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  )
}