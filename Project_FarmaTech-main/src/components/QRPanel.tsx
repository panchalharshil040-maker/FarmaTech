import { useState } from 'react'
import {
  Check,
  Copy,
  Printer,
  QrCode,
  ShieldCheck,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { generateQRToken } from '../api'

interface Props {
  medicines: string[]
}

export default function QRPanel({ medicines }: Props) {
  const [token, setToken] = useState('')
  const [allergies, setAllergies] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (medicines.length === 0) return
    setLoading(true)
    setError('')
    try {
      const allergyList = allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
      const data = await generateQRToken(medicines, allergyList)
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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.9), rgba(15, 23, 42, 0.95))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #06b6d4, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-cyan)',
          }}
        >
          <QrCode size={20} color="white" />
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Digital Prescription & Emergency Medical QR Pass
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Instant encrypted clinical payload containing active medications, drug allergies, and verification hash
          </p>
        </div>
      </div>

      {medicines.length === 0 ? (
        <div
          style={{
            marginTop: '16px',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Please add medicines to your prescription list above before generating an emergency pass.
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginTop: '16px', marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Known Drug Allergies (Optional, comma-separated):
            </label>
            <input
              className="input-field"
              placeholder="e.g. Penicillin, Sulfa, Aspirin, Peanuts..."
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              style={{ height: '42px', fontSize: '0.88rem' }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{ width: '100%', height: '44px', fontSize: '0.9rem', marginBottom: '18px' }}
          >
            {loading ? 'Generating Security Token...' : 'Generate Emergency QR Pass'}
          </button>

          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fca5a5',
                fontSize: '0.82rem',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {token && (
            <div
              className="animate-fade-in"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                alignItems: 'center',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              {/* High Contrast QR SVG Card */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}
              >
                <QRCodeSVG
                  value={token}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: '8px', letterSpacing: '0.05em' }}>
                  SCAN FOR EMERGENCY CLINICAL DATA
                </span>
              </div>

              {/* Prescription Details Card */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Verified Digital Prescription Pass
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                  <strong>Medications ({medicines.length}):</strong>{' '}
                  <span style={{ textTransform: 'capitalize' }}>{medicines.join(', ')}</span>
                  <br />
                  <strong>Allergies:</strong> {allergies.trim() ? allergies : 'None Reported'}
                </div>

                {/* Token Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check size={14} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy Token'}
                  </button>

                  <button
                    onClick={handlePrint}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Printer size={14} /> Print Medical Card
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
