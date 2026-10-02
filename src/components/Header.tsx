import { Globe, HeartPulse, Stethoscope, User } from 'lucide-react'
import type { Language, ViewMode } from '../types'

interface Props {
  view: ViewMode
  setView: (v: ViewMode) => void
  language: Language
  setLanguage: (l: Language) => void
}

const viewOptions: { value: ViewMode; label: string; icon: typeof Stethoscope }[] = [
  { value: 'doctor', label: 'Doctor View', icon: Stethoscope },
  { value: 'patient', label: 'Patient View', icon: User },
]

const langOptions: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'gu', label: 'ગુજરાતી' },
]

export default function Header({ view, setView, language, setLanguage }: Props) {
  return (
    <header
      style={{
        padding: '16px 0',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-cyan)',
            }}
          >
            <HeartPulse size={24} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  background: 'var(--gradient-main)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                FarmaTech
              </h1>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Clinical v2.4
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              AI-Powered Prescription Safety & Interaction Analyzer
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '3px',
            }}
          >
            {viewOptions.map((opt) => {
              const Icon = opt.icon
              const active = view === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setView(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: 'calc(var(--radius-md) - 3px)',
                    background: active ? 'var(--accent-cyan)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Language Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '0 10px',
            }}
          >
            <Globe size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              style={{
                padding: '8px 4px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {langOptions.map((l) => (
                <option key={l.value} value={l.value} style={{ background: '#111827', color: '#fff' }}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Live Engine Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '999px',
              color: 'var(--accent-emerald)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent-emerald)',
                boxShadow: '0 0 8px var(--accent-emerald)',
                display: 'inline-block',
              }}
            />
            Engine Active
          </div>
        </div>
      </div>
    </header>
  )
}
