import { FileText, Printer } from 'lucide-react'
import { CATEGORY_TITLE, RISK_LABEL, groupFindings, riskBadgeClass } from '../lib/clinical'
import type { CheckResponse, PatientRecord } from '../types'

interface Props {
  record: PatientRecord
  result: CheckResponse | null
}

/**
 * Patient summary report. Every clinical line is taken from the active record
 * and from the backend response — nothing is recomputed here. Printing this
 * section (or "save as PDF" from the print dialog) produces the clinical output.
 */
export default function PatientSummary({ record, result }: Props) {
  const groups = result ? groupFindings(result.findings) : null

  return (
    <section className="card">
      <div className="card-head no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <FileText size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <h2 className="card-title">Patient Summary Report</h2>
            <p className="card-sub">Built from the active patient record and the latest backend result.</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> Print / PDF
        </button>
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          <div className="stat-box">
            <div className="eyebrow">Patient</div>
            <div className="med-name" style={{ textTransform: 'none' }}>
              {record.name || 'Unnamed'}
            </div>
          </div>
          <div className="stat-box">
            <div className="eyebrow">Patient ID</div>
            <div className="med-name" style={{ textTransform: 'none' }}>
              {record.patientId || '—'}
            </div>
          </div>
          <div className="stat-box">
            <div className="eyebrow">Age</div>
            <div className="med-name" style={{ textTransform: 'none' }}>
              {record.age || record.profile.ageGroup}
            </div>
          </div>
          <div className="stat-box">
            <div className="eyebrow">Record source</div>
            <div className="med-name" style={{ textTransform: 'capitalize' }}>
              {record.source}
            </div>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Current medications ({record.medicines.length})
          </div>
          {record.medicines.length === 0 ? (
            <p className="small muted">No medications recorded.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'grid', gap: 4 }}>
              {record.medicines.map((m) => (
                <li key={m} className="small" style={{ textTransform: 'capitalize' }}>
                  • {m}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Allergies
          </div>
          <p className="small">
            {record.profile.allergies.length > 0 ? record.profile.allergies.join(', ') : 'No recorded allergies'}
          </p>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Medication safety summary
          </div>
          {result ? (
            <>
              <p className="small" style={{ marginBottom: 8 }}>
                Risk score <b>{result.risk_score}</b> / 100 ·{' '}
                <span className={riskBadgeClass(result.risk_level)} style={{ verticalAlign: 'middle' }}>
                  {RISK_LABEL[result.risk_level]}
                </span>{' '}
                · {result.findings.length} verified finding{result.findings.length === 1 ? '' : 's'}
              </p>
              {groups &&
                (Object.keys(groups) as (keyof typeof groups)[])
                  .filter((k) => groups[k].length > 0)
                  .map((k) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <div className="eyebrow">{CATEGORY_TITLE[k]}</div>
                      <ul style={{ listStyle: 'none', display: 'grid', gap: 3 }}>
                        {groups[k].map((f, i) => (
                          <li key={f.id ?? i} className="small">
                            • [{f.severity}] {(f.medicines?.length ? f.medicines : f.drugs).join(' + ')}
                            {f.condition ? ` · ${f.condition}` : ''} — {f.mechanism}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              {result.findings.length === 0 && (
                <p className="small">
                  No verified finding was returned for this record. This is not a safety guarantee — the
                  verified database may not cover these medicines.
                </p>
              )}
            </>
          ) : (
            <p className="small muted">
              No safety check has been run for this record yet. Run the Safety Check to include verified
              findings in this report.
            </p>
          )}
        </div>

        <div className="divider" />

        <p className="med-field" style={{ fontStyle: 'italic' }}>
          Decision support only. Not a substitute for a doctor&rsquo;s or pharmacist&rsquo;s clinical judgment.
          Safety findings are produced by the deterministic medication-safety engine over verified databases.
        </p>
      </div>
    </section>
  )
}