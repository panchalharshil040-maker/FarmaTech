import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  FlaskConical,
  HelpCircle,
  Info,
  Minus,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import { simulateMedicine, explainFindings } from '../api'
import type { ExplainResponse } from '../api'
import type { Finding, Language, PatientProfile, SimulateResponse, ViewMode } from '../types'

interface Props {
  medicines: string[]
  view: ViewMode
  language: Language
  patient?: PatientProfile
}

const SIMULATION_PRESETS = [
  'Warfarin',
  'Clopidogrel',
  'Rosuvastatin calcium',
  'Simvastatin',
  'Aspirin',
  'Ibuprofen',
  'Metformin',
  'Fluconazole',
]

/**
 * Display-only summary of the patient flags that were sent to /api/simulate.
 * These are the existing PatientProfile field names — no clinical meaning is
 * inferred here. The backend engine decides what each condition matches.
 */
function activePatientFlags(patient?: PatientProfile): string[] {
  if (!patient) return []
  const flags: string[] = [`Age group: ${patient.ageGroup}`]
  if (patient.isPregnant) flags.push('Pregnant / Lactating')
  if (patient.hasRenalImpairment) flags.push('Renal impairment')
  if (patient.hasLiverDisease) flags.push('Liver disease')
  if (patient.hasCardiacHistory) flags.push('Cardiac history')
  for (const a of patient.allergies) flags.push(`Allergy: ${a}`)
  return flags
}

// Severity styling — must match existing app palette exactly
const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; Icon: React.ElementType }> = {
  major: {
    color: 'var(--accent-rose)',
    bg: 'rgba(244, 63, 94, 0.10)',
    border: 'rgba(244, 63, 94, 0.35)',
    label: 'Critical / Major',
    Icon: AlertTriangle,
  },
  moderate: {
    color: 'var(--accent-amber)',
    bg: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.35)',
    label: 'Moderate',
    Icon: AlertCircle,
  },
  minor: {
    color: 'var(--accent-emerald)',
    bg: 'rgba(16, 185, 129, 0.10)',
    border: 'rgba(16, 185, 129, 0.35)',
    label: 'Minor',
    Icon: Info,
  },
  duplicate: {
    color: 'var(--accent-violet)',
    bg: 'rgba(139, 92, 246, 0.10)',
    border: 'rgba(139, 92, 246, 0.35)',
    label: 'Duplicate Therapy',
    Icon: Copy,
  },
  contraindication: {
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.10)',
    border: 'rgba(236, 72, 153, 0.35)',
    label: 'Contraindication',
    Icon: ShieldAlert,
  },
}

function FindingCard({ f, aiExplanation }: { f: Finding; aiExplanation?: string }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.minor
  const Icon = cfg.Icon

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header row — always visible */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Icon size={18} style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '1px 7px',
                borderRadius: '999px',
                background: 'rgba(0,0,0,0.35)',
                color: cfg.color,
                border: `1px solid ${cfg.border}`,
              }}
            >
              {cfg.label}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {f.drugs.join(' ↔ ')}
              {f.condition ? ` · ${f.condition}` : ''}
            </span>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            {f.explanation}
          </p>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded clinical details */}
      {expanded && (
        <div
          style={{
            padding: '0 14px 14px 42px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            borderTop: `1px solid ${cfg.border}`,
            paddingTop: '12px',
          }}
        >
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Mechanism:
            </span>
            <p style={{ fontSize: '0.81rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
              {f.mechanism}
            </p>
          </div>

          {f.watch && (
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Watch For:
              </span>
              <p style={{ fontSize: '0.81rem', color: '#fca5a5', marginTop: '4px', lineHeight: 1.4 }}>
                {f.watch}
              </p>
            </div>
          )}

          {f.recommendation && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                Clinical Guidance:
              </span>
              <p style={{ fontSize: '0.81rem', color: '#a5f3fc', marginTop: '4px', lineHeight: 1.4 }}>
                {f.recommendation}
              </p>
            </div>
          )}

          {/* AI explanation (optional) */}
          {aiExplanation && (
            <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-violet)', textTransform: 'uppercase' }}>
                AI Explanation (Groq):
              </span>
              <p style={{ fontSize: '0.81rem', color: '#ddd6fe', marginTop: '4px', lineHeight: 1.45, fontStyle: 'italic' }}>
                {aiExplanation}
              </p>
            </div>
          )}

          {/* Source metadata */}
          {f.source && typeof f.source === 'object' && (f.source as Record<string, string>).organization ? (
            <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ✅ Verified Source:
              </span>
              <p style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                {(f.source as Record<string, string>).organization}
                {(f.source as Record<string, string>).dataset
                  ? ` · ${(f.source as Record<string, string>).dataset}`
                  : ''}
                {(f.source as Record<string, string>).effectiveTime
                  ? ` · Effective: ${(f.source as Record<string, string>).effectiveTime}`
                  : ''}
              </p>
            </div>
          ) : (
            <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                Source metadata unavailable · rule stored in verified database
              </span>
            </div>
          )}

          {f.id && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>
                ID: {f.id} · verified_status: {f.verified_status ?? 'verified'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SimulatePanel({ medicines, view, language, patient }: Props) {
  const [newMed, setNewMed] = useState('')
  const [result, setResult] = useState<SimulateResponse | null>(null)
  const [runKey, setRunKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiExplain, setAiExplain] = useState<ExplainResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  // Identity of the exact inputs the visible result was produced from. The
  // proposed medicine is never written back into `medicines`, so any change to
  // the active list or the patient profile invalidates the shown comparison.
  const currentKey = JSON.stringify({ medicines, patient, view, language })
  const activeResult = runKey === currentKey ? result : null
  const existingFindings = activeResult?.before_findings ?? []

  const handleSimulate = async (medName?: string) => {
    const target = medName ?? newMed
    if (!target.trim() || medicines.length === 0) return
    setLoading(true)
    setError('')
    setResult(null)
    setRunKey(null)
    setAiExplain(null)
    setAiUnavailable(false)
    try {
      const data = await simulateMedicine(medicines, target.trim(), view, language, patient)
      setResult(data)
      setRunKey(JSON.stringify({ medicines, patient, view, language }))
      // Only call the explanation API when there are NEW verified findings.
      // Never ask Groq to explain an empty result.
      if (data.new_findings.length > 0) {
        setAiLoading(true)
        explainFindings(data.new_findings, view, language)
          .then((exp) => {
            if (exp) setAiExplain(exp)
            else setAiUnavailable(true)
          })
          .catch(() => setAiUnavailable(true))
          .finally(() => setAiLoading(false))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const isRiskIncrease = activeResult ? activeResult.delta > 0 : false
  const isRiskDecrease = activeResult ? activeResult.delta < 0 : false

  // Build lookup: findingId → AI explanation text
  const aiExplanationMap: Record<string, string> = {}
  if (aiExplain?.explanations) {
    for (const exp of aiExplain.explanations) {
      aiExplanationMap[exp.findingId] = exp.explanation
    }
  }

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.9), rgba(17, 24, 39, 0.95))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-violet)',
          }}
        >
          <FlaskConical size={20} color="white" />
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            What-If Prospective Medication Simulator
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Evaluate safety impact and delta risk score before co-prescribing a new drug
          </p>
        </div>
      </div>

      {/* Patient context actually sent to the backend engine for this run */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '4px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <UserCheck size={14} style={{ color: 'var(--accent-violet)' }} />
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Evaluating against patient conditions:
        </span>
        {activePatientFlags(patient).map((flag) => (
          <span
            key={flag}
            style={{
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              color: '#ddd6fe',
              fontSize: '0.7rem',
            }}
          >
            {flag}
          </span>
        ))}
        {!patient && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            No patient profile selected — condition rules are skipped.
          </span>
        )}
      </div>

      {medicines.length === 0 ? (
        <div
          style={{
            marginTop: '16px',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Please add at least one baseline medicine to the prescription list above before running a simulation.
          </p>
        </div>
      ) : (
        <>
          {/* Input row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', marginBottom: '14px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                className="input-field"
                placeholder="Enter prospective drug name to test (e.g. Warfarin, Fluconazole)..."
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSimulate()
                }}
                style={{ paddingLeft: '38px', height: '44px', fontSize: '0.88rem' }}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => handleSimulate()}
              disabled={loading || !newMed.trim()}
              style={{ padding: '0 20px', fontSize: '0.85rem', background: 'var(--gradient-main)' }}
            >
              {loading ? 'Simulating…' : 'Test Addition'}
            </button>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Test:</span>
            {SIMULATION_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setNewMed(p)
                  handleSimulate(p)
                }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  color: '#ddd6fe',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                + {p}
              </button>
            ))}
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fca5a5',
                fontSize: '0.82rem',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {/* Simulation Results */}
          {activeResult && (
            <div
              className="animate-fade-in"
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(0, 0, 0, 0.3)',
                border: isRiskIncrease
                  ? '1px solid rgba(244, 63, 94, 0.3)'
                  : '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              {/* Score row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '20px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                {/* Before */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Current Risk Score
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    {activeResult.before_score}
                  </div>
                </div>

                <ArrowRight size={24} style={{ color: 'var(--text-muted)' }} />

                {/* After */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Projected Risk Score
                  </div>
                  <div
                    style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      color: isRiskIncrease ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                    }}
                  >
                    {activeResult.after_score}
                  </div>
                </div>

                {/* Delta Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    background: isRiskIncrease ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: isRiskIncrease ? '1px solid var(--accent-rose)' : '1px solid var(--accent-emerald)',
                    color: isRiskIncrease ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {isRiskIncrease ? <TrendingUp size={18} /> : isRiskDecrease ? <TrendingDown size={18} /> : <Minus size={18} />}
                  {activeResult.delta !== 0 ? `${activeResult.delta > 0 ? '+' : ''}${activeResult.delta} Risk Delta` : '0 Delta'}
                </div>
              </div>

              {/* Pre-existing findings (before addition) */}
              {existingFindings.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Shield size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5f3fc' }}>
                      Existing Safety Findings Before Proposed Medicine ({existingFindings.length}):
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {existingFindings.map((nf, i) => (
                      <FindingCard key={nf.id ?? i} f={nf} />
                    ))}
                  </div>
                </div>
              )}

              {/* Newly Introduced Findings */}
              {activeResult.new_findings.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <AlertTriangle size={16} style={{ color: 'var(--accent-rose)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5' }}>
                      Newly Introduced Safety Findings ({activeResult.new_findings.length}):
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeResult.new_findings.map((nf, i) => (
                      <FindingCard
                        key={nf.id ?? i}
                        f={nf}
                        aiExplanation={nf.id ? aiExplanationMap[nf.id] : undefined}
                      />
                    ))}
                  </div>

                      {(aiLoading || aiExplain || aiUnavailable) && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.05))',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Sparkles size={16} style={{ color: 'var(--accent-violet)' }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-violet)' }}>
                          {aiExplain?.ai_used
                            ? 'AI Explanation'
                            : aiUnavailable
                              ? 'Explanation (AI unavailable)'
                              : aiLoading
                                ? 'AI Explanation'
                                : 'Explanation (AI unavailable)'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            color: 'var(--accent-violet)',
                            fontWeight: 600,
                          }}
                        >
                          {aiExplain?.ai_used
                            ? 'POWERED BY GROQ · NOT A DIAGNOSIS'
                            : 'AI UNAVAILABLE · DETERMINISTIC TEXT · NOT A DIAGNOSIS'}
                        </span>
                      </div>

                      {aiLoading && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Generating AI explanation of verified findings…
                        </p>
                      )}

                      {aiExplain && !aiLoading && (
                        <>
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(245, 158, 11, 0.08)',
                              border: '1px solid rgba(245, 158, 11, 0.2)',
                              fontSize: '0.72rem',
                              color: '#fde68a',
                              marginBottom: '12px',
                            }}
                          >
                            ⚠️ The findings above come from verified FDA-sourced databases.{' '}
                            {aiExplain.ai_used
                              ? 'The text below is an AI-generated explanation of those findings — it does not introduce new medical facts.'
                              : 'The text below is deterministic database text, not an AI explanation.'}
                          </div>

                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                            {aiExplain.summary}
                          </p>

                      <p style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {aiExplain.disclaimer}
                          </p>
                        </>
                      )}

                      {aiUnavailable && !aiExplain && !aiLoading && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          AI explanation is not available at this time. Use the verified findings above to guide clinical review.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                  }}
                >
                  <HelpCircle size={16} />
                  <span>
                    No new verified finding in the database for this addition. This does not
                    guarantee compatibility — the database may not cover this medicine or pair.
                  </span>
                </div>
              )}

              {/* Disclaimer */}
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '14px', fontStyle: 'italic' }}>
                {activeResult.disclaimer}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
