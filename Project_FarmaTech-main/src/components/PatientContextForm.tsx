import { AlertCircle, Baby, Heart, ShieldAlert, UserCheck } from 'lucide-react'
import type { AgeGroup, PatientProfile } from '../types'

interface Props {
  profile: PatientProfile
  onChange: (p: PatientProfile) => void
  title?: string
  hint?: string
}

const CONDITION_FIELDS = [
  {
    key: 'isPregnant' as const,
    label: 'Pregnant / Lactating',
    detail: 'Checked against pregnancy contraindication rules',
    Icon: Baby,
  },
  {
    key: 'hasRenalImpairment' as const,
    label: 'Renal impairment',
    detail: 'Checked against kidney-function rules',
    Icon: AlertCircle,
  },
  {
    key: 'hasLiverDisease' as const,
    label: 'Liver disease',
    detail: 'Checked against hepatic-function rules',
    Icon: ShieldAlert,
  },
  {
    key: 'hasCardiacHistory' as const,
    label: 'Cardiac history',
    detail: 'Checked against cardiac rules',
    Icon: Heart,
  },
]

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'adult', label: 'Adult' },
  { value: 'elderly', label: 'Elderly' },
]

/**
 * Patient clinical context. These are the exact PatientProfile fields the
 * deterministic backend accepts — the frontend stores no condition of its own
 * and never evaluates one locally.
 */
export default function PatientContextForm({ profile, onChange, title, hint }: Props) {
  const toggle = (key: 'isPregnant' | 'hasRenalImpairment' | 'hasLiverDisease' | 'hasCardiacHistory') =>
    onChange({ ...profile, [key]: !profile[key] })

  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <UserCheck size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <h2 className="card-title">{title ?? 'Patient Clinical Context'}</h2>
            <p className="card-sub">
              {hint ??
                'Recorded conditions and allergies are sent to the deterministic engine, which matches them against verified rules.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="section-label">Age group</span>
          <div className="tabbar" style={{ padding: 3 }}>
            {AGE_GROUPS.map((g) => {
              const active = profile.ageGroup === g.value
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => onChange({ ...profile, ageGroup: g.value })}
                  className={active ? 'tab tab-active' : 'tab'}
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 10,
          }}
        >
          {CONDITION_FIELDS.map(({ key, label, detail, Icon }) => {
            const active = profile[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                aria-pressed={active}
                className="data-row"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  alignItems: 'flex-start',
                  background: active ? 'var(--high-soft)' : 'var(--bg-surface)',
                  borderColor: active ? '#fecaca' : 'var(--border-base)',
                }}
              >
                <Icon size={16} style={{ color: active ? 'var(--high)' : '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                    {label}
                  </span>
                  <span className="med-field">{detail}</span>
                </span>
                <span className={active ? 'badge badge-high' : 'badge badge-neutral'} style={{ fontSize: '0.6rem' }}>
                  {active ? 'Yes' : 'No'}
                </span>
              </button>
            )
          })}
        </div>

        <div>
          <label className="section-label" htmlFor="allergy-input" style={{ display: 'block', marginBottom: 6 }}>
            Allergies (comma-separated)
          </label>
          <input
            id="allergy-input"
            className="field"
            value={profile.allergies.join(', ')}
            placeholder="e.g. Penicillin, Sulfa, Aspirin"
            onChange={(e) =>
              onChange({
                ...profile,
                allergies: e.target.value
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="med-field" style={{ marginTop: 5 }}>
            Allergies are recorded patient context. They are evaluated by the backend against verified
            rules — an allergy is never treated as a drug–drug interaction here.
          </p>
        </div>
      </div>
    </section>
  )
}