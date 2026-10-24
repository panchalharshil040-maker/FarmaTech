import { ShieldCheck } from 'lucide-react'

export function FooterDisclaimer() {
  return (
    <p className="small" style={{ color: 'var(--color-health-text-2)' }}>
      <ShieldCheck size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
      Decision support only. Not a substitute for a doctor&rsquo;s or pharmacist&rsquo;s clinical judgment.
    </p>
  )
}

export function SimulationDisclaimer() {
  return (
    <div className="notice notice-warn" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>
          SIMULATION ONLY — no patient prescription or medication record has been changed.
        </div>
        <div>Medication decisions remain with the doctor/pharmacist.</div>
      </div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-health-border)',
        background: 'var(--color-health-surface)',
        padding: '12px 0',
      }}
    >
      <div className="container" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-health-text)', margin: 0 }}>
          FarmaTech — Medication Safety Decision Support
        </p>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--color-health-text-2)',
            margin: '3px 0 0',
            lineHeight: 1.45,
          }}
        >
          For clinical decision support only. Medication decisions remain with the doctor or pharmacist.
        </p>
      </div>
    </footer>
  )
}
