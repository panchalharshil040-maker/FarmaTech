import { HelpCircle } from 'lucide-react'
import { RISK_LABEL, riskBadgeClass, riskTextClass } from '../lib/clinical'
import type { RiskLevel } from '../types'

interface Props {
  score: number
  riskLevel: RiskLevel
  /** Whether the backend returned any verified finding for the analysed regimen. */
  hasFindings?: boolean
}

function strokeFor(level: RiskLevel): string {
  if (level === 'high') return '#dc2626'
  if (level === 'moderate') return '#d97706'
  return '#059669'
}

/** Flat, print-safe risk indicator. No glow, no gradient, no animation. */
export default function RiskGauge({ score, riskLevel, hasFindings = true }: Props) {
  const clamped = Math.min(100, Math.max(0, score))
  const radius = 70
  const circumference = Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const noVerifiedFinding = !hasFindings

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 190 }}>
      <div style={{ position: 'relative', width: 200, height: 118 }}>
        <svg width="200" height="118" viewBox="0 0 200 118" role="img" aria-label={`Risk index ${clamped} of 100`}>
          <path
            d="M 25 103 A 75 75 0 0 1 175 103"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 25 103 A 75 75 0 0 1 175 103"
            fill="none"
            stroke={noVerifiedFinding ? '#cbd5e1' : strokeFor(riskLevel)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 2,
            textAlign: 'center',
          }}
        >
          <div
            className={noVerifiedFinding ? 'stat-value' : `stat-value ${riskTextClass(riskLevel)}`}
            style={{ fontSize: '2.2rem' }}
          >
            {clamped}
          </div>
          <div className="eyebrow" style={{ fontSize: '0.62rem' }}>
            Risk Index / 100
          </div>
        </div>
      </div>

      {noVerifiedFinding ? (
        <div className="badge badge-neutral">
          <HelpCircle size={12} /> No verified finding returned
        </div>
      ) : (
        <div className={riskBadgeClass(riskLevel)}>
          {RISK_LABEL[riskLevel]} RISK
        </div>
      )}
    </div>
  )
}