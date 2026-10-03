import { useEffect, useState } from 'react'
import { Activity, Globe, HeartPulse, Stethoscope, User, Sun, Moon } from 'lucide-react'
import { checkEngineHealth } from '../api'
import type { Language, ViewMode } from '../types'

interface Props {
  view: ViewMode
  setView: (v: ViewMode) => void
  language: Language
  setLanguage: (l: Language) => void
}

const roleOptions: { value: ViewMode; label: string; icon: typeof Stethoscope }[] = [
  { value: 'doctor', label: 'Doctor', icon: Stethoscope },
  { value: 'patient', label: 'Patient', icon: User },
]

const langOptions: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'gu', label: 'ગુજરાતી' },
]

export default function Header({ view, setView, language, setLanguage }: Props) {
  const [engineActive, setEngineActive] = useState<boolean | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pharmatech-theme') as 'light' | 'dark') || 'light'
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pharmatech-theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false
    const probe = async () => {
      const ok = await checkEngineHealth()
      if (!cancelled) setEngineActive(ok)
    }
    probe()
    const timer = setInterval(probe, 60000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  return (
    <header
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-base)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 12,
          paddingBottom: 12,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HeartPulse size={22} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1
                style={{
                  fontSize: '1.24rem',
                  fontWeight: 800,
                  color: 'var(--text-strong)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                MediGuard
              </h1>
              <span className="badge badge-info" style={{ fontSize: '0.62rem' }}>
                PharmaTech
              </span>
            </div>
            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.01em',
                marginTop: 2,
              }}
            >
              AI-Powered Prescription Safety &amp; Interaction Analyzer
            </p>
          </div>
        </div>

        {/* Global controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Current role */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px 4px 12px',
              border: '1px solid var(--border-base)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
            }}
          >
            <span className="eyebrow" style={{ fontSize: '0.62rem' }}>
              Role
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {roleOptions.map((opt) => {
                const Icon = opt.icon
                const active = view === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setView(opt.value)}
                    aria-pressed={active}
                    className={active ? 'btn btn-primary btn-sm' : 'btn btn-quiet btn-sm'}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--border-base)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              padding: '0 10px',
            }}
          >
            <Globe size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language"
              className="field"
              style={{
                padding: '7px 2px',
                border: 'none',
                background: 'transparent',
                fontSize: '0.82rem',
                fontWeight: 600,
                width: 'auto',
              }}
            >
              {langOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="btn btn-quiet btn-sm"
            style={{ padding: '6px 10px' }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span className="small" style={{ marginLeft: 4 }}>
              {theme === 'light' ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Engine status — reflects the real /health response */}
          <div
            title={
              engineActive === null
                ? 'Checking deterministic engine…'
                : engineActive
                  ? 'Deterministic engine responded OK'
                  : 'Deterministic engine unreachable'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              border: engineActive === false ? '1px solid var(--high-border)' : '1px solid var(--safe-border)',
              background: engineActive === false ? 'var(--high-soft)' : 'var(--safe-soft)',
              color: engineActive === false ? 'var(--high)' : 'var(--safe)',
              fontSize: '0.75rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {engineActive === null ? (
              <Activity size={11} className="spin" />
            ) : (
              <span
                aria-hidden
                style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }}
              />
            )}
            {engineActive === null ? 'Checking Engine' : engineActive ? 'Engine Active' : 'Engine Offline'}
          </div>
        </div>
      </div>
    </header>
  )
}
