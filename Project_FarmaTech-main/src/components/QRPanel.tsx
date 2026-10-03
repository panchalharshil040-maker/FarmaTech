import { useState } from 'react'
import { Check, Copy, Printer, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { generateQRToken } from '../api'
import type { PatientRecord } from '../types'

interface Props {
  record: PatientRecord | null
}

/**
 * QR patient record — generated from the ACTIVE patient record only, using the
 * existing POST /api/qr endpoint. Demo scenarios are never encoded into a pass.
 */
export default function QRPanel({ record }: Props) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!record || record.medicines.length === 0) return
    setLoading(true)
    setError('')
    try {
      const data = await generateQRToken(record.medicines, record.profile.allergies)
      setToken(data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QR generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!record || record.medicines.length === 0) {
    return (
      <section className="card">
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <QrCode size={18} style={{ color: 'var(--brand)' }} />
            <h2 className="card-title">QR Patient Record</h2>
          </div>
        </div>
        <div className="card-pad">
          <div className="notice">
            A QR pass is generated from the active patient record. Load a patient record with at least one
            medication first.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <QrCode size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <h2 className="card-title">QR Patient Record</h2>
            <p className="card-sub">
              Signed clinical payload with the active medications and allergies of{' '}
              {record.name || 'the current record'}.
            </p>
          </div>
        </div>
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 14 }}>
        <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          <QrCode size={15} />
          {loading ? 'Generating…' : 'Generate QR pass'}
        </button>

        {error && <div className="notice notice-danger">{error}</div>}

        {token && (
          <div className="data-row" style={{ alignItems: 'flex-start', gap: 18 }}>
            <div
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              <QRCodeSVG value={token} size={168} level="M" includeMargin={false} />
              <div className="eyebrow" style={{ marginTop: 6, fontSize: '0.58rem' }}>
                Scan for clinical data
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Encoded record
              </div>
              <p className="small" style={{ color: 'var(--text-body)', lineHeight: 1.5 }}>
                <b>Patient:</b> {record.name || 'Unnamed'} {record.patientId ? `(${record.patientId})` : ''}
                <br />
                <b>Medications ({record.medicines.length}):</b>{' '}
                <span style={{ textTransform: 'capitalize' }}>{record.medicines.join(', ')}</span>
                <br />
                <b>Allergies:</b>{' '}
                {record.profile.allergies.length > 0 ? record.profile.allergies.join(', ') : 'None recorded'}
              </p>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy token'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print / save as PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}