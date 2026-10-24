import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  Utensils,
} from 'lucide-react'
import type { ExplainResponse } from '../api'
import { SEVERITY_LABEL, findingTitle } from '../lib/clinical'
import type { CheckResponse, PatientRecord, ViewMode } from '../types'
import AiExplanation from './AiExplanation'
import FoodAdvisory from './FoodAdvisory'
import RiskSummaryCard from './RiskSummaryCard'
import SafetyFindings from './SafetyFindings'

interface Props {
  record: PatientRecord
  view: ViewMode
  result: CheckResponse | null
  loading: boolean
  error: string
  onRun: () => void
  aiExplain: ExplainResponse | null
  aiLoading: boolean
  aiUnavailable: boolean
}

const CHECKS = ['Drug–Drug Interactions', 'Duplicate Therapy', 'Contraindications', 'Food Interactions']

/** Display-only badge mapping — severity always comes from the backend finding. */
function findingBadgeClass(severity: string): string {
  if (severity === 'major' || severity === 'contraindication') return 'badge badge-high'
  if (severity === 'moderate' || severity === 'duplicate') return 'badge badge-moderate'
  return 'badge badge-neutral'
}

export default function SafetyCheckPanel({
  record,
  view,
  result,
  loading,
  error,
  onRun,
  aiExplain,
  aiLoading,
  aiUnavailable,
}: Props) {
  const [showFullFood, setShowFullFood] = useState(false)

  const aiExplanations: Record<string, string> = {}
  if (aiExplain?.explanations) {
    for (const ex of aiExplain.explanations) aiExplanations[ex.findingId] = ex.explanation
  }

  const noMedicines = record.medicines.length === 0
  const findings = result?.findings ?? []
  const priority = findings.filter((f) => f.severity === 'major' || f.severity === 'contraindication')
  const foodWarnings = result?.food_warnings ?? []

  return (
    <section className="dd-safety" aria-label="Medication safety assessment">
      {error && <div className="notice notice-danger">{error}</div>}

      {/* The loading card only appears while a check is in flight with no
          result yet — once a result exists (even if the AI explanation is
          still generating) the re-run control and findings stay available. */}
      {loading && !result ? (
        <section className="card dd-cta" aria-live="polite">
          <div className="dd-cta-pad">
            <span className="dd-cta-icon dd-cta-icon--loading" aria-hidden>
              <Loader2 size={22} className="spin" />
            </span>
            <div className="dd-cta-copy">
              <h2 className="dd-cta-title">Checking the medication record…</h2>
              <p className="dd-cta-text">
                Running interaction, duplicate-therapy, contraindication and food checks against the
                verified databases for {record.medicines.length} medication
                {record.medicines.length === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="card dd-cta">
          <div className="dd-cta-pad">
            <span className="dd-cta-icon" aria-hidden>
              <ShieldCheck size={22} />
            </span>
            <div className="dd-cta-copy">
              <h2 className="dd-cta-title">
                {result ? 'Re-run medication safety check' : 'Run medication safety check'}
              </h2>
              <p className="dd-cta-text">
                {view === 'doctor'
                  ? `Analyze the patient${record.name ? `’s (${record.name})` : '’s'} active medication record for verified:`
                  : 'Analyze your active medication record for verified:'}
              </p>
              <ul className="dd-cta-tags">
                {CHECKS.map((c) => (
                  <li key={c} className="badge badge-info" style={{ textTransform: 'none' }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="dd-cta-action">
              <button
                type="button"
                className="btn btn-primary btn-lg dd-cta-btn"
                onClick={onRun}
                disabled={noMedicines}
              >
                <ShieldCheck size={18} />
                {result
                  ? 'Re-run check'
                  : view === 'doctor'
                  ? 'Run safety check'
                  : 'Analyze my safety'}
              </button>
              <p className="dd-cta-count">
                {noMedicines
                  ? 'No medication in the active record — load a patient record or add a medicine first.'
                  : `Analysing ${record.medicines.length} medication${record.medicines.length === 1 ? '' : 's'} from the active patient record.`}
              </p>
            </div>
          </div>
        </section>
      )}

      {result && (
        <>
          <RiskSummaryCard result={result} view={view} />

          {priority.length > 0 && (
            <section className="card dd-priority" aria-label="Findings needing immediate attention">
              <div className="card-head dd-head">
                <div className="dd-head-copy">
                  <span className="dd-head-icon dd-head-icon--danger" aria-hidden>
                    <TriangleAlert size={18} />
                  </span>
                  <div>
                    <h2 className="card-title">Needs immediate attention</h2>
                    <p className="card-sub">
                      Major and contraindicated findings from the verified engine for this record.
                    </p>
                  </div>
                </div>
                <span className="badge badge-high">
                  {priority.length} major
                </span>
              </div>
              <div className="card-pad dd-priority-list">
                {priority.map((f, i) => (
                  <article key={f.id ?? `${f.severity}-${i}`} className="dd-priority-item">
                    <span className={findingBadgeClass(f.severity)}>
                      {SEVERITY_LABEL[f.severity] ?? f.severity}
                    </span>
                    <div className="dd-priority-body">
                      <p className="med-name dd-priority-title">{findingTitle(f)}</p>
                      <p className="dd-priority-mech">{f.mechanism}</p>
                      {f.recommendation && (
                        <p className="dd-priority-next">
                          <b>Recommended action:</b> {f.recommendation}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <SafetyFindings findings={result.findings} aiExplanations={aiExplanations} />

          <AiExplanation explain={aiExplain} loading={aiLoading} unavailable={aiUnavailable} />

          {foodWarnings.length > 0 && (
            <section className="card">
              <div className="card-head dd-head">
                <div className="dd-head-copy">
                  <span className="dd-head-icon" aria-hidden>
                    <Utensils size={18} />
                  </span>
                  <div>
                    <h2 className="card-title">Food &amp; dietary information</h2>
                    <p className="card-sub">
                      Food–drug interactions for this record. Verified entries come from the backend;
                      unverified advisories are labelled.
                    </p>
                  </div>
                </div>
                <span className="badge badge-moderate">
                  {foodWarnings.length} {foodWarnings.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <div className="card-pad dd-food-list">
                {foodWarnings.map((w) => {
                  const verified = w.verified_status !== 'unverified'
                  return (
                    <article key={w.id} className="dd-food-item">
                      <div className="dd-food-head">
                        <span className="med-name dd-food-med">{w.medicine}</span>
                        <span className="dd-food-with">
                          with <b>{w.food}</b>
                        </span>
                        <span className={verified ? 'badge badge-moderate' : 'badge badge-neutral'}>
                          {verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <p className="dd-food-warn">{w.warning}</p>
                    </article>
                  )
                })}
                <button
                  type="button"
                  className="btn btn-secondary dd-disclosure"
                  onClick={() => setShowFullFood((v) => !v)}
                  aria-expanded={showFullFood}
                >
                  {showFullFood ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showFullFood
                    ? 'Hide full food guidance'
                    : 'View full food guidance (sources, effects)'}
                </button>
              </div>
            </section>
          )}
          {showFullFood && <FoodAdvisory verifiedWarnings={result.food_warnings} />}

          <p className="med-field dd-disclaimer">{result.disclaimer}</p>
        </>
      )}
    </section>
  )
}
