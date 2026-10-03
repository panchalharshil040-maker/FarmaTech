import { FlaskConical } from 'lucide-react'
import { DEMO_SCENARIOS, type DemoScenario } from '../lib/demoCases'

interface Props {
  onSelect: (scenario: DemoScenario) => void
  activeId?: string | null
}

/**
 * DEMO / TEST SCENARIOS.
 *
 * Selecting a case loads a demo patient state only. It never writes to a real
 * patient record, and the safety result always comes from the deterministic
 * backend for the medicines listed in the case.
 */
export default function DemoScenarios({ onSelect, activeId }: Props) {
  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <FlaskConical size={18} style={{ color: 'var(--caution)' }} />
          <div>
            <h2 className="card-title">Demo / Test Scenarios</h2>
            <p className="card-sub">
              Demonstration data only. A scenario never becomes part of a real patient record.
            </p>
          </div>
        </div>
      </div>
      <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 10,
          }}
        >
          {DEMO_SCENARIOS.map((s) => {
            const active = activeId === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="card"
                style={{
                  padding: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: active ? 'var(--brand-soft)' : 'var(--bg-surface)',
                  borderColor: active ? '#93c5fd' : 'var(--border-base)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={active ? 'badge badge-info' : 'badge badge-neutral'} style={{ fontSize: '0.6rem' }}>
                    {s.label}
                  </span>
                  <span className="med-name" style={{ fontSize: '0.84rem' }}>
                    {s.title}
                  </span>
                </div>
                <p className="med-field" style={{ lineHeight: 1.45 }}>
                  {s.description}
                </p>
              </button>
            )
          })}
        </div>
        <p className="med-field">
          These scenarios call the real /api/check and /api/simulate endpoints. No result is hardcoded and no
          warning is manufactured.
        </p>
      </div>
    </section>
  )
}