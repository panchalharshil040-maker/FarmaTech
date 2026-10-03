import { useEffect, useRef, useState } from 'react'
import { Check, Pill, Plus, Search } from 'lucide-react'
import { searchDrugs } from '../api'
import type { DrugSearchResult } from '../types'

interface Props {
  onSelect: (name: string) => void
  /** Names already in the regimen — shown as "added" and not selectable. */
  exclude?: string[]
  label?: string
  placeholder?: string
  disabled?: boolean
  buttonLabel?: string
}

/**
 * Medicine name lookup backed by the existing GET /api/drugs/search endpoint.
 *
 * This is autocomplete for names only: suggestions come from the verified
 * database index. It produces no finding, no severity and no risk value. A name
 * that is not in the database can still be typed — /api/check then reports it
 * as unresolved instead of silently matching it.
 */
export default function MedicineSearch({
  onSelect,
  exclude = [],
  label,
  placeholder = 'Search brand, generic or active ingredient (e.g. Warfarin, Dolo, Metformin)…',
  disabled = false,
  buttonLabel = 'Add',
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DrugSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([])
      setOpen(false)
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchDrugs(query)
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      }
    }, 220)
    return () => clearTimeout(timerRef.current)
  }, [query])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const alreadyIn = (name: string) => exclude.some((m) => m.toLowerCase() === name.toLowerCase())

  const commit = (name: string) => {
    const value = name.trim()
    if (!value) return
    onSelect(value)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {label && (
        <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            aria-hidden
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            className="field"
            style={{ paddingLeft: 36 }}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit(query)
              }
              if (e.key === 'Escape') setOpen(false)
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled || !query.trim()}
          onClick={() => commit(query)}
        >
          <Plus size={15} />
          {buttonLabel}
        </button>
      </div>

      {open && results.length > 0 && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 40,
            maxHeight: 260,
            overflowY: 'auto',
            padding: 6,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {results.map((r) => {
            const added = alreadyIn(r.name)
            return (
              <button
                type="button"
                key={r.name}
                disabled={added}
                onClick={() => commit(r.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: added ? 'default' : 'pointer',
                  opacity: added ? 0.55 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!added) e.currentTarget.style.background = 'var(--brand-soft)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Pill size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: 'var(--text-strong)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {r.name}
                    </span>
                    <span className="med-field">
                      Active ingredient: {r.ingredients.join(', ')}
                    </span>
                  </span>
                </span>
                {added ? (
                  <span className="badge badge-low" style={{ fontSize: '0.62rem' }}>
                    <Check size={11} /> In regimen
                  </span>
                ) : (
                  <span className="small" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                    Select
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}