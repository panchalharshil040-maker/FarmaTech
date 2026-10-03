import type { CheckResponse, Finding, RiskLevel } from '../types'

/** Display helpers only. No medical logic lives in this file. */

export const SEVERITY_LABEL: Record<string, string> = {
  major: 'Major',
  moderate: 'Moderate',
  minor: 'Minor',
  duplicate: 'Duplicate therapy',
  food: 'Food advisory',
  contraindication: 'Contraindication',
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'LOW',
  moderate: 'MODERATE',
  high: 'HIGH',
}

export function riskBadgeClass(level: RiskLevel): string {
  if (level === 'high') return 'badge badge-high'
  if (level === 'moderate') return 'badge badge-moderate'
  return 'badge badge-low'
}

export function riskTextClass(level: RiskLevel): string {
  if (level === 'high') return 'text-red-700'
  if (level === 'moderate') return 'text-amber-700'
  return 'text-emerald-700'
}

export function riskSoftBg(level: RiskLevel): string {
  if (level === 'high') return 'bg-red-50 border-red-200'
  if (level === 'moderate') return 'bg-amber-50 border-amber-200'
  return 'bg-emerald-50 border-emerald-200'
}

export type FindingCategory = 'interaction' | 'duplicate' | 'contraindication' | 'other'

export const CATEGORY_TITLE: Record<FindingCategory, string> = {
  interaction: 'Drug–Drug Interaction',
  duplicate: 'Duplicate Therapy',
  contraindication: 'Contraindication',
  other: 'Other Verified Finding',
}

export const CATEGORY_HINT: Record<FindingCategory, string> = {
  interaction: 'Verified interaction between two active ingredients.',
  duplicate: 'Two prescribed products share an active ingredient or drug class.',
  contraindication: 'A verified medicine rule matched a recorded patient condition.',
  other: 'Additional verified rule returned by the engine.',
}

/** Group backend findings into the four separate clinical buckets. */
export function groupFindings(findings: Finding[]): Record<FindingCategory, Finding[]> {
  const groups: Record<FindingCategory, Finding[]> = {
    interaction: [],
    duplicate: [],
    contraindication: [],
    other: [],
  }
  for (const f of findings) {
    if (f.type === 'interaction') groups.interaction.push(f)
    else if (f.type === 'contraindication') groups.contraindication.push(f)
    else if (f.type === 'duplicate_ingredient' || f.type === 'class_duplicate') groups.duplicate.push(f)
    else groups.other.push(f)
  }
  return groups
}

export function countFindings(findings: Finding[]) {
  return {
    major: findings.filter((f) => f.severity === 'major').length,
    moderate: findings.filter((f) => f.severity === 'moderate').length,
    minor: findings.filter((f) => f.severity === 'minor').length,
    duplicate: findings.filter((f) => f.severity === 'duplicate').length,
    contraindication: findings.filter((f) => f.severity === 'contraindication').length,
  }
}

/** Human label for a finding, built only from backend fields. */
export function findingTitle(f: Finding): string {
  const drugs = f.medicines?.length ? f.medicines : (f.drugs ?? [])
  const pair = drugs.join(' + ')
  return f.condition ? `${pair} · ${f.condition}` : pair
}

/**
 * Render the source metadata the backend actually returned.
 * Nothing is inferred: keys absent from the response are simply not shown.
 */
export function sourceLines(f: Finding): string[] {
  const src = f.source
  if (!src || typeof src !== 'object') return []
  const order = ['organization', 'dataset', 'datasetPart', 'effectiveTime', 'setId', 'splId']
  const lines: string[] = []
  for (const key of order) {
    const value = src[key]
    if (value) {
      lines.push(key === 'effectiveTime' ? `Effective: ${value}` : `${key}: ${value}`)
    }
  }
  for (const [key, value] of Object.entries(src)) {
    if (order.includes(key) || !value) continue
    lines.push(`${key}: ${value}`)
  }
  return lines
}

export function deltaLabel(delta: number | null): string {
  if (delta === null) return '—'
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `${delta}`
  return '0'
}

/**
 * True only when the backend returned zero findings for the analysed regimen.
 * The UI must still avoid any "safe" wording — see <NoVerifiedMatchNotice />.
 */
export function isNoVerifiedMatch(result: Pick<CheckResponse, 'findings' | 'found'>): boolean {
  return (result.found ?? result.findings.length > 0) === false
}