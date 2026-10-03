import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, ShieldAlert, TriangleAlert, Database } from 'lucide-react'
import {
  CATEGORY_HINT,
  CATEGORY_TITLE,
  SEVERITY_LABEL,
  type FindingCategory,
  findingTitle,
  groupFindings,
  sourceLines,
} from '../lib/clinical'
import type { Finding } from '../types'

interface Props {
  findings: Finding[]
  /** Plain-language explanation from Groq, keyed by backend finding id. */
  aiExplanations?: Record<string, string>
  /** Compact rendering used inside comparison blocks. */
  compact?: boolean
}

const CATEGORY_ICON: Record<FindingCategory, typeof ShieldAlert> = {
  interaction: TriangleAlert,
  duplicate: Copy,
  contraindication: ShieldAlert,
  other: ShieldAlert,
}

function severityBadge(severity: string): string {
  if (severity === 'major' || severity === 'contraindication') return 'badge badge-high'
  if (severity === 'moderate') return 'badge badge-moderate'
  if (severity === 'duplicate') return 'badge badge-moderate'
  return 'badge badge-low'
}

/**
 * A single verified finding. Only fields returned by the backend are rendered —
 * mechanism, monitoring, evidence and source metadata come straight from the
 * deterministic engine's response.
 */
function FindingItem({
  finding,
  aiExplanation,
  compact,
  accent = 'var(--color-border-strong)',
  defaultOpen,
}: {
  finding: Finding
  aiExplanation?: string
  compact?: boolean
  accent?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? Boolean(compact))
  const sources = sourceLines(finding)

  return (
    <div
      className="card"
      style={{ borderLeft: `3px solid ${accent}`, boxShadow: 'none' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Collapse finding details' : 'Expand finding details'}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          width: '100%',
          padding: compact ? '11px 13px' : '13px 15px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span className={severityBadge(finding.severity)}>{SEVERITY_LABEL[finding.severity] ?? finding.severity}</span>
            <span className="med-name" style={{ textTransform: 'none' }}>
              {findingTitle(finding)}
            </span>
          </div>
          <p className="small" style={{ color: 'var(--text-body)', lineHeight: 1.45 }}>
            {finding.mechanism}
          </p>
        </div>
        <span style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 2 }} aria-hidden="true">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && (
        <div style={{ padding: compact ? '0 13px 12px' : '0 15px 14px', display: 'grid', gap: 12 }}>
          {finding.watch && (
            <div>
              <div className="eyebrow">Monitoring / watch for</div>
              <p className="small" style={{ color: 'var(--text-body)', marginTop: 3 }}>
                {finding.watch}
              </p>
            </div>
          )}
          {finding.recommendation && (
            <div>
              <div className="eyebrow" style={{ color: 'var(--color-brand)' }}>
                Clinical guidance from database
              </div>
              <p className="small" style={{ color: 'var(--color-text-secondary)', marginTop: 3 }}>
                {finding.recommendation}
              </p>
            </div>
          )}
          {finding.condition && (
            <div>
              <div className="eyebrow">Patient condition matched</div>
              <p className="small" style={{ color: 'var(--color-text-secondary)', marginTop: 3 }}>
                {finding.condition}
              </p>
            </div>
          )}

          {aiExplanation && (
            <div className="notice notice-info">
              <div className="eyebrow" style={{ color: 'var(--color-brand-text)', marginBottom: 3 }}>
                AI explanation · not a diagnosis
              </div>
              <p className="small" style={{ lineHeight: 1.5 }}>
                {aiExplanation}
              </p>
            </div>
          )}

          <div>
            <div className="verified-note" style={{ marginBottom: 4 }}>
              <Database size={12} /> Verified clinical database finding
            </div>
            {sources.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'grid', gap: 2 }}>
                {sources.map((line) => (
                  <li key={line} className="med-field">
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="med-field">
                No source metadata was returned by the backend for this rule. None has been inferred.
              </p>
            )}
            <p className="med-field" style={{ marginTop: 6 }}>
              This finding was generated from the deterministic medication-safety database and rules engine.
              The AI explanation layer does not create or modify the underlying safety result.
            </p>
            {finding.id && (
              <p className="med-field mono" style={{ marginTop: 4 }}>
                rule id: {finding.id} · status: {finding.verified_status ?? 'verified'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Findings rendered in three separate clinical categories — never merged. */
export default function SafetyFindings({ findings, aiExplanations = {}, compact }: Props) {
  if (findings.length === 0) return null
  const groups = groupFindings(findings)

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Safety Findings</h2>
          <p className="card-sub">
            {findings.length} verified finding{findings.length === 1 ? '' : 's'} returned by the deterministic
            engine, separated by clinical category.
          </p>
        </div>
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 18 }}>
        {(Object.keys(groups) as FindingCategory[])
          .filter((key) => groups[key].length > 0)
          .map((key) => {
            const Icon = CATEGORY_ICON[key]
            const items = groups[key]
            const categoryColor = key === 'interaction' ? 'var(--color-danger)' : key === 'duplicate' ? 'var(--color-warning)' : 'var(--color-danger)'
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <Icon size={16} style={{ color: categoryColor }} />
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {CATEGORY_TITLE[key]}
                  </h3>
                  <span className="badge badge-neutral">{items.length}</span>
                  <span className="med-field">{CATEGORY_HINT[key]}</span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {items.map((f, i) => (
                    <FindingItem
                      key={f.id ?? `${key}-${i}`}
                      finding={f}
                      aiExplanation={f.id ? aiExplanations[f.id] : undefined}
                      compact={compact}
                    />
                  ))}
                </div>
              </div>
            )
          })}
      </div>
    </section>
  )
}

interface FindingListProps {
  findings: Finding[]
  accent: string
  emptyText: string
}

/** Flat finding list used by the before/after comparison blocks. */
export function FindingList({ findings, accent, emptyText }: FindingListProps) {
  if (findings.length === 0) return <p className="small muted">{emptyText}</p>
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {findings.map((f, i) => (
        <FindingItem key={f.id ?? i} finding={f} compact accent={accent} />
      ))}
    </div>
  )
}