import { Utensils, ShieldCheck } from 'lucide-react'
import type { FoodWarning } from '../types'

interface Props {
  /** Verified food warnings from the deterministic backend (foodwarning.json). */
  warnings: FoodWarning[]
}

/**
 * VERIFIED FOOD WARNINGS — sourced from foodwarning.json via the deterministic backend.
 *
 * These are distinct from drug-drug interactions, contraindications, and duplicate therapy.
 * They represent FDA-labeled food-drug interactions and dietary guidance.
 * Each warning carries its source record ID and provenance.
 */
export default function VerifiedFoodWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null

  return (
    <section className="card" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Utensils size={18} style={{ color: '#b45309' }} />
          <div>
            <h2 className="card-title">Verified Food & Dietary Interactions</h2>
            <p className="card-sub">
              Sourced from FDA drug labeling (foodwarning.json). Separate from drug-drug interactions, contraindications, and duplicate therapy.
            </p>
          </div>
        </div>
        <span className="badge badge-moderate">{warnings.length}</span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
        <div className="notice notice-warn" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            These are verified FDA-labeled food/drug interactions and dietary guidance. They are not drug-drug interactions.
            Each warning includes its source record ID for traceability.
          </span>
        </div>
        {warnings.map((w, i) => (
          <div key={w.id ?? i} className="card" style={{ boxShadow: 'none', background: 'var(--bg-surface)' }}>
            <div className="card-pad" style={{ display: 'grid', gap: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-moderate" style={{ fontSize: '0.6rem', flexShrink: 0 }}>
                  {w.id}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span className="med-name" style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>
                      {w.medicine}
                    </span>
                    <span className="small muted">
                      Food: <b>{w.food}</b>
                    </span>
                  </div>
                  <p className="small" style={{ color: 'var(--text-body)', lineHeight: 1.5 }}>
                    {w.warning}
                  </p>
                  <p className="small" style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                    Effect: {w.effect}
                  </p>
                </div>
              </div>
              <div className="verified-note" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <ShieldCheck size={12} style={{ color: '#b45309' }} />
                <span className="small">
                  Source: <b>{w.source?.organization ?? 'FDA'}</b> · Dataset: <b>{w.source?.dataset ?? 'openFDA Drug Labeling'}</b>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}