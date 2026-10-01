import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FlaskConical,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { simulateMedicine } from '../api'
import type { Language, SimulateResponse, ViewMode } from '../types'

interface Props {
  medicines: string[]
  view: ViewMode
  language: Language
}

const SIMULATION_PRESETS = [
  'Ecosprin',
  'Combiflam',
  'Lipitor',
  'Ciplox',
  'Brufen',
  'Warfarin',
  'Pan 40',
]

export default function SimulatePanel({ medicines, view, language }: Props) {
  const [newMed, setNewMed] = useState('')
  const [result, setResult] = useState<SimulateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSimulate = async (medName?: string) => {
    const target = medName ?? newMed
    if (!target.trim() || medicines.length === 0) return
    setLoading(true)
    setError('')
    try {
      const data = await simulateMedicine(medicines, target.trim(), view, language)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const isRiskIncrease = result ? result.delta > 0 : false
  const isRiskDecrease = result ? result.delta < 0 : false

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
                placeholder="Enter prospective drug name to test (e.g. Ecosprin, Ciplox)..."
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
              {loading ? 'Simulating...' : 'Test Addition'}
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

          {/* Simulation Results Card */}
          {result && (
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
                    {result.before_score}
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
                    {result.after_score}
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
                  {result.delta > 0 ? `+${result.delta} Risk Delta` : result.delta < 0 ? `${result.delta} Risk Delta` : '0 Delta (No New Risk)'}
                </div>
              </div>

              {/* Newly Introduced Findings */}
              {result.new_findings.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <AlertTriangle size={16} style={{ color: 'var(--accent-rose)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5' }}>
                      Newly Introduced Interaction Warnings:
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.new_findings.map((nf, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <strong style={{ color: '#ffffff', textTransform: 'capitalize' }}>
                          {nf.drugs.join(' + ')} ({nf.severity.toUpperCase()}):
                        </strong>{' '}
                        <span style={{ color: '#fca5a5' }}>{nf.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: '#6ee7b7',
                    fontSize: '0.82rem',
                  }}
                >
                  <CheckCircle size={16} />
                  <span>Addition is pharmacologically compatible with zero new interactions detected.</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
