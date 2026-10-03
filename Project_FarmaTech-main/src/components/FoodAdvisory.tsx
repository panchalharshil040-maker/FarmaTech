import { Utensils } from 'lucide-react'
import type { FoodWarning } from '../types'

interface Props {
  /** Unverified local lifestyle advisories from the frontend local engine. */
  warnings?: string[]
  /** Verified food warnings from the backend (foodwarning.json). */
  verifiedWarnings?: FoodWarning[]
  patientWarnings?: string[]
}

/**
 * DIETARY & LIFESTYLE ADVISORIES
 *
 * Two distinct categories, clearly separated:
 * 1. Verified Food Warnings — from foodwarning.json via the deterministic backend.
 *    These are FDA-labeled food-drug interactions with source provenance.
 * 2. Unverified Local Advisories — general lifestyle text from the frontend local engine.
 *    These carry no severity, no risk value, and are clearly labelled as unverified.
 */
export default function FoodAdvisory({ warnings = [], verifiedWarnings = [], patientWarnings = [] }: Props) {
  const unverifiedAll = [...warnings, ...patientWarnings]
  const hasVerified = verifiedWarnings.length > 0
  const hasUnverified = unverifiedAll.length > 0

  if (!hasVerified && !hasUnverified) return null

  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Utensils size={18} style={{ color: hasVerified ? '#b45309' : 'var(--caution)' }} />
          <div>
            <h2 className="card-title">
              {hasVerified ? 'Food & Dietary Information' : 'Dietary & Lifestyle Advisories'}
            </h2>
            <p className="card-sub">
              {hasVerified
                ? 'Verified FDA food-drug interactions (foodwarning.json) and unverified local advisories.'
                : 'Informational lifestyle text — not verified medication findings.'}
            </p>
          </div>
        </div>
        <span className={hasVerified ? 'badge badge-moderate' : 'badge badge-neutral'}>
          {verifiedWarnings.length + unverifiedAll.length}
        </span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
        {hasVerified && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="notice notice-warn" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>✓</span>
              <span>
                <b>Verified FDA food-drug interactions</b> (source: foodwarning.json).
                These are separate from drug-drug interactions, contraindications, and duplicate therapy.
              </span>
            </div>
            {verifiedWarnings.map((w, i) => (
              <div key={w.id ?? i} className="notice" style={{ borderLeft: '3px solid var(--color-warning-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span className="badge badge-moderate" style={{ fontSize: '0.6rem' }}>
                    {w.id}
                  </span>
                  <span className="med-name" style={{ textTransform: 'capitalize' }}>
                    {w.medicine}
                  </span>
                  <span className="small muted">— {w.food}</span>
                </div>
                <p className="small" style={{ color: 'var(--text-body)', marginLeft: 28, marginBottom: 4 }}>
                  {w.warning}
                </p>
                <p className="small" style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: 28 }}>
                  Effect: {w.effect}
                </p>
              </div>
            ))}
          </div>
        )}

        {hasUnverified && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="notice notice-warn">
              <b>Unverified local advisory text.</b> Not derived from the verified medical database and not part of the
              safety result.
            </div>
            {unverifiedAll.map((w, i) => (
              <div key={i} className="notice" style={{ opacity: 0.85 }}>
                {w}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}