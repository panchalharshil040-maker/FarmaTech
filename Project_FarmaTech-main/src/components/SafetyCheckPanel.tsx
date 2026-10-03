import { Loader2, ShieldCheck } from 'lucide-react'
import type { ExplainResponse } from '../api'
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
  const aiExplanations: Record<string, string> = {}
  if (aiExplain?.explanations) {
    for (const ex of aiExplain.explanations) aiExplanations[ex.findingId] = ex.explanation
  }

  const noMedicines = record.medicines.length === 0

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="card">
        <div className="card-pad" style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            <h2 className="card-title" style={{ fontSize: '1.02rem' }}>
              {view === 'doctor' ? 'Analyze Patient Medication Safety' : 'Check My Medication Safety'}
            </h2>
            <p className="small muted" style={{ lineHeight: 1.55 }}>
              {view === 'doctor'
                ? `Analyze the patient${record.name ? `’s (${record.name})` : '’s'} active medication record for verified:`
                : 'Analyze your active medication record for verified:'}
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {CHECKS.map((c) => (
                <li key={c} className="badge badge-info" style={{ textTransform: 'none', fontSize: '0.74rem' }}>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onRun}
            disabled={loading || noMedicines}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
            {loading ? 'Analyzing…' : view === 'doctor' ? 'Analyze Patient Medication Safety' : 'Analyze My Medication Safety'}
          </button>

          <p className="med-field">
            {noMedicines
              ? 'No medication in the active record — load a patient record or add a medicine first.'
              : `Analysing ${record.medicines.length} medication${record.medicines.length === 1 ? '' : 's'} from the active patient record.`}
          </p>
        </div>
      </section>

      {error && <div className="notice notice-danger">{error}</div>}

      {result && (
        <>
          <RiskSummaryCard result={result} view={view} />

          {(result.food_warnings && result.food_warnings.length > 0) && (
            <FoodAdvisory verifiedWarnings={result.food_warnings} />
          )}

          <SafetyFindings findings={result.findings} aiExplanations={aiExplanations} />

          <AiExplanation explain={aiExplain} loading={aiLoading} unavailable={aiUnavailable} />

          <p className="med-field" style={{ fontStyle: 'italic', textAlign: 'center' }}>
            {result.disclaimer}
          </p>
        </>
      )}
    </div>
  )
}