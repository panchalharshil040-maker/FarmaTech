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

  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Stethoscope size={18} style={{ color: 'var(--brand)' }} />
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

      <div
        className="card-pad"
        style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <RiskGauge
          score={result.risk_score}
          riskLevel={result.risk_level}
          hasFindings={!noVerifiedMatch}
        />

        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="stat-grid">
            <div className="stat-box" style={{ background: riskSoftBg(result.risk_level), borderColor: 'transparent' }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>
                Risk score
              </div>
              <div className={`stat-value ${noVerifiedMatch ? '' : riskTextClass(result.risk_level)}`}>
                {result.risk_score}
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}> / 100</span>
              </div>
            </div>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 4 }}>
                Risk level
              </div>
              <div className={`stat-value ${noVerifiedMatch ? '' : riskTextClass(result.risk_level)}`} style={{ fontSize: '1.4rem' }}>
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

          <div className="stat-grid" style={{ marginTop: 12 }}>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Major risks
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={15} style={{ color: counts.major ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
                <span className="med-name">{counts.major}</span>
                <span className={counts.major ? 'badge badge-high' : 'badge badge-neutral'}>
                  {counts.major === 0 ? 'None' : 'Reported'}
                </span>
              </div>
            </div>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Moderate risks
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={15} style={{ color: counts.moderate ? 'var(--color-warning)' : 'var(--color-text-muted)' }} />
                <span className="med-name">{counts.moderate}</span>
                <span className={counts.moderate ? 'badge badge-moderate' : 'badge badge-neutral'}>
                  {counts.moderate === 0 ? 'None' : 'Reported'}
                </span>
              </div>
            </div>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Drug–drug interactions
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={15} style={{ color: groups.interaction.length ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
                <span className="med-name">{groups.interaction.length}</span>
              </div>
            </div>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Duplicate therapy
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Copy size={15} style={{ color: groups.duplicate.length ? 'var(--color-warning)' : 'var(--color-text-muted)' }} />
                <span className="med-name">{groups.duplicate.length}</span>
              </div>
            </div>
            <div className="stat-box">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Contraindications
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={15} style={{ color: groups.contraindication.length ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
                <span className="med-name">{groups.contraindication.length}</span>
              </div>
            </div>
          </div>
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