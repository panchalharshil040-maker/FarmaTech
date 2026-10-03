import { Sparkles } from 'lucide-react'
import type { ExplainResponse } from '../api'

interface Props {
  explain: ExplainResponse | null
  loading?: boolean
  unavailable?: boolean
}

/**
 * AI EXPLANATION — POWERED BY GROQ · NOT A DIAGNOSIS.
 *
 * Groq only restates findings that the deterministic engine already produced.
 * It never creates a finding, changes a severity, changes a risk score or
 * prescribes anything. When Groq is unavailable the backend returns its
 * deterministic fallback text and `ai_used` is false, which is labelled as such.
 */
export default function AiExplanation({ explain, loading, unavailable }: Props) {
  if (!loading && !explain && !unavailable) return null
  const aiUsed = explain?.ai_used === true

  return (
    <section className="card" style={{ borderColor: 'var(--color-info-border)' }}>
      <div className="card-head" style={{ background: 'var(--color-brand-soft)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <Sparkles size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <h2 className="card-title">AI Explanation — Plain-Language Summary</h2>
            <p className="card-sub">
              {aiUsed ? 'Powered by Groq' : 'Deterministic fallback text (AI provider unavailable)'}
            </p>
          </div>
        </div>
        <span className={aiUsed ? 'badge badge-info' : 'badge badge-neutral'}>
          {aiUsed ? 'Powered by Groq · Not a diagnosis' : 'AI unavailable · Not a diagnosis'}
        </span>
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
        <div className="notice notice-warn">
          The verified findings above come from the deterministic medication-safety engine. The text below
          only restates them — it does not introduce new medical facts, change a severity or risk score, or
          prescribe treatment.
        </div>

        {loading && <p className="small muted">Generating plain-language explanation of the verified findings…</p>}

        {explain && !loading && (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.55 }}>{explain.summary}</p>
            {explain.explanations.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {explain.explanations.map((ex, i) => (
                  <div key={`${ex.findingId}-${i}`} className="notice">
                    <div className="eyebrow mono" style={{ marginBottom: 3 }}>
                      {ex.findingId}
                    </div>
                    <p className="small" style={{ lineHeight: 1.55 }}>
                      {ex.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="med-field" style={{ fontStyle: 'italic' }}>
              {explain.disclaimer}
            </p>
          </>
        )}

        {unavailable && !explain && (
          <p className="small muted">
            AI explanation is not available right now. Use the verified database findings above for the
            clinical review.
          </p>
        )}
      </div>
    </section>
  )
}