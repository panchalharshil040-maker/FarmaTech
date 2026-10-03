import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, QrCode, ScanLine, ShieldCheck } from 'lucide-react'
import { readQrRecord } from '../api'
import type { QrRecordResponse } from '../types'

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike
  }
}

export interface QrImportResult {
  token: string
  record: QrRecordResponse
}

interface Props {
  onLoaded: (result: QrImportResult) => void
  compact?: boolean
}

/**
 * Scan / import a patient QR record.
 *
 * The token is validated by the backend (GET /api/qr/{token}), which verifies the
 * signature and returns the medicines + allergies the token carries together with
 * a fresh deterministic report. An invalid or tampered token imports nothing.
 */
export default function QrImportPanel({ onLoaded, compact = false }: Props) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = undefined
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const importToken = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      setLoading(true)
      setError('')
      try {
        const record = await readQrRecord(trimmed)
        onLoaded({ token: trimmed, record })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'QR validation failed')
      } finally {
        setLoading(false)
      }
    },
    [onLoaded],
  )

  const startCamera = useCallback(async () => {
    setCameraError('')
    if (!window.BarcodeDetector) {
      setCameraError(
        'This browser cannot decode QR codes from the camera. Paste the patient QR token below instead.',
      )
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available in this browser. Paste the patient QR token below.')
      return
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      setScanning(true)
    } catch {
      setCameraError('Camera permission denied or unavailable. Paste the patient QR token below instead.')
    }
  }, [])

  // Keep the latest importer in a ref so the scan loop is not restarted on re-render.
  const importRef = useRef(importToken)
  useEffect(() => {
    importRef.current = importToken
  }, [importToken])

  // Attach the live stream once the <video> element exists and start decoding.
  useEffect(() => {
    if (!scanning) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream || !window.BarcodeDetector) return

    let cancelled = false
    video.srcObject = stream
    video.play().catch(() => undefined)

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    timerRef.current = setInterval(async () => {
      if (cancelled || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes.length > 0) {
          const value = codes[0].rawValue
          stopCamera()
          await importRef.current(value)
        }
      } catch {
        /* keep scanning */
      }
    }, 400)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = undefined
    }
  }, [scanning, stopCamera])

  return (
    <div className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <QrCode size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <h2 className="card-title">Scan Patient QR</h2>
            <p className="card-sub">
              Validates the signed QR payload on the backend and loads the patient record as the active
              clinical context.
            </p>
          </div>
        </div>
      </div>

      <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
        {scanning && (
          <div>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                maxHeight: 260,
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-bg-canvas)',
              }}
            />
            <button type="button" className="btn btn-quiet btn-sm" style={{ marginTop: 8 }} onClick={stopCamera}>
              <CameraOff size={14} /> Stop camera
            </button>
          </div>
        )}

        {!scanning && (
          <button type="button" className="btn btn-secondary" onClick={startCamera}>
            {cameraError ? <CameraOff size={15} /> : <Camera size={15} />}
            {cameraError ? 'Camera unavailable' : 'Scan with device camera'}
          </button>
        )}

        {cameraError && <div className="notice notice-warn">{cameraError}</div>}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: compact ? 'nowrap' : 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="section-label" htmlFor="qr-token" style={{ display: 'block', marginBottom: 6 }}>
              Patient QR token
            </label>
            <input
              id="qr-token"
              className="field mono"
              style={{ fontSize: '0.78rem' }}
              value={token}
              placeholder="Paste the token from the patient QR pass"
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  importToken(token)
                }
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !token.trim()}
            onClick={() => importToken(token)}
          >
            <ScanLine size={15} />
            {loading ? 'Validating…' : 'Validate & load'}
          </button>
        </div>

        {error && <div className="notice notice-danger">{error}</div>}

        <div className="notice notice-safe" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Only a backend-validated token loads a record. Imported medications, active ingredients and
            allergies replace the demo list — no test data is mixed into the patient record.
          </span>
        </div>
      </div>
    </div>
  )
}