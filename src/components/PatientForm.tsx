import { AlertCircle, Baby, Heart, ShieldAlert, UserCheck } from 'lucide-react'
import type { PatientProfile } from '../types'

interface Props {
  patient: PatientProfile
  onChange: (p: PatientProfile) => void
}

export default function PatientForm({ patient, onChange }: Props) {
  const togglePregnant = () => onChange({ ...patient, isPregnant: !patient.isPregnant })
  const toggleRenal = () => onChange({ ...patient, hasRenalImpairment: !patient.hasRenalImpairment })
  const toggleLiver = () => onChange({ ...patient, hasLiverDisease: !patient.hasLiverDisease })
  const toggleCardiac = () => onChange({ ...patient, hasCardiacHistory: !patient.hasCardiacHistory })

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.8), rgba(20, 24, 38, 0.9))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={18} style={{ color: 'var(--accent-violet)' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Patient Physiological Profile
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            (Contextual Contraindication Engine)
          </span>
        </div>

        {/* Age Selector */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Age Group:</span>
          {(['pediatric', 'adult', 'elderly'] as const).map((group) => {
            const active = patient.ageGroup === group
            return (
              <button
                key={group}
                onClick={() => onChange({ ...patient, ageGroup: group })}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: active ? '1px solid var(--accent-violet)' : '1px solid var(--border-subtle)',
                  background: active ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: active ? 'var(--accent-violet)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {group}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {/* Pregnancy */}
        <button
          onClick={togglePregnant}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: patient.isPregnant ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
            background: patient.isPregnant ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            color: patient.isPregnant ? '#fca5a5' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <Baby size={18} style={{ color: patient.isPregnant ? 'var(--accent-rose)' : 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Pregnant / Lactating</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Category D/X checks</div>
          </div>
        </button>

        {/* Renal */}
        <button
          onClick={toggleRenal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: patient.hasRenalImpairment ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
            background: patient.hasRenalImpairment ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            color: patient.hasRenalImpairment ? '#fde68a' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <AlertCircle size={18} style={{ color: patient.hasRenalImpairment ? 'var(--accent-amber)' : 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Renal Impairment</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>NSAID/Lithium alert</div>
          </div>
        </button>

        {/* Liver */}
        <button
          onClick={toggleLiver}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: patient.hasLiverDisease ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
            background: patient.hasLiverDisease ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            color: patient.hasLiverDisease ? '#fde68a' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <ShieldAlert size={18} style={{ color: patient.hasLiverDisease ? 'var(--accent-amber)' : 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Hepatic Impairment</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Paracetamol/Statin alert</div>
          </div>
        </button>

        {/* Cardiac */}
        <button
          onClick={toggleCardiac}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: patient.hasCardiacHistory ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            background: patient.hasCardiacHistory ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            color: patient.hasCardiacHistory ? '#a5f3fc' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <Heart size={18} style={{ color: patient.hasCardiacHistory ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cardiac / Hypertension</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>QT/Blood pressure check</div>
          </div>
        </button>
      </div>
    </div>
  )
}
