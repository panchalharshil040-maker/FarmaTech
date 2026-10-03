import { ShieldCheck } from 'lucide-react'

export function FooterDisclaimer() {
  return (
    <p className="small" style={{ color: 'var(--text-muted)' }}>
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
        borderTop: '1px solid var(--border-base)',
        background: 'var(--bg-surface)',
        padding: '20px 0',
      }}
    >
      <div className="container" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-strong)' }}>
          MediGuard by PharmaTech — Clinical Decision Support &amp; Patient Safety
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Decision support only. Not a substitute for a doctor&rsquo;s or pharmacist&rsquo;s clinical judgment.
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Simulation only. Final medication decisions remain with the doctor/pharmacist.
        </p>
        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6 }}>
          Safety findings are produced only by the deterministic medication-safety engine and verified
          databases. The AI explanation layer does not create or modify them.
        </p>
      </div>
    </footer>
  )
}
