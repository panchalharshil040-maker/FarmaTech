import { useEffect, useState } from 'react'
import { Activity, Globe, HeartPulse, LogOut, Stethoscope, User, Sun, Moon } from 'lucide-react'
import { checkEngineHealth } from '../api'
import type { Language, ViewMode } from '../types'

interface Props {
  view: ViewMode
  /** Role switching is locked to the backend-verified account; kept for API
   *  compatibility with the shell. The header renders the current role only. */
  setView?: (v: ViewMode) => void
  language: Language
  setLanguage: (l: Language) => void
  /** Optional: when provided, a sign-out control is rendered. App owns the
   *  actual logout flow (cookie invalidation + state reset). */
  onLogout?: () => void
}

const langOptions: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'gu', label: 'ગુજરાતી' },
]

export default function Header({ view, language, setLanguage, onLogout }: Props) {
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

  const RoleIcon = view === 'doctor' ? Stethoscope : User

  return (
    <header className="app-header">
      <div className="container app-header-inner">
        {/* Brand */}
        <div className="app-brand">
          <div className="app-brand-mark" aria-hidden>
            <HeartPulse size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="app-brand-row">
              <h1 className="app-brand-name">MediGuard</h1>
              <span className="app-brand-tag">PharmaTech</span>
            </div>
            <p className="app-brand-sub">Prescription Safety &amp; Interaction Analyzer</p>
          </div>
        </div>

        {/* Global controls */}
        <div className="app-controls">
          {/* Current role — locked to the backend-verified account */}
          <div
            className="app-pill"
            title="Your role comes from your signed-in account and cannot be switched here."
          >
            <span className="app-pill-label">Role</span>
            <RoleIcon size={14} aria-hidden />
            {view === 'doctor' ? 'Clinician' : 'Patient'}
          </div>

          {/* Language selector */}
          <div className="app-lang">
            <Globe size={14} aria-hidden />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language"
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
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span className="small" style={{ marginLeft: 4 }}>
              {theme === 'light' ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Sign out — only present when App supplies the handler */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-quiet btn-sm"
              title="Sign out of your account"
            >
              <LogOut size={16} />
              <span className="small" style={{ marginLeft: 4 }}>
                Sign out
              </span>
            </button>
          )}

          {/* Engine status — reflects the real /health response */}
          <div
            className={engineActive === false ? 'app-engine app-engine--down' : 'app-engine'}
            title={
              engineActive === null
                ? 'Checking deterministic engine…'
                : engineActive
                  ? 'Deterministic engine responded OK'
                  : 'Deterministic engine unreachable'
            }
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
