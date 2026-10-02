import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
  Info,
  Pill,
  Shield,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import type { CheckResponse, ViewMode } from '../types'
import type { ExplainResponse } from '../api'
import FoodAdvisory from './FoodAdvisory'
import RiskGauge from './RiskGauge'

interface Props {
  data: CheckResponse
  view: ViewMode
  aiExplain?: ExplainResponse | null
  aiLoading?: boolean
}

const severityConfig = {
  major: {
    icon: AlertTriangle,
    color: 'var(--accent-rose)',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
    badgeClass: 'badge-major',
    label: 'Critical / Major Risk',
  },
  moderate: {
    icon: AlertCircle,
    color: 'var(--accent-amber)',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    badgeClass: 'badge-moderate',
    label: 'Moderate Precaution',
  },
  minor: {
    icon: Info,
    color: 'var(--accent-emerald)',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    badgeClass: 'badge-minor',
    label: 'Minor / Low Impact',
  },
  duplicate: {
    icon: Copy,
    color: 'var(--accent-violet)',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
    badgeClass: 'badge-duplicate',
    label: 'Duplicate Ingredient',
  },
  contraindication: {
    icon: ShieldAlert,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    border: 'rgba(236, 72, 153, 0.35)',
    badgeClass: 'badge-major',
    label: 'Patient Contraindication',
  },
  food: {
    icon: Info,
    color: 'var(--accent-amber)',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    badgeClass: 'badge-moderate',
    label: 'Food Advisory',
  },
}

export default function ResultsPanel({ data, view, aiExplain, aiLoading }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx)
  }

  const majorCount = data.findings.filter((f) => f.severity === 'major').length
  const moderateCount = data.findings.filter((f) => f.severity === 'moderate').length
  const duplicateCount = data.findings.filter((f) => f.severity === 'duplicate').length

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overview Dashboard Card */}
      <div
        className="glass-card"
        style={{
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.9), rgba(15, 23, 42, 0.9))',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', alignItems: 'center' }}>
          {/* Radial Risk Meter */}
          <RiskGauge score={data.risk_score} riskLevel={data.risk_level} hasFindings={data.findings.length > 0} />

          {/* Quick Stats & Clinical Summary */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Stethoscope size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {view === 'doctor' ? 'Clinical Safety Assessment' : 'Prescription Safety Summary'}
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              {data.findings.length === 0
                ? 'No matching verified finding was found in the current database. This does not guarantee safety — the checked medicines may not yet be covered.'
                : `Detected ${data.findings.length} safety finding${data.findings.length > 1 ? 's' : ''} requiring attention.`}
            </p>

            {/* Finding Counters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {majorCount > 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  ⚠️ {majorCount} Major Risk{majorCount > 1 ? 's' : ''}
                </div>
              )}
              {moderateCount > 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fde68a',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  ⚡ {moderateCount} Moderate
                </div>
              )}
              {duplicateCount > 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#ddd6fe',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  🔄 {duplicateCount} Duplicate
                </div>
              )}
              {data.findings.length === 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <HelpCircle size={14} /> No Verified Finding in Database
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Food & Dietary Advisory */}
      {data.food_warnings && data.food_warnings.length > 0 && (
        <FoodAdvisory warnings={data.food_warnings} />
      )}

      {/* Findings Breakdown */}
      {data.findings.length > 0 && (
        <div>
          <h4
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Shield size={18} style={{ color: 'var(--accent-cyan)' }} />
            Detailed Clinical Findings & Recommendations
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.findings.map((f, idx) => {
              const cfg = severityConfig[f.severity] ?? severityConfig.minor
              const Icon = cfg.icon
              const isExpanded = expandedIndex === idx

              return (
                <div
                  key={idx}
                  className="glass-card"
                  style={{
                    padding: '18px 20px',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${cfg.border}`,
                    background: cfg.bg,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Header Row */}
                  <div
                    onClick={() => toggleExpand(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: cfg.color,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: 'rgba(0,0,0,0.4)',
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                            {f.drugs.join(' ↔ ')}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                          {f.explanation}
                        </p>
                      </div>
                    </div>

                    <button
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {/* Expandable Clinical Details */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '14px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Pharmacological Mechanism:
                        </span>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
                          {f.mechanism}
                        </p>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Symptoms to Watch:
                        </span>
                        <p style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: '4px', lineHeight: 1.4 }}>
                          {f.watch}
                        </p>
                      </div>

                      {f.recommendation && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                            Clinical Guidance:
                          </span>
                          <p style={{ fontSize: '0.82rem', color: '#a5f3fc', marginTop: '4px', lineHeight: 1.4 }}>
                            {f.recommendation}
                          </p>
                        </div>
                      )}

                      {/* Source Metadata — from verified database */}
                      {f.source && typeof f.source === 'object' && (f.source as Record<string, string>).organization ? (
                        <div style={{ gridColumn: '1 / -1', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            ✅ Verified Database Source:
                          </span>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                            {(f.source as Record<string, string>).organization}
                            {(f.source as Record<string, string>).dataset ? ` · ${(f.source as Record<string, string>).dataset}` : ''}
                            {(f.source as Record<string, string>).effectiveTime ? ` · Effective: ${(f.source as Record<string, string>).effectiveTime}` : ''}
                          </p>
                        </div>
                      ) : (
                        <div style={{ gridColumn: '1 / -1', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Source metadata unavailable
                          </span>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                            This rule is stored in the verified database, but it carries no
                            citation record. No provenance has been inferred.
                          </p>
                        </div>
                      )}

                      {/* Finding ID */}
                      {f.id && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                            ID: {f.id} · verified_status: {f.verified_status ?? 'verified'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Resolved Active Ingredients Breakdown */}
      {data.resolved && data.resolved.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Pill size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resolved Active Pharmaceutical Ingredients (APIs):
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data.resolved.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                }}
              >
                <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{r.input}</strong>
                <span style={{ color: 'var(--text-muted)' }}> → {r.ingredients.join(' + ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unresolved Medicines Notice */}
      {data.unresolved && data.unresolved.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            fontSize: '0.82rem',
            color: '#fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <HelpCircle size={16} />
          <span>
            These medicines were not found in the verified database: <strong>{data.unresolved.join(', ')}</strong>.
            The check is incomplete for these entries — their interactions cannot be verified.
          </span>
        </div>
      )}

      {/* AI Explanation Section — labelled clearly, only shows if findings exist */}
      {(aiLoading || aiExplain) && (
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.05))',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-violet)' }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-violet)' }}>
              {aiExplain?.ai_used ? 'AI Explanation' : 'Explanation (AI unavailable)'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: 'var(--accent-violet)',
                fontWeight: 600,
              }}
            >
              {aiExplain?.ai_used
                ? 'POWERED BY GEMINI · NOT A DIAGNOSIS'
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
              {/* Important distinction notice */}
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: '0.72rem',
                  color: '#fde68a',
                  marginBottom: '14px',
                }}
              >
                ⚠️ The findings above come from verified FDA-sourced databases. {aiExplain.ai_used
                  ? 'The text below is an AI-generated explanation of those findings — it does not introduce new medical facts.'
                  : 'The text below is the deterministic database text, not an AI explanation — it does not introduce new medical facts.'}
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                {aiExplain.summary}
              </p>

              {aiExplain.explanations.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '4px' }}>
                    {ex.findingId}
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {ex.explanation}
                  </p>
                </div>
              ))}

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px', fontStyle: 'italic' }}>
                {aiExplain.disclaimer}
              </p>
            </>
          )}
        </div>
      )}

      {/* Regulatory Disclaimer */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.45,
          textAlign: 'center',
        }}
      >
        <span style={{ fontWeight: 600 }}>Clinical Decision Support Notice:</span> {data.disclaimer}
      </div>
    </div>
  )
}
