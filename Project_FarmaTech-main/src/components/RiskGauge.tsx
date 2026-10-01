import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react'
import type { RiskLevel } from '../types'

interface Props {
  score: number
  riskLevel: RiskLevel
}

export default function RiskGauge({ score, riskLevel }: Props) {
  // Radial gauge computation (semi-circle 180 degrees)
  const radius = 70
  const circumference = Math.PI * radius
  const clampedScore = Math.min(100, Math.max(0, score))
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  const isHigh = riskLevel === 'high' || clampedScore >= 60
  const isModerate = (riskLevel === 'moderate' || clampedScore >= 20) && !isHigh

  const statusColor = isHigh ? '#f43f5e' : isModerate ? '#f59e0b' : '#10b981'
  const statusGlow = isHigh ? 'rgba(244, 63, 94, 0.3)' : isModerate ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'
  const statusLabel = isHigh ? 'High Risk' : isModerate ? 'Moderate Risk' : 'Low Risk'
  const StatusIcon = isHigh ? ShieldAlert : isModerate ? AlertTriangle : ShieldCheck

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', width: '200px', height: '120px', display: 'flex', justifyContent: 'center' }}>
        <svg width="200" height="120" viewBox="0 0 200 120">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Arc */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Dynamic Progress Arc */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        {/* Center Score Text */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '2.8rem',
              fontWeight: 800,
              lineHeight: 1,
              color: statusColor,
              textShadow: `0 0 24px ${statusGlow}`,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {clampedScore}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
            Risk Index / 100
          </span>
        </div>
      </div>

      {/* Risk Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '12px',
          padding: '6px 18px',
          borderRadius: '999px',
          background: `rgba(${isHigh ? '244, 63, 94' : isModerate ? '245, 158, 11' : '16, 185, 129'}, 0.12)`,
          border: `1px solid ${statusColor}`,
          color: statusColor,
          fontWeight: 700,
          fontSize: '0.85rem',
          boxShadow: `0 0 16px ${statusGlow}`,
        }}
      >
        <StatusIcon size={16} />
        {statusLabel}
      </div>
    </div>
  )
}
