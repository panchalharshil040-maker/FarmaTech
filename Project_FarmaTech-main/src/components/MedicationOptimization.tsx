import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Beaker,
  CircleMinus,
  CirclePlus,
  Equal,
  FlaskConical,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react'
import { compareRegimens } from '../api'
import { RISK_LABEL, deltaLabel, riskBadgeClass, riskTextClass } from '../lib/clinical'
import type { ChangeKind, PatientRecord, RegimenChange, RegimenComparison } from '../types'
import { FindingList } from './SafetyFindings'
import { SimulationDisclaimer } from './Footer'
import MedicineSearch from './MedicineSearch'

interface Props {
  record: PatientRecord
  language: 'en' | 'hi' | 'gu'
}

const CHANGE_BADGE: Record<ChangeKind, string> = {
  add: 'badge badge-info',
  remove: 'badge badge-moderate',
  replace: 'badge badge-info',
}

function changeText(c: RegimenChange): string {
  if (c.kind === 'add') return `Added: ${c.to}`
  if (c.kind === 'remove') return `Removed: ${c.from}`
  return `Replaced: ${c.from} → ${c.to}`
}

function SafetyBlock({
  title,
  score,
  level,
  findings,
  emptyLabel,
}: {
  title: string
  score: number | null
  level: RegimenComparison['currentLevel'] | null
  findings: number
  emptyLabel: string
}) {
  return (
    <div className="stat-box" style={{ padding: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {title}
      </div>
      <div className={`stat-value ${level && score !== null ? riskTextClass(level) : ''}`}>
        {score === null ? '—' : score}
        {score !== null && (
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}> / 100</span>
        )}
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {level ? <span className={riskBadgeClass(level)}>{RISK_LABEL[level]}</span> : <span className="badge badge-neutral">Not analysed</span>}
        <span className="badge badge-neutral">
          {findings} finding{findings === 1 ? '' : 's'}
        </span>
      </div>
      {findings === 0 && <p className="med-field" style={{ marginTop: 6 }}>{emptyLabel}</p>}
    </div>
  )
}

/**
 * MEDICATION OPTIMIZATION — safety simulation against the active patient's record.
 *
 * Every edit happens in a temporary proposed regimen held in local state; the
 * patient record in App state is never written to. The proposed regimen is
 * analysed by the existing deterministic backend (/api/check for both sides and
 * /api/simulate for an additive proposal) — no risk value is computed here.
 */
export default function MedicationOptimization({ record, language }: Props) {
  const recordKey = useMemo(() => JSON.stringify(record.medicines), [record.medicines])
  const [proposed, setProposed] = useState<string[]>(record.medicines)
  const [changes, setChanges] = useState<RegimenChange[]>([])
  const [replacing, setReplacing] = useState<string | null>(null)
  const [comparison, setComparison] = useState<RegimenComparison | null>(null)
  const [comparisonKey, setComparisonKey] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  // A new patient record always resets the simulation to the real regimen.
  useEffect(() => {
    setProposed(JSON.parse(recordKey) as string[])
    setChanges([])
    setComparison(null)
    setComparisonKey(null)
    setReplacing(null)
    setError('')
  }, [recordKey])

  const modified = changes.length > 0
  // A comparison is only valid for the exact regimen + context it was run against.
  const runKey = useMemo(
    () => JSON.stringify({ medicines: record.medicines, proposed, profile: record.profile }),
    [record.medicines, proposed, record.profile],
  )
  const activeComparison = comparisonKey === runKey ? comparison : null
  const stale = Boolean(comparison) && comparisonKey !== runKey

  const addMedicine = useCallback((name: string) => {
    let added = false
    setProposed((prev) => {
      if (prev.some((m) => m.toLowerCase() === name.toLowerCase())) return prev
      added = true
      return [...prev, name]
    })
    setChanges((prev) => (added ? [...prev, { kind: 'add', to: name }] : prev))
  }, [])

  const removeMedicine = useCallback((name: string) => {
    setProposed((prev) => prev.filter((m) => m !== name))
    setChanges((prev) => [...prev, { kind: 'remove', from: name }])
  }, [])

  const replaceMedicine = useCallback((from: string, to: string) => {
    setProposed((prev) => prev.flatMap((m) => (m === from ? [to] : [m])))
    setChanges((prev) => [...prev, { kind: 'replace', from, to }])
    setReplacing(null)
  }, [])

  const reset = useCallback(() => {
    setProposed(JSON.parse(recordKey) as string[])
    setChanges([])
    setComparison(null)
    setComparisonKey(null)
    setReplacing(null)
    setError('')
  }, [recordKey])

  const runSimulation = async () => {
    setRunning(true)
    setError('')
    try {
      const result = await compareRegimens(record.medicines, proposed, 'doctor', language, record.profile)
      setComparison(result)
      setComparisonKey(runKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
      setComparison(null)
      setComparisonKey(null)
    } finally {
      setRunning(false)
    }
  }

  const delta = activeComparison?.delta ?? null
  const deltaTone = delta === null ? 'badge badge-neutral' : delta > 0 ? 'badge badge-high' : delta < 0 ? 'badge badge-low' : 'badge badge-neutral'
  const DeltaIcon = delta === null || delta === 0 ? Equal : delta > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <FlaskConical size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <h2 className="card-title">Medication Optimization</h2>
            <p className="card-sub">
              Test medication changes against this patient&rsquo;s current regimen before making a clinical
              decision.
            </p>
          </div>
        </div>
        {modified ? <span className="badge badge-info">Proposed regimen</span> : <span className="badge badge-neutral">Unchanged regimen</span>}
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 14 }}>
        <SimulationDisclaimer />

        {/* Regimen editor */}
        <div
          className="card"
          style={{ boxShadow: 'none', background: modified ? 'var(--brand-soft)' : 'var(--bg-surface)' }}
        >
          <div className="card-head" style={{ background: 'transparent', borderRadius: 0 }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '0.88rem' }}>
                {modified ? 'Proposed Regimen — Simulation Only' : 'Current Patient Regimen'}
              </h3>
              <p className="card-sub">
                {modified
                  ? 'Temporary regimen under review. The original patient record is unchanged.'
                  : `${record.medicines.length} medication${record.medicines.length === 1 ? '' : 's'} in the active patient record.`}
              </p>
            </div>
            <button type="button" className="btn btn-quiet btn-sm" onClick={reset} disabled={!modified && !comparison}>
              <RotateCcw size={14} /> Reset Simulation
            </button>
          </div>

          <div className="card-pad" style={{ display: 'grid', gap: 8, paddingTop: 12 }}>
            {proposed.length === 0 ? (
              <div className="notice notice-warn">
                The proposed regimen is empty. The deterministic engine still analyses it and will report the
                findings it resolves, but an empty regimen is never proof that a medicine is safe to stop.
              </div>
            ) : (
              proposed.map((med) => {
                const original = record.medicines.includes(med)
                return (
                  <div key={med} className="data-row" style={{ background: original ? 'var(--bg-surface)' : '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                      <span className="med-name">{med}</span>
                      {!original && <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>Proposed</span>}
                      {replacing === med && (
                        <span className="badge badge-moderate" style={{ fontSize: '0.6rem' }}>
                          <Pencil size={11} /> Replacing
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeMedicine(med)}
                        title="Remove from the proposed regimen only"
                      >
                        <CircleMinus size={14} /> Remove
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setReplacing(replacing === med ? null : med)}
                        title="Swap this medicine for another in the proposed regimen"
                      >
                        <Pencil size={13} /> Replace
                      </button>
                    </div>

                    {replacing === med && (
                      <div style={{ width: '100%', display: 'grid', gap: 8, paddingTop: 8, borderTop: '1px dashed var(--border-strong)' }}>
                        <div className="notice notice-info">
                          Current: <b>{med}</b> → Proposed: select the replacement medicine below. Nothing is
                          written to the patient record.
                        </div>
                        <MedicineSearch
                          exclude={proposed}
                          placeholder={`Search replacement for ${med}…`}
                          buttonLabel="Use as replacement"
                          onSelect={(name) => replaceMedicine(med, name)}
                        />
                        <button type="button" className="btn btn-quiet btn-sm" style={{ justifySelf: 'start' }} onClick={() => setReplacing(null)}>
                          <X size={13} /> Cancel replacement
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            <div style={{ display: 'grid', gap: 8, paddingTop: 4 }}>
              <MedicineSearch
                exclude={proposed}
                label="Add medicine to the proposed regimen"
                placeholder="Search brand, generic or active ingredient…"
                buttonLabel="Add to proposed"
                onSelect={addMedicine}
              />
              <p className="med-field">
                Added medicines are held in this simulation only. They are never saved to the patient record.
              </p>
            </div>

            {changes.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {changes.map((c, i) => (
                  <span key={`${c.kind}-${i}`} className={CHANGE_BADGE[c.kind]} style={{ textTransform: 'none', fontSize: '0.72rem' }}>
                    {c.kind === 'add' ? <CirclePlus size={11} /> : c.kind === 'remove' ? <CircleMinus size={11} /> : <Pencil size={11} />}{' '}
                    {changeText(c)}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={runSimulation}
                disabled={running || record.medicines.length === 0}
              >
                <Beaker size={15} />
                {running ? 'Running simulation…' : 'Run Simulation'}
              </button>
              <button type="button" className="btn btn-quiet" onClick={reset} disabled={!modified && !comparison}>
                <RotateCcw size={14} /> Reset Simulation
              </button>
            </div>

            {error && <div className="notice notice-danger">{error}</div>}
            {stale && (
              <div className="notice notice-warn">
                The proposed regimen changed after this comparison was produced. Run the simulation again to
                refresh the comparison.
              </div>
            )}
          </div>
        </div>

        {/* Comparison */}
        {activeComparison && (
          <div style={{ display: 'grid', gap: 14 }}>
            {activeComparison.proposed.length === 0 && (
              <div className="notice notice-danger">
                <b>The proposed regimen contains no medicines.</b> The engine reports no findings because there
                is nothing left to analyse — that is not a safety result. Never stop a prescribed medicine
                without the prescriber&rsquo;s decision.
              </div>
            )}
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Current vs proposed safety — backend results
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 12,
                  alignItems: 'stretch',
                }}
              >
                <SafetyBlock
                  title="Current safety"
                  score={activeComparison.currentScore}
                  level={activeComparison.currentLevel}
                  findings={activeComparison.current.findings.length}
                  emptyLabel="No verified finding returned for the current regimen."
                />
                <div style={{ display: 'grid', placeItems: 'center' }}>
                  <ArrowRight size={20} style={{ color: '#94a3b8' }} />
                </div>
                <SafetyBlock
                  title="Proposed safety"
                  score={activeComparison.proposedScore}
                  level={activeComparison.proposedLevel}
                  findings={activeComparison.proposedReport?.findings.length ?? 0}
                  emptyLabel={
                    activeComparison.proposedReport
                      ? 'No verified finding returned for the proposed regimen. Not a safety guarantee.'
                      : 'The proposed regimen could not be analysed.'
                  }
                />
              </div>
            </div>

            <div className="stat-box" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div className="eyebrow">Risk change</div>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small">
                  Current <b style={{ fontSize: '1.05rem' }}>{activeComparison.currentScore}</b>
                </span>
                <span className="small">
                  Proposed{' '}
                  <b style={{ fontSize: '1.05rem' }}>
                    {activeComparison.proposedScore === null ? '—' : activeComparison.proposedScore}
                  </b>
                </span>
                <span className={deltaTone} style={{ fontSize: '0.85rem' }}>
                  <DeltaIcon size={13} /> Delta {deltaLabel(delta)}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 14,
              }}
            >
              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-head" style={{ padding: '12px 14px' }}>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '0.85rem' }}>
                      Resolved Safety Findings
                    </h3>
                    <p className="card-sub">Present in the current regimen, not present in the proposal.</p>
                  </div>
                  <span className="badge badge-low">{activeComparison.resolved.length}</span>
                </div>
                <div className="card-pad" style={{ padding: 14 }}>
                  <FindingList
                    findings={activeComparison.resolved}
                    accent="var(--safe)"
                    emptyText="No finding disappeared in this comparison."
                  />
                </div>
              </div>

              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-head" style={{ padding: '12px 14px' }}>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '0.85rem' }}>
                      Remaining Safety Findings
                    </h3>
                    <p className="card-sub">Still present in the proposed regimen.</p>
                  </div>
                  <span className="badge badge-moderate">{activeComparison.remaining.length}</span>
                </div>
                <div className="card-pad" style={{ padding: 14 }}>
                  <FindingList
                    findings={activeComparison.remaining}
                    accent="var(--caution)"
                    emptyText="No finding from the current regimen remains."
                  />
                </div>
              </div>

              <div className="card" style={{ boxShadow: 'none' }}>
                <div className="card-head" style={{ padding: '12px 14px' }}>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '0.85rem' }}>
                      Newly Introduced Safety Findings
                    </h3>
                    <p className="card-sub">Reported by the engine for the proposed regimen only.</p>
                  </div>
                  <span className="badge badge-high">{activeComparison.introduced.length}</span>
                </div>
                <div className="card-pad" style={{ padding: 14 }}>
                  <FindingList
                    findings={activeComparison.introduced}
                    accent="var(--high)"
                    emptyText="The proposed regimen introduced no new verified finding. This is not a safety guarantee."
                  />
                </div>
              </div>
            </div>

            <div className="notice notice-warn">
              <b>Potentially resolved</b> findings above are the outcome of a simulated regimen only. Nothing
              has been prescribed or changed: the patient record still contains the original{' '}
              {record.medicines.length} medication{record.medicines.length === 1 ? '' : 's'}. Medication
              decisions remain with the doctor/pharmacist.
            </div>
          </div>
        )}
      </div>
    </section>
  )
}