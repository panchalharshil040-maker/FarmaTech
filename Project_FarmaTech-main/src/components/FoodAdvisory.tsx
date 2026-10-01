import { Apple, Utensils } from 'lucide-react'

interface Props {
  warnings: string[]
}

export default function FoodAdvisory({ warnings }: Props) {
  if (!warnings || warnings.length === 0) return null

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(26, 31, 46, 0.8))',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Utensils size={18} style={{ color: 'var(--accent-amber)' }} />
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fef3c7' }}>
          Dietary & Lifestyle Advisories
        </h3>
        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', fontWeight: 600 }}>
          {warnings.length} Active
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {warnings.map((w, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
            }}
          >
            <Apple size={16} style={{ color: 'var(--accent-amber)', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.82rem', color: '#fde68a', lineHeight: 1.45, margin: 0 }}>
              {w}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
