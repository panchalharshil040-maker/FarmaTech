import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  Pill,
  ShieldCheck,
  Stethoscope,
  User,
  UserPlus,
} from 'lucide-react'
import { loginUser, registerUser } from '../api'
import type { AuthRole, AuthUser } from '../api'
import '../auth.css'

interface Props {
  /** Called with the backend's account once login or registration succeeds. */
  onAuthenticated: (user: AuthUser) => void
}

type Mode = 'portal' | 'login' | 'register'

const portalOptions: {
  role: AuthRole
  label: string
  desc: string
  icon: typeof Stethoscope
}[] = [
  {
    role: 'patient',
    label: 'Patient',
    desc: 'Review your medications, allergies and verified safety information.',
    icon: User,
  },
  {
    role: 'doctor',
    label: 'Clinician',
    desc: 'Run safety checks and what-if simulations on a patient record.',
    icon: Stethoscope,
  },
]

const features: {
  title: string
  desc: string
  icon: typeof ShieldCheck
}[] = [
  {
    title: 'Reconcile',
    desc: 'Import a QR record or enter medicines once — the exact list is what the engine sees.',
    icon: Pill,
  },
  {
    title: 'Evaluate',
    desc: 'A deterministic engine produces every interaction, duplicate and food warning.',
    icon: Activity,
  },
  {
    title: 'Review',
    desc: 'Clear severity, mechanism and recommendation — never an invented finding.',
    icon: ShieldCheck,
  },
]

/**
 * Premium split-screen authentication screen.
 *
 * Identity and role are decided by the backend: this component only collects
 * credentials and hands the backend's response to the app shell. It never
 * stores a password and never infers a role from the form.
 *
 * All styling lives in ./auth.css under the .auth- prefix so nothing here can
 * reach the dashboard's layout.
 */
export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('portal')
  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  /* Respect the saved dashboard theme on the light panel so the transition
     after login is seamless. Header keeps the same value once mounted. */
  useEffect(() => {
    const saved = localStorage.getItem('pharmatech-theme')
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const startPortal = (role: AuthRole, next: Mode) => {
    setSelectedRole(role)
    setMode(next)
    setError('')
    setNotice('')
  }

  const goBack = () => {
    setMode('portal')
    setError('')
    setNotice('')
    setPassword('')
  }

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const user = await loginUser({ email, password })
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const user = await registerUser({
        email,
        password,
        role: selectedRole,
        full_name: fullName,
      })
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {/* ── Left: branding ─────────────────────────────────────── */}
      <section className="auth-brand-panel" aria-hidden="false">
        <div className="auth-brand-top">
          <div className="auth-brand-lockup">
            <div className="auth-brand-mark">
              <HeartPulse size={24} color="#ffffff" />
            </div>
            <div>
              <div className="auth-brand-name">MediGuard</div>
              <span className="auth-brand-tag">PharmaTech</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-mid">
          <h1 className="auth-headline">
            Every medicine.
            <br />
            <em>One safer picture.</em>
          </h1>
          <p className="auth-lede">
            A clinical decision support workspace for medication reconciliation,
            interaction checking and what-if simulation — powered by a
            deterministic safety engine that shows its reasoning.
          </p>

          <ul className="auth-features">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <li className="auth-feature" key={f.title}>
                  <span className="auth-feature-icon">
                    <Icon size={16} />
                  </span>
                  <span>
                    <span className="auth-feature-title">{f.title}</span>
                    <span className="auth-feature-desc">{f.desc}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="auth-brand-bottom">
          <div className="auth-process">
            <span className="auth-process-step">
              <span className="auth-process-num">1</span>
              Reconcile
            </span>
            <ArrowRight size={13} className="auth-process-arrow" />
            <span className="auth-process-step">
              <span className="auth-process-num">2</span>
              Evaluate
            </span>
            <ArrowRight size={13} className="auth-process-arrow" />
            <span className="auth-process-step">
              <span className="auth-process-num">3</span>
              Review
            </span>
          </div>
        </div>
      </section>

      {/* ── Right: authentication ──────────────────────────────── */}
      <section className="auth-form-panel">
        <div className="auth-card">
          {mode === 'portal' && (
            <>
              <span className="auth-card-eyebrow">Sign in</span>
              <h2 className="auth-card-title">Choose your portal</h2>
              <p className="auth-card-sub">
                Your role determines which workspace opens. It is confirmed by
                the server after you sign in — not by this selection alone.
              </p>

              <div className="auth-portals">
                {portalOptions.map((p) => {
                  const Icon = p.icon
                  return (
                    <button
                      key={p.role}
                      type="button"
                      className="auth-portal-btn"
                      onClick={() => startPortal(p.role, 'login')}
                    >
                      <span className="auth-portal-icon">
                        <Icon size={20} />
                      </span>
                      <span>
                        <span className="auth-portal-label">{p.label}</span>
                        <span className="auth-portal-desc">{p.desc}</span>
                      </span>
                      <ArrowRight size={17} className="auth-portal-chevron" />
                    </button>
                  )
                })}
              </div>

              <p className="auth-switch">
                New to MediGuard?{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setMode('register')
                    setError('')
                    setNotice('')
                  }}
                >
                  Create an account
                </button>
              </p>
            </>
          )}

          {mode === 'login' && (
            <>
              <button type="button" className="auth-back" onClick={goBack}>
                <ArrowLeft size={14} />
                All portals
              </button>
              <span className="auth-card-eyebrow">
                {selectedRole === 'doctor' ? 'Clinician sign-in' : 'Patient sign-in'}
              </span>
              <h2 className="auth-card-title">Welcome back</h2>
              <p className="auth-card-sub">
                Sign in with the email registered to your{' '}
                {selectedRole === 'doctor' ? 'clinician' : 'patient'} account.
              </p>

              <form className="auth-form" onSubmit={submitLogin} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-email">
                    Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="auth-email"
                      className="auth-input"
                      style={{ paddingLeft: 36 }}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-password">
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="auth-password"
                      className="auth-input"
                      style={{ paddingLeft: 36, paddingRight: 38 }}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button className="auth-submit" type="submit" disabled={busy}>
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              {notice && <div className="auth-success">{notice}</div>}

              <p className="auth-switch">
                No account yet?{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setMode('register')
                    setError('')
                  }}
                >
                  Create one
                </button>
              </p>
            </>
          )}

          {mode === 'register' && (
            <>
              <button type="button" className="auth-back" onClick={goBack}>
                <ArrowLeft size={14} />
                Back
              </button>
              <span className="auth-card-eyebrow">
                {selectedRole === 'doctor'
                  ? 'Clinician registration'
                  : selectedRole === 'patient'
                    ? 'Patient registration'
                    : 'Create account'}
              </span>
              <h2 className="auth-card-title">Create your account</h2>
              <p className="auth-card-sub">
                Choose a portal, then register with an email and a password of
                at least 8 characters.
              </p>

              {/* Role is re-confirmed here so registration never depends on a
                  hidden selection made on a previous screen. */}
              <div className="auth-portals" style={{ marginTop: 18 }}>
                {portalOptions.map((p) => {
                  const Icon = p.icon
                  const active = selectedRole === p.role
                  return (
                    <button
                      key={p.role}
                      type="button"
                      className="auth-portal-btn"
                      aria-pressed={active}
                      style={
                        active
                          ? {
                              borderColor: 'var(--color-brand)',
                              background: 'var(--color-brand-soft)',
                              boxShadow: '0 0 0 3px var(--color-focus-ring)',
                            }
                          : undefined
                      }
                      onClick={() => setSelectedRole(p.role)}
                    >
                      <span className="auth-portal-icon">
                        <Icon size={20} />
                      </span>
                      <span>
                        <span className="auth-portal-label">{p.label}</span>
                        <span className="auth-portal-desc">{p.desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <form className="auth-form" onSubmit={submitRegister} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-name">
                    Full name <span style={{ fontWeight: 500, textTransform: 'none' }}>(optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="reg-name"
                      className="auth-input"
                      style={{ paddingLeft: 36 }}
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. A. Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-email">
                    Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="reg-email"
                      className="auth-input"
                      style={{ paddingLeft: 36 }}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-password">
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="reg-password"
                      className="auth-input"
                      style={{ paddingLeft: 36, paddingRight: 38 }}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={busy || !selectedRole}
                >
                  <UserPlus size={16} />
                  {busy ? 'Creating account…' : 'Create account'}
                </button>
              </form>

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              {notice && <div className="auth-success">{notice}</div>}

              <p className="auth-switch">
                Already registered?{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
