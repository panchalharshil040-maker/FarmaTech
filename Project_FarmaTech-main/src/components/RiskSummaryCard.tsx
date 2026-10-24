import { Copy, HelpCircle, ShieldAlert, Stethoscope } from 'lucide-react'
import { CATEGORY_TITLE, RISK_LABEL, countFindings, groupFindings, riskBadgeClass, riskSoftBg, riskTextClass } from '../lib/clinical'
import type { CheckResponse, ViewMode } from '../types'
import RiskGauge from './RiskGauge'

interface Props {
  result: CheckResponse
  view: ViewMode
}

/**
 * PRESCRIPTION SAFETY SUMMARY — every number here is the value the deterministic
 * backend returned for the analysed regimen. No value is computed in the client.
 */
export default function RiskSummaryCard({ result, view }: Props) {
  const counts = countFindings(result.findings)
  const groups = groupFindings(result.findings)
  const noVerifiedMatch = result.findings.length === 0

  const chips = [
    { label: 'Major', value: counts.major, tone: counts.major ? 'high' : 'none', Icon: ShieldAlert },
    { label: 'Moderate', value: counts.moderate, tone: counts.moderate ? 'moderate' : 'none', Icon: ShieldAlert },
    { label: 'Interactions', value: groups.interaction.length, tone: groups.interaction.length ? 'high' : 'none', Icon: ShieldAlert },
    { label: 'Duplicates', value: groups.duplicate.length, tone: groups.duplicate.length ? 'moderate' : 'none', Icon: Copy },
    { label: 'Contraindications', value: groups.contraindication.length, tone: groups.contraindication.length ? 'high' : 'none', Icon: ShieldAlert },
  ] as const

  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Stethoscope size={18} style={{ color: 'var(--color-health-teal)' }} />
          <div>
            <h2 className="card-title">Prescription Safety Summary</h2>
            <p className="card-sub">
              {view === 'doctor' ? 'Clinical safety assessment' : 'Your medication safety summary'} — values
              calculated by the deterministic medication-safety engine.
            </p>
          </div>
        </div>
        <span className={riskBadgeClass(result.risk_level)}>{RISK_LABEL[result.risk_level]}</span>
      </div>

      <div className="card-pad risk-summary-body">
        <RiskGauge
          score={result.risk_score}
          riskLevel={result.risk_level}
          hasFindings={!noVerifiedMatch}
        />

        <div className="risk-summary-main">
          <div className="stat-grid">
            <div
              className="stat-box"
              style={{ background: riskSoftBg(result.risk_level), borderColor: 'transparent' }}
            >
              <div className="eyebrow" style={{ marginBottom: 4 }}>
                Risk score
              </div>
              <div className={`stat-value ${noVerifiedMatch ? '' : riskTextClass(result.risk_level)}`}>
                {result.risk_score}
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-health-text-2)' }}>
                  {' '}
                  / 100
                </span>
              </div>
            </div>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 4 }}>
                Risk level
              </div>
              <div
                className={`stat-value ${noVerifiedMatch ? '' : riskTextClass(result.risk_level)}`}
                style={{ fontSize: '1.4rem' }}
              >
                {RISK_LABEL[result.risk_level]}
              </div>
            </div>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 4 }}>
                Verified findings
              </div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                {result.findings.length}
              </div>
            </div>
          </div>

          <ul className="pd-count-chips" aria-label="Findings by category">
            {chips.map(({ label, value, tone, Icon }) => (
              <li
                key={label}
                className={
                  tone === 'high'
                    ? 'pd-count-chip pd-count-chip--high'
                    : tone === 'moderate'
                      ? 'pd-count-chip pd-count-chip--moderate'
                      : 'pd-count-chip'
                }
              >
                <Icon size={13} aria-hidden />
                {label} <b>{value}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {noVerifiedMatch && (
        <div className="card-pad" style={{ paddingTop: 0 }}>
          <div className="notice notice-warn" style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <HelpCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <b>No verified finding returned for this regimen.</b> The engine produced no interaction,
              duplicate-therapy or contraindication rule for these medicines. This is not a safety guarantee —
              the verified database may not cover this medicine or this combination.
            </div>
          </div>
        </div>
      )}

      <div className="card-pad" style={{ paddingTop: 0 }}>
        <p className="med-field">
          Finding categories kept separate: {CATEGORY_TITLE.interaction} · {CATEGORY_TITLE.duplicate} ·{' '}
          {CATEGORY_TITLE.contraindication}
        </p>
      </div>
    </section>
  )
}
