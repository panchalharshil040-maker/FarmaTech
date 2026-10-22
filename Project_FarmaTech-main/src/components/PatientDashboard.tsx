import { useCallback, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleMinus,
  FileText,
  HeartPulse,
  Loader2,
  Pill,
  QrCode,
  ScanLine,
  ShieldCheck,
  User,
  UserPlus,
  Utensils,
} from 'lucide-react'
import type { ExplainResponse } from '../api'
import { RISK_LABEL, SEVERITY_LABEL, findingTitle, riskBadgeClass } from '../lib/clinical'
import { useMedicineViews } from '../lib/useMedicineViews'
import type { CheckResponse, Finding, PatientRecord } from '../types'
import AiExplanation from './AiExplanation'
import FoodAdvisory from './FoodAdvisory'
import MedicineSearch from './MedicineSearch'
import PatientContextForm from './PatientContextForm'
import PatientSummary from './PatientSummary'
import QRPanel from './QRPanel'
import QrImportPanel from './QrImportPanel'
import RecordSetupForm from './RecordSetupForm'
import RiskSummaryCard from './RiskSummaryCard'
import SafetyFindings from './SafetyFindings'

interface Props {
  record: PatientRecord | null
  /** Authenticated account name from the backend session — never invented. */
  patientName?: string
  loadedNotice: string
  onLoadRecord: (
    patch: Partial<PatientRecord>,
    notice?: string,
    loadedReport?: CheckResponse,
  ) => void
  onEditRecord: (patch: Partial<PatientRecord>) => void
  onClearRecord: () => void
  result: CheckResponse | null
  loading: boolean
  error: string
  onRunCheck: () => void
  aiExplain: ExplainResponse | null
  aiLoading: boolean
  aiUnavailable: boolean
}

const CHECK_SCOPE = ['Drug–Drug Interactions', 'Duplicate Therapy', 'Contraindications', 'Food Interactions']

/* Display-only ordering so the most important verified finding is seen first.
   Severity classification itself stays owned by the backend engine. */
const SEVERITY_RANK: Record<string, number> = {
  contraindication: 0,
  major: 1,
  moderate: 2,
  duplicate: 3,
  food: 4,
  minor: 5,
}

function findingRank(f: Finding): number {
  return SEVERITY_RANK[f.severity] ?? 9
}

/** Badge mapping identical to SafetyFindings — display only. */
function findingBadgeClass(severity: string): string {
  if (severity === 'major' || severity === 'contraindication') return 'badge badge-high'
  if (severity === 'moderate' || severity === 'duplicate') return 'badge badge-moderate'
  return 'badge badge-low'
}

/** Left-accent colour per severity — display only, never a new classification. */
function findingAccent(severity: string): string {
  if (severity === 'major' || severity === 'contraindication') return 'var(--color-health-error)'
  if (severity === 'moderate' || severity === 'duplicate') return 'var(--color-health-warning)'
  return 'var(--color-health-accent)'
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * PATIENT DASHBOARD — visual-first, read-only view of the patient's own
 * medication safety information. Clinician-only features (patient selection,
 * medication optimization, what-if simulation) are deliberately not present.
 *
 * Layout follows a five-second scan:
 *   1. Welcome            — who this is for
 *   2. Summary cards      — medicines · safety status · warnings · allergies
 *   3. Quick actions      — jump to the four most-used tools
 *   4. Medicine safety    — verified findings, most severe first, details on demand
 *   5. My medicines       — editable list with unresolved-name review
 *   6. Health information — compact facts, full form on demand
 *   7. Food guidance      — verified food-drug warnings at a glance
 *   8. QR pass + printable summary + disclaimer
 *
 * Every clinical value is produced by the deterministic backend; this file
 * only reorganises how those values are presented.
 */
export default function PatientDashboard({
  record,
  patientName,
  loadedNotice,
  onLoadRecord,
  onEditRecord,
  onClearRecord,
  result,
  loading,
  error,
  onRunCheck,
  aiExplain,
  aiLoading,
  aiUnavailable,
}: Props) {
  const [mode, setMode] = useState<'none' | 'scan' | 'manual'>('none')
  const [showAllMeds, setShowAllMeds] = useState(false)
  const [showInfoForm, setShowInfoForm] = useState(false)
  const [showFullSafety, setShowFullSafety] = useState(false)
  const [showFullFood, setShowFullFood] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  /* Hook must run before the no-record early return — an empty list is a no-op. */
  const medicineViews = useMedicineViews(record?.medicines ?? [], result)

  const firstName = (patientName ?? '').trim().split(/\s+/)[0] || ''

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
    el.focus({ preventScroll: true })
  }, [])

  const openQrAndScroll = useCallback(() => {
    setQrOpen(true)
    scrollToSection('pd-qr')
  }, [scrollToSection])

  const aiExplanations: Record<string, string> = {}
  if (aiExplain?.explanations) {
    for (const ex of aiExplain.explanations) aiExplanations[ex.findingId] = ex.explanation
  }

  const welcome = (
    <div className="pd-welcome">
      <span className="eyebrow dash-intro-eyebrow">Patient Dashboard</span>
      <h2 className="pd-welcome-title">Your Health Overview</h2>
      <p className="pd-lead">
        {firstName ? `Welcome, ${firstName}. ` : 'Welcome. '}
        A calm, quick look at your medicines and their verified safety information.
      </p>
    </div>
  )

  /* ── No record yet: compact onboarding ──────────────────────────────── */
  if (!record) {
    return (
      <div className="stack pd-root">
        {welcome}
        {loadedNotice && <div className="notice notice-safe">✓ {loadedNotice}</div>}

        <section className="card">
          <div className="card-pad pd-onboard">
            <span className="pd-empty-mark" aria-hidden>
              <HeartPulse size={26} />
            </span>
            <div className="pd-onboard-copy">
              <h2 className="card-title">Set up your medication record</h2>
              <p className="pd-lead">
                Scan the QR medication pass from your clinic, or enter the medicines from your
                prescription. Your verified safety information appears right after.
              </p>
            </div>
            <div className="pd-empty-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => setMode(mode === 'scan' ? 'none' : 'scan')}
                aria-expanded={mode === 'scan'}
              >
                <ScanLine size={18} /> Scan my QR pass
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => setMode(mode === 'manual' ? 'none' : 'manual')}
                aria-expanded={mode === 'manual'}
              >
                <UserPlus size={18} /> Enter my medicines
              </button>
            </div>
          </div>
        </section>

        {mode === 'scan' && (
          <QrImportPanel
            onLoaded={({ record: qr }) =>
              onLoadRecord(
                {
                  source: 'qr',
                  name: qr.name ?? '',
                  patientId: qr.patientId ?? '',
                  age: qr.age ?? '',
                  medicines: qr.medicines,
                  profile: { ...EMPTY_PROFILE, ...qr.profile, allergies: qr.allergies },
                },
                'Patient Record Loaded',
                qr,
              )
            }
          />
        )}

        {mode === 'manual' && (
          <RecordSetupForm
            title="My medication record"
            subtitle="Enter the medicines exactly as they appear on your prescription or discharge summary."
            defaultAgeGroup="adult"
            onCancel={() => setMode('none')}
            onCreate={(created) => onLoadRecord({ ...created, source: 'manual' }, 'Patient Record Loaded')}
          />
        )}

        <div className="notice notice-warn pd-disclaimer">
          <b>Decision support only.</b> Information is produced by a verified medication-safety engine.
          Not a substitute for a doctor&rsquo;s or pharmacist&rsquo;s clinical judgment.
        </div>
      </div>
    )
  }

  /* ── Record loaded: dashboard ───────────────────────────────────────── */
  const unresolved = result?.unresolved ?? []
  const findings = result?.findings ?? []
  const sortedFindings = [...findings].sort((a, b) => findingRank(a) - findingRank(b))
  const topFindings = sortedFindings.slice(0, 3)
  const importantCount = findings.filter((f) => f.severity === 'major' || f.severity === 'contraindication').length
  const foodWarnings = result?.food_warnings ?? []
  const verifiedFood = foodWarnings.filter((w) => w.verified_status !== 'unverified')
  const allergies = record.profile.allergies
  const conditionLabels = [
    record.profile.isPregnant && 'Pregnant / lactating',
    record.profile.hasRenalImpairment && 'Renal impairment',
    record.profile.hasLiverDisease && 'Liver disease',
    record.profile.hasCardiacHistory && 'Cardiac history',
  ].filter((t): t is string => Boolean(t))

  const medCount = record.medicines.length
  const detailedMeds = showAllMeds || medicineViews.length <= 5
  const visibleMeds = detailedMeds ? medicineViews : medicineViews.slice(0, 5)

  /* Safety status card — never shows a reassuring green state without a valid result. */
  let safetyCard: React.ReactNode
  if (loading) {
    safetyCard = (
      <article className="pd-stat pd-stat--info">
        <span className="pd-stat-icon pd-stat-icon--info" aria-hidden>
          <Loader2 size={20} className="spin" />
        </span>
        <div className="pd-stat-body">
          <p className="eyebrow pd-stat-label">Medicine safety</p>
          <p className="pd-stat-value">Checking…</p>
          <p className="pd-stat-sub">Analysing your medicines now.</p>
        </div>
      </article>
    )
  } else if (error) {
    safetyCard = (
      <article className="pd-stat pd-stat--danger">
        <span className="pd-stat-icon pd-stat-icon--danger" aria-hidden>
          <CircleAlert size={20} />
        </span>
        <div className="pd-stat-body">
          <p className="eyebrow pd-stat-label">Medicine safety</p>
          <p className="pd-stat-value">Check failed</p>
          <p className="pd-stat-sub">The check could not run. Try again below.</p>
        </div>
      </article>
    )
  } else if (result && findings.length > 0) {
    const tone =
      result.risk_level === 'high'
        ? 'pd-stat--danger'
        : result.risk_level === 'moderate' || result.risk_level === 'low' || result.risk_level === 'no_risk'
          ? 'pd-stat--warning'
          : ''
    safetyCard = (
      <article className={`pd-stat ${tone}`}>
        <span
          className={`pd-stat-icon ${tone === 'pd-stat--danger' ? 'pd-stat-icon--danger' : 'pd-stat-icon--warning'}`}
          aria-hidden
        >
          <ShieldCheck size={20} />
        </span>
        <div className="pd-stat-body">
          <p className="eyebrow pd-stat-label">Medicine safety</p>
          <p className="pd-stat-value">{RISK_LABEL[result.risk_level]}</p>
          <p className="pd-stat-sub">
            {findings.length} verified finding{findings.length === 1 ? '' : 's'} — review below.
          </p>
        </div>
      </article>
    )
  } else if (result) {
    safetyCard = (
      <article className="pd-stat">
        <span className="pd-stat-icon" aria-hidden>
          <ShieldCheck size={20} />
        </span>
        <div className="pd-stat-body">
          <p className="eyebrow pd-stat-label">Medicine safety</p>
          <p className="pd-stat-value">Checked · no findings</p>
          <p className="pd-stat-sub">
            The verified database returned no findings. This is not a safety guarantee.
          </p>
        </div>
      </article>
    )
  } else {
    safetyCard = (
      <article className="pd-stat">
        <span className="pd-stat-icon" aria-hidden>
          <ShieldCheck size={20} />
        </span>
        <div className="pd-stat-body">
          <p className="eyebrow pd-stat-label">Medicine safety</p>
          <p className="pd-stat-value">Not checked yet</p>
          <p className="pd-stat-sub">Run a check to see verified findings.</p>
        </div>
      </article>
    )
  }

  return (
    <div className="stack pd-root">
      {welcome}
      {loadedNotice && <div className="notice notice-safe">✓ {loadedNotice}</div>}

      {/* B — Health summary cards */}
      <section className="pd-summary-grid" aria-label="Health summary">
        <article className="pd-stat">
          <span className="pd-stat-icon" aria-hidden>
            <Pill size={20} />
          </span>
          <div className="pd-stat-body">
            <p className="eyebrow pd-stat-label">Current medicines</p>
            <p className="pd-stat-value">{medCount}</p>
            <p className="pd-stat-sub">
              {medCount === 0 ? 'Add your first medicine below.' : 'On your record'}
            </p>
          </div>
        </article>

        {safetyCard}

        <article className={result && importantCount > 0 ? 'pd-stat pd-stat--danger' : 'pd-stat'}>
          <span
            className={`pd-stat-icon ${result && importantCount > 0 ? 'pd-stat-icon--danger' : ''}`}
            aria-hidden
          >
            <AlertCircle size={20} />
          </span>
          <div className="pd-stat-body">
            <p className="eyebrow pd-stat-label">Important warnings</p>
            <p className="pd-stat-value">
              {!result ? 'Not checked yet' : importantCount > 0 ? `${importantCount}` : 'None returned'}
            </p>
            <p className="pd-stat-sub">
              {!result
                ? 'Appears after your first safety check.'
                : importantCount > 0
                  ? 'Major warnings to review below.'
                  : 'The last check returned no major warnings.'}
            </p>
          </div>
        </article>

        <article className={allergies.length > 0 ? 'pd-stat pd-stat--warning' : 'pd-stat'}>
          <span
            className={`pd-stat-icon ${allergies.length > 0 ? 'pd-stat-icon--warning' : ''}`}
            aria-hidden
          >
            <AlertCircle size={20} />
          </span>
          <div className="pd-stat-body">
            <p className="eyebrow pd-stat-label">Allergies</p>
            <p className="pd-stat-value">
              {allergies.length > 0 ? `${allergies.length} recorded` : 'None recorded'}
            </p>
            <p className="pd-stat-sub">
              {allergies.length > 0 ? allergies.join(', ') : 'Add allergies in your health information.'}
            </p>
          </div>
        </article>
      </section>

      {/* C — Quick actions */}
      <nav className="pd-actions" aria-label="Quick actions">
        <button type="button" className="btn pd-action-btn" onClick={() => scrollToSection('pd-safety')}>
          <span className="pd-action-icon" aria-hidden>
            <ShieldCheck size={20} />
          </span>
          <span className="pd-action-copy">
            <span className="pd-action-title">Check medicines</span>
            <span className="pd-action-sub">Run a verified safety check</span>
          </span>
        </button>
        <button type="button" className="btn pd-action-btn" onClick={() => scrollToSection('pd-medicines')}>
          <span className="pd-action-icon" aria-hidden>
            <Pill size={20} />
          </span>
          <span className="pd-action-copy">
            <span className="pd-action-title">My medicines</span>
            <span className="pd-action-sub">View or edit your list</span>
          </span>
        </button>
        <button type="button" className="btn pd-action-btn" onClick={openQrAndScroll}>
          <span className="pd-action-icon" aria-hidden>
            <QrCode size={20} />
          </span>
          <span className="pd-action-copy">
            <span className="pd-action-title">Patient QR</span>
            <span className="pd-action-sub">Open your QR pass</span>
          </span>
        </button>
        <button type="button" className="btn pd-action-btn" onClick={() => scrollToSection('pd-food')}>
          <span className="pd-action-icon" aria-hidden>
            <Utensils size={20} />
          </span>
          <span className="pd-action-copy">
            <span className="pd-action-title">Food guidance</span>
            <span className="pd-action-sub">Foods to be aware of</span>
          </span>
        </button>
      </nav>

      {/* D — Medicine safety summary */}
      <section id="pd-safety" className="card pd-section" tabIndex={-1} aria-labelledby="pd-safety-title">
        <div className="card-head">
          <div className="pd-head-copy">
            <span className="pd-head-icon" aria-hidden>
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 id="pd-safety-title" className="card-title">
                Medicine Safety
              </h2>
              <p className="card-sub">
                Verified findings from the medication-safety engine, most important first.
              </p>
            </div>
          </div>
          {result && (
            <span className={riskBadgeClass(result.risk_level)}>{RISK_LABEL[result.risk_level]}</span>
          )}
        </div>

        <div className="card-pad pd-safety-body">
          {loading && (
            <div className="pd-state-row">
              <Loader2 size={20} className="spin" aria-hidden />
              <p className="pd-lead">Checking your medicines against the verified database…</p>
            </div>
          )}

          {!loading && error && (
            <>
              <div className="notice notice-danger">{error}</div>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={onRunCheck}
                disabled={medCount === 0}
              >
                <ShieldCheck size={18} /> Try again
              </button>
            </>
          )}

          {!loading && !error && !result && (
            <>
              <p className="pd-lead">
                {medCount === 0
                  ? 'Add at least one medicine, then run a check to see verified interactions, duplicate therapies and contraindications.'
                  : `Check your ${medCount} medicine${medCount === 1 ? '' : 's'} for verified interactions, duplicate therapies and contraindications.`}
              </p>
              <ul className="pd-cta-tags">
                {CHECK_SCOPE.map((c) => (
                  <li key={c} className="badge badge-info" style={{ textTransform: 'none', fontSize: '0.78rem' }}>
                    {c}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-primary btn-lg pd-cta-btn"
                onClick={onRunCheck}
                disabled={medCount === 0}
              >
                <ShieldCheck size={18} />
                {medCount === 0 ? 'Add a medicine first' : 'Run safety check'}
              </button>
            </>
          )}

          {!loading && !error && result && (
            <>
              <div className="pd-risk-row">
                <span className="pd-risk-score">
                  Risk score <b>{result.risk_score}</b> / 100
                </span>
                <span className="badge badge-neutral">
                  {findings.length} verified finding{findings.length === 1 ? '' : 's'}
                </span>
              </div>

              {findings.length === 0 && (
                <div className="notice notice-warn">
                  <b>No verified finding returned for this regimen.</b> The verified database may not cover
                  these medicines. This is not a safety guarantee.
                </div>
              )}

              {topFindings.map((f, i) => (
                <article
                  key={f.id ?? `${f.severity}-${i}`}
                  className="pd-finding"
                  style={{ borderLeftColor: findingAccent(f.severity) }}
                >
                  <div className="pd-finding-head">
                    <span className={findingBadgeClass(f.severity)}>
                      {SEVERITY_LABEL[f.severity] ?? f.severity}
                    </span>
                    <span className="med-name pd-finding-title">{findingTitle(f)}</span>
                  </div>
                  <p className="pd-finding-mech">{f.mechanism}</p>
                  {f.recommendation && (
                    <p className="pd-finding-next">
                      <b>Next step:</b> {f.recommendation}
                    </p>
                  )}
                </article>
              ))}

              {findings.length > topFindings.length && !showFullSafety && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFullSafety(true)}
                >
                  View all {findings.length} findings <ChevronDown size={16} aria-hidden />
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowFullSafety((v) => !v)}
                aria-expanded={showFullSafety}
              >
                {showFullSafety ? (
                  <>
                    <ChevronUp size={16} /> Hide full safety report
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> View full safety report
                  </>
                )}
              </button>

              <p className="med-field pd-disclaimer-line">{result.disclaimer}</p>
            </>
          )}
        </div>
      </section>

      {showFullSafety && result && !loading && !error && (
        <>
          <RiskSummaryCard result={result} view="patient" />
          <SafetyFindings findings={result.findings} aiExplanations={aiExplanations} />
          <AiExplanation explain={aiExplain} loading={aiLoading} unavailable={aiUnavailable} />
        </>
      )}

      {/* E — My medicines */}
      <section id="pd-medicines" className="card pd-section" tabIndex={-1} aria-labelledby="pd-medicines-title">
        <div className="card-head">
          <div className="pd-head-copy">
            <span className="pd-head-icon" aria-hidden>
              <Pill size={18} />
            </span>
            <div>
              <h2 id="pd-medicines-title" className="card-title">
                My Medicines
              </h2>
              <p className="card-sub">
                Exactly as entered on your record. Ask your doctor or pharmacist before changing anything.
              </p>
            </div>
          </div>
          <span className="badge badge-neutral">{medCount}</span>
        </div>

        <div className="card-pad pd-meds">
          <MedicineSearch
            exclude={record.medicines}
            placeholder="Search the medicine on your prescription…"
            onSelect={(name) =>
              onEditRecord({
                medicines: record.medicines.some((m) => m.toLowerCase() === name.toLowerCase())
                  ? record.medicines
                  : [...record.medicines, name],
              })
            }
          />

          {medCount === 0 ? (
            <div className="pd-meds-empty">
              <Pill size={22} aria-hidden />
              <span>No medicines on your record yet. Search above to add the first one.</span>
            </div>
          ) : (
            <ul className="pd-med-list">
              {visibleMeds.map((m) => (
                <li key={m.recorded} className={m.resolved ? 'pd-med' : 'pd-med pd-med--review'}>
                  <div className="pd-med-main">
                    <Pill size={16} className="pd-med-icon" aria-hidden />
                    <div className="pd-med-body">
                      <div className="pd-med-title">
                        <span className="med-name">{m.recorded}</span>
                        {!m.resolved && (
                          <span className="badge badge-moderate">Not in verified database</span>
                        )}
                      </div>
                      {detailedMeds && (
                        <div className="pd-med-details">
                          <span>
                            <b>Generic</b>
                            {m.generic ?? 'Not recorded'}
                          </span>
                          <span>
                            <b>Active ingredient</b>
                            {m.ingredients.length > 0
                              ? m.ingredients.join(', ')
                              : 'Run a safety check to resolve'}
                          </span>
                          {m.strength && (
                            <span>
                              <b>Strength</b>
                              {m.strength}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pd-med-action">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() =>
                        onEditRecord({ medicines: record.medicines.filter((x) => x !== m.recorded) })
                      }
                    >
                      <CircleMinus size={14} /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!detailedMeds && !showAllMeds && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowAllMeds(true)}>
              View all {medCount} medicines <ChevronDown size={16} aria-hidden />
            </button>
          )}
          {detailedMeds && showAllMeds && medCount > 5 && (
            <button type="button" className="btn btn-quiet" onClick={() => setShowAllMeds(false)}>
              <ChevronUp size={16} /> Show fewer
            </button>
          )}

          {unresolved.length > 0 && (
            <div className="notice notice-warn" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CircleAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
              <span>
                Not found in the verified database: <b>{unresolved.join(', ')}</b>. These entries were not
                checked against interaction, duplicate-therapy or contraindication rules.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* F — Health information (compact summary, full form on demand) */}
      <section id="pd-info" className="card pd-section" tabIndex={-1} aria-labelledby="pd-info-title">
        <div className="card-head">
          <div className="pd-head-copy">
            <span className="pd-head-icon" aria-hidden>
              <User size={18} />
            </span>
            <div>
              <h2 id="pd-info-title" className="card-title">
                My Health Information
              </h2>
              <p className="card-sub">Your details, conditions and allergies used by the safety rules.</p>
            </div>
          </div>
          <div className="pd-head-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowInfoForm((v) => !v)}
              aria-expanded={showInfoForm}
            >
              {showInfoForm ? (
                <>
                  <ChevronUp size={14} /> Hide details
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> View &amp; edit details
                </>
              )}
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={onClearRecord}>
              Clear my record
            </button>
          </div>
        </div>

        <div className="card-pad pd-info-body">
          <dl className="pd-facts">
            <div className="pd-fact">
              <dt>Name</dt>
              <dd>{record.name || 'Not recorded'}</dd>
            </div>
            <div className="pd-fact">
              <dt>Record ID</dt>
              <dd>{record.patientId || '—'}</dd>
            </div>
            <div className="pd-fact">
              <dt>Age</dt>
              <dd>{record.age || record.profile.ageGroup}</dd>
            </div>
            <div className="pd-fact">
              <dt>Source</dt>
              <dd style={{ textTransform: 'capitalize' }}>{record.source}</dd>
            </div>
          </dl>

          <div className="pd-info-group">
            <div className="eyebrow">Medical conditions</div>
            <div className="pd-chips">
              {conditionLabels.length === 0 ? (
                <span className="badge badge-neutral" style={{ textTransform: 'none' }}>
                  None recorded
                </span>
              ) : (
                conditionLabels.map((c) => (
                  <span key={c} className="badge badge-info" style={{ textTransform: 'none' }}>
                    {c}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="pd-info-group">
            <div className="eyebrow">Allergies</div>
            <div className="pd-chips">
              {allergies.length === 0 ? (
                <span className="badge badge-neutral" style={{ textTransform: 'none' }}>
                  None recorded
                </span>
              ) : (
                allergies.map((a) => (
                  <span key={a} className="badge badge-moderate" style={{ textTransform: 'none' }}>
                    {a}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {showInfoForm && (
        <PatientContextForm
          profile={record.profile}
          onChange={(profile) => onEditRecord({ profile })}
          title="Edit health information"
          hint="These details are sent to the verified engine so the rules can be checked against your situation."
        />
      )}

      {/* G — Food guidance (summary first, full advisory on demand) */}
      <section id="pd-food" className="card pd-section" tabIndex={-1} aria-labelledby="pd-food-title">
        <div className="card-head">
          <div className="pd-head-copy">
            <span className="pd-head-icon" aria-hidden>
              <Utensils size={18} />
            </span>
            <div>
              <h2 id="pd-food-title" className="card-title">
                Food Guidance
              </h2>
              <p className="card-sub">Foods and drinks to be aware of with your current medicines.</p>
            </div>
          </div>
          {verifiedFood.length > 0 && (
            <span className="badge badge-moderate">{verifiedFood.length} verified</span>
          )}
        </div>

        <div className="card-pad pd-food-body">
          {!result && (
            <>
              <p className="pd-lead">Food guidance appears after your first medicine safety check.</p>
              <button type="button" className="btn btn-secondary" onClick={() => scrollToSection('pd-safety')}>
                <ShieldCheck size={16} /> Go to safety check
              </button>
            </>
          )}

          {result && verifiedFood.length === 0 && (
            <p className="pd-lead">
              No food warnings were returned for your medicines. This is not a guarantee — ask your
              pharmacist if you are unsure about a food or drink.
            </p>
          )}

          {verifiedFood.slice(0, showFullFood ? verifiedFood.length : 3).map((w, i) => (
            <div key={w.id ?? i} className="pd-food-item">
              <div className="pd-food-head">
                <span className="badge badge-moderate">Verified</span>
                <span className="med-name" style={{ textTransform: 'capitalize' }}>
                  {w.medicine}
                </span>
                <span className="pd-food-with">with {w.food}</span>
              </div>
              <p className="pd-food-warning">{w.warning}</p>
            </div>
          ))}

          {foodWarnings.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowFullFood((v) => !v)}
              aria-expanded={showFullFood}
            >
              {showFullFood ? (
                <>
                  <ChevronUp size={16} /> Hide full food guidance
                </>
              ) : (
                <>
                  <ChevronDown size={16} /> View full food guidance
                </>
              )}
            </button>
          )}
        </div>
      </section>

      {showFullFood && result && <FoodAdvisory verifiedWarnings={result.food_warnings} />}

      {/* H — QR pass entry point (workflow opens on demand) */}
      <section id="pd-qr" className="card pd-section" tabIndex={-1} aria-labelledby="pd-qr-title">
        <div className="card-head">
          <div className="pd-head-copy">
            <span className="pd-head-icon" aria-hidden>
              <QrCode size={18} />
            </span>
            <div>
              <h2 id="pd-qr-title" className="card-title">
                My QR Pass
              </h2>
              <p className="card-sub">
                Carry your medicines and allergies as a signed, scannable QR pass.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setQrOpen((v) => !v)}
            aria-expanded={qrOpen}
          >
            {qrOpen ? (
              <>
                <ChevronUp size={16} /> Hide QR pass
              </>
            ) : (
              <>
                <ChevronDown size={16} /> Open QR pass
              </>
            )}
          </button>
        </div>
        {!qrOpen && (
          <div className="card-pad">
            <p className="pd-lead">
              Generate a QR pass with your current record. Clinics scan it to load your medicines —
              only backend-validated tokens are ever accepted.
            </p>
          </div>
        )}
      </section>

      {qrOpen && <QRPanel record={record} />}

      {/* I — Printable summary on demand */}
      <section className="card pd-section">
        <div className="card-head">
          <div className="pd-head-copy">
            <span className="pd-head-icon" aria-hidden>
              <FileText size={18} />
            </span>
            <div>
              <h2 className="card-title">Printable Summary</h2>
              <p className="card-sub">A full report of your record and the latest check — print or save as PDF.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
          >
            {summaryOpen ? (
              <>
                <ChevronUp size={16} /> Hide summary
              </>
            ) : (
              <>
                <ChevronDown size={16} /> View summary
              </>
            )}
          </button>
        </div>
      </section>

      {summaryOpen && <PatientSummary record={record} result={result} />}

      <div className="notice notice-warn pd-disclaimer">
        <b>Decision support only.</b> Findings are produced by a verified medication-safety engine over
        clinical databases. Not a substitute for a doctor&rsquo;s or pharmacist&rsquo;s judgment. If you
        feel unwell or think something is wrong, contact your clinician.
      </div>
    </div>
  )
}

const EMPTY_PROFILE = {
  ageGroup: 'adult' as const,
  isPregnant: false,
  hasRenalImpairment: false,
  hasLiverDisease: false,
  hasCardiacHistory: false,
  allergies: [] as string[],
}
