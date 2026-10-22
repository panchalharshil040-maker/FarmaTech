import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
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

/** Client-side field errors. The server remains the authority on
 *  credentials — these only give immediate, field-local feedback. */
interface FieldErrors {
  email?: string
  password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const portalOptions: {
  role: AuthRole
  label: string
  desc: string
  icon: typeof Stethoscope
}[] = [
  {
    role: 'patient',
    label: 'Patient',
    desc: 'Review your medicines, allergies, and safety information.',
    icon: User,
  },
  {
    role: 'doctor',
    label: 'Clinician',
    desc: 'Review patient medication records and run safety checks.',
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
    desc: 'Bring medicines from different sources into one active-ingredient view.',
    icon: Pill,
  },
  {
    title: 'Evaluate',
    desc: 'Check the regimen against deterministic medication-safety rules.',
    icon: Activity,
  },
  {
    title: 'Review',
    desc: 'Present understandable findings, evidence, and recommendations for human review.',
    icon: ShieldCheck,
  },
]

/**
 * Authentication screen: brand panel + login/registration card.
 *
 * Identity and role are decided by the backend: this component only collects
 * credentials and hands the backend's response to the app shell. It never
 * stores a password and never infers a role from the form.
 *
 * All styling lives in ../auth.css under the .auth- prefix so nothing here
 * can reach the dashboard's layout.
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  /* Respect the saved dashboard theme so the transition after login is
     seamless. Header keeps the same value once mounted. */
  useEffect(() => {
    const saved = localStorage.getItem('pharmatech-theme')
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const clearFeedback = () => {
    setError('')
    setNotice('')
    setFieldErrors({})
  }

  const startPortal = (role: AuthRole, next: Mode) => {
    setSelectedRole(role)
    setMode(next)
    clearFeedback()
  }

  const goBack = () => {
    setMode('portal')
    clearFeedback()
    setPassword('')
    setShowPassword(false)
  }

  /** Field-local checks before calling the API. The server re-validates. */
  const validate = (forRegister: boolean): boolean => {
    const errs: FieldErrors = {}
    const trimmed = email.trim()
    if (!trimmed) errs.email = 'Enter your email address.'
    else if (!EMAIL_PATTERN.test(trimmed)) errs.email = 'Enter a valid email address.'
    if (!password) errs.password = 'Enter your password.'
    else if (forRegister && password.length < 8) {
      errs.password = 'Password must be at least 8 characters.'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(false)) return
    setBusy(true)
    clearFeedback()
    try {
      const user = await loginUser({ email: email.trim(), password })
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
    if (!validate(true)) return
    setBusy(true)
    clearFeedback()
    try {
      const user = await registerUser({
        email: email.trim(),
        password,
        role: selectedRole,
        full_name: fullName.trim() || undefined,
      })
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const busyLabel = (idle: string, active: string) => (
    <>
      {busy ? <Loader2 size={16} className="spin" aria-hidden /> : null}
      {busy ? active : idle}
    </>
  )

  return (
    <div className="auth-page">
      {/* ── Left: brand experience ─────────────────────────────── */}
      <section className="auth-brand-panel">
        <div className="auth-brand-top">
          <div className="auth-brand-lockup">
            <div className="auth-brand-mark">
              <HeartPulse size={24} aria-hidden />
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
            interaction checking, duplicate-ingredient detection and what-if
            simulation — with transparent, evidence-based safety findings.
          </p>

          <ul className="auth-features">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <li className="auth-feature" key={f.title}>
                  <span className="auth-feature-icon">
                    <Icon size={16} aria-hidden />
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
          <div className="auth-process" aria-hidden>
            <span className="auth-process-step">
              <span className="auth-process-num">1</span>
              Reconcile
            </span>
            <ChevronRight size={13} className="auth-process-arrow" />
            <span className="auth-process-step">
              <span className="auth-process-num">2</span>
              Evaluate
            </span>
            <ChevronRight size={13} className="auth-process-arrow" />
            <span className="auth-process-step">
              <span className="auth-process-num">3</span>
              Review
            </span>
          </div>
        </div>
      </section>

      {/* ── Right: authentication card ─────────────────────────── */}
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
                        <Icon size={20} aria-hidden />
                      </span>
                      <span className="auth-portal-body">
                        <span className="auth-portal-label">{p.label}</span>
                        <span className="auth-portal-desc">{p.desc}</span>
                      </span>
                      <ChevronRight size={17} className="auth-portal-chevron" aria-hidden />
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
                    clearFeedback()
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
                <ArrowLeft size={14} aria-hidden />
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
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <Mail size={15} aria-hidden />
                    </span>
                    <input
                      id="auth-email"
                      className="auth-input"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }))
                      }}
                      aria-invalid={fieldErrors.email ? true : undefined}
                      aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                      required
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="auth-field-error" id="auth-email-error">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-password">
                    Password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <Lock size={15} aria-hidden />
                    </span>
                    <input
                      id="auth-password"
                      className="auth-input auth-input-has-eye"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) {
                          setFieldErrors((f) => ({ ...f, password: undefined }))
                        }
                      }}
                      aria-invalid={fieldErrors.password ? true : undefined}
                      aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="auth-field-error" id="auth-password-error">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button className="auth-submit" type="submit" disabled={busy}>
                  {busyLabel('Sign in', 'Signing in…')}
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
                    clearFeedback()
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
                <ArrowLeft size={14} aria-hidden />
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
              <div className="auth-portals" role="group" aria-label="Choose account type">
                {portalOptions.map((p) => {
                  const Icon = p.icon
                  const active = selectedRole === p.role
                  return (
                    <button
                      key={p.role}
                      type="button"
                      className={active ? 'auth-portal-btn auth-portal-btn-active' : 'auth-portal-btn'}
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedRole(p.role)
                        clearFeedback()
                      }}
                    >
                      <span className="auth-portal-icon">
                        <Icon size={20} aria-hidden />
                      </span>
                      <span className="auth-portal-body">
                        <span className="auth-portal-label">{p.label}</span>
                        <span className="auth-portal-desc">{p.desc}</span>
                      </span>
                      {active ? (
                        <Check size={17} className="auth-portal-check" aria-hidden />
                      ) : (
                        <ChevronRight size={17} className="auth-portal-chevron" aria-hidden />
                      )}
                    </button>
                  )
                })}
              </div>

              <form className="auth-form" onSubmit={submitRegister} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-name">
                    Full name <span className="auth-label-optional">(optional)</span>
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <User size={15} aria-hidden />
                    </span>
                    <input
                      id="reg-name"
                      className="auth-input"
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
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <Mail size={15} aria-hidden />
                    </span>
                    <input
                      id="reg-email"
                      className="auth-input"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }))
                      }}
                      aria-invalid={fieldErrors.email ? true : undefined}
                      aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
                      required
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="auth-field-error" id="reg-email-error">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-password">
                    Password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <Lock size={15} aria-hidden />
                    </span>
                    <input
                      id="reg-password"
                      className="auth-input auth-input-has-eye"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) {
                          setFieldErrors((f) => ({ ...f, password: undefined }))
                        }
                      }}
                      aria-invalid={fieldErrors.password ? true : undefined}
                      aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="auth-field-error" id="reg-password-error">
                      {fieldErrors.password}
                    </p>
                  ) : null}
                </div>

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={busy || !selectedRole}
                >
                  <UserPlus size={16} aria-hidden />
                  {busyLabel('Create account', 'Creating account…')}
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
                    clearFeedback()
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
