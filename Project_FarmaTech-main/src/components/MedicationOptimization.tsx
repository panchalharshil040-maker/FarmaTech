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
import { RISK_LABEL, deltaLabel, riskBadgeClass } from '../lib/clinical'
import type { ChangeKind, PatientRecord, RegimenChange, RegimenComparison, RiskLevel } from '../types'
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

/** One side of the compact current-vs-proposed summary. Values are backend outputs only. */
function CompareSide({
  label,
  score,
  level,
  findings,
  note,
}: {
  label: string
  score: number | null
  level: RiskLevel | null
  findings: number
  note: string
}) {
  return (
    <div className="mmo-side">
      <span className="eyebrow">{label}</span>
      <p className="mmo-score">
        {score === null ? '—' : score}
        {score !== null && <span className="mmo-score-out"> / 100</span>}
      </p>
      <p className="mmo-side-badges">
        {level ? <span className={riskBadgeClass(level)}>{RISK_LABEL[level]}</span> : <span className="badge badge-neutral">Not analysed</span>}
        <span className="badge badge-neutral">
          {findings} finding{findings === 1 ? '' : 's'}
        </span>
      </p>
      <p className="mmo-side-note">{note}</p>
    </div>
  )
}

/** One compact comparison column. Findings stay collapsed; details open on demand. */
function CompareColumn({
  title,
  hint,
  count,
  countClass,
  accent,
  findings,
  emptyText,
}: {
  title: string
  hint: string
  count: number
  countClass: string
  accent: string
  findings: RegimenComparison['resolved']
  emptyText: string
}) {
  return (
    <article className="mmo-col">
      <header className="mmo-col-head">
        <span className={countClass}>{count}</span>
        <h3 className="mmo-col-title">{title}</h3>
      </header>
      <p className="mmo-col-hint">{hint}</p>
      <FindingList findings={findings} accent={accent} emptyText={emptyText} />
    </article>
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
  const proposedEmpty = proposed.length === 0

  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <FlaskConical size={18} style={{ color: 'var(--color-brand)' }} />
          <div>
            <h2 className="card-title">Medication Optimization</h2>
            <p className="card-sub">Test medication changes in a simulation before a clinical decision.</p>
          </div>
        </div>
        {modified ? <span className="badge badge-info">Proposed regimen</span> : <span className="badge badge-neutral">Unchanged regimen</span>}
      </div>

      <div className="card-pad mmo-body">
        {/* The one simulation-only notice for this section */}
        <SimulationDisclaimer />

        {/* Proposed regimen editor — flat, one compact block */}
        <div className="mmo-editor">
          <div className="mmo-editor-head">
            <h3 className="mmo-editor-title">
              {modified ? 'Proposed regimen' : 'Current patient regimen'}
            </h3>
            <span className="med-field">
              {modified
                ? `${proposed.length} medicine${proposed.length === 1 ? '' : 's'} — simulation only`
                : `${record.medicines.length} medicine${record.medicines.length === 1 ? '' : 's'} in the active record`}
            </span>
          </div>

          <div className="mmo-editor-body">
            {proposedEmpty ? (
              <div className="notice notice-warn mmo-empty">
                The proposed regimen is empty. It can still be simulated, but an empty regimen is not a
                treatment recommendation and never proves a medicine is safe to stop.
              </div>
            ) : (
              proposed.map((med) => {
                const original = record.medicines.includes(med)
                return (
                  <div key={med} className="data-row mmo-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                      <span className="med-name">{med}</span>
                      {!original && <span className="badge badge-info">Proposed</span>}
                      {replacing === med && (
                        <span className="badge badge-moderate">
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
                      <div style={{ width: '100%', display: 'grid', gap: 8, paddingTop: 8, borderTop: '1px dashed var(--color-border-strong)' }}>
                        <div className="med-field">
                          Replacing <b>{med}</b> — select the replacement below.
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

            <MedicineSearch
              exclude={proposed}
              label="Add medicine to the proposed regimen"
              placeholder="Search brand, generic or active ingredient…"
              buttonLabel="Add to proposed"
              onSelect={addMedicine}
            />

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
          </div>
        </div>

        {/* Actions */}
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
            The proposed regimen changed after this comparison was produced. Run the simulation again.
          </div>
        )}

        {/* Comparison — backend results only */}
        {activeComparison && (
          <div className="mmo-results">
            <div className="mmo-compare">
              <CompareSide
                label="Current regimen"
                score={activeComparison.currentScore}
                level={activeComparison.currentLevel}
                findings={activeComparison.current.findings.length}
                note="From the active patient record."
              />
              <span className="mmo-arrow" aria-hidden>
                <ArrowRight size={18} />
              </span>
              <CompareSide
                label="Proposed regimen"
                score={activeComparison.proposedScore}
                level={activeComparison.proposedLevel}
                findings={activeComparison.proposedReport?.findings.length ?? 0}
                note={
                  proposedEmpty
                    ? 'Empty regimen — nothing left to analyse.'
                    : activeComparison.proposedReport
                      ? 'No verified finding returned. Not a safety guarantee.'
                      : 'The proposed regimen could not be analysed.'
                }
              />
              <div className="mmo-delta">
                <span className="eyebrow">Risk change</span>
                <span className={deltaTone}>
                  <DeltaIcon size={13} /> Delta {deltaLabel(delta)}
                </span>
              </div>
            </div>

            <p className="mmo-compare-note">
              Simulated proposal only — nothing was prescribed or changed. A lower proposed score or fewer
              findings never proves the proposal is safe; medication decisions remain with the clinician.
            </p>

            {proposedEmpty && (
              <div className="notice notice-warn">
                The proposed regimen contains no medicines, so the engine has no proposal to analyse.
                Never stop a prescribed medicine without the prescriber&rsquo;s decision.
              </div>
            )}

            <div className="mmo-cols">
              <CompareColumn
                title="Resolved findings"
                hint="Present now, removed by the proposal."
                count={activeComparison.resolved.length}
                countClass="mmo-col-count mmo-col-count--low"
                accent="var(--color-success)"
                findings={activeComparison.resolved}
                emptyText="No finding disappeared with this proposal."
              />
              <CompareColumn
                title="Remaining findings"
                hint="Still present in the proposal."
                count={activeComparison.remaining.length}
                countClass="mmo-col-count mmo-col-count--moderate"
                accent="var(--color-warning)"
                findings={activeComparison.remaining}
                emptyText="No finding from the current regimen remains."
              />
              <CompareColumn
                title="Newly introduced findings"
                hint="Reported for the proposal only."
                count={activeComparison.introduced.length}
                countClass="mmo-col-count mmo-col-count--high"
                accent="var(--color-danger)"
                findings={activeComparison.introduced}
                emptyText="The proposal introduced no new verified finding — this is not a safety guarantee."
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
