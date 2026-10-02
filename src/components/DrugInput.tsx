import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Pill, Sparkles, Check } from 'lucide-react'
import { searchDrugs } from '../api'
import type { DrugSearchResult } from '../types'

interface Props {
  medicines: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onClear: () => void
}

const PRESET_DRUGS = [
  { name: 'Dolo 650', category: 'Analgesic' },
  { name: 'Combiflam', category: 'NSAID + Paracetamol' },
  { name: 'Warfarin', category: 'Anticoagulant' },
  { name: 'Ecosprin', category: 'Antiplatelet' },
  { name: 'Lipitor', category: 'Statin' },
  { name: 'Ciplox', category: 'Antibiotic' },
  { name: 'Pan 40', category: 'Antacid / PPI' },
  { name: 'Amlong', category: 'Antihypertensive' },
]

export default function DrugInput({ medicines, onAdd, onRemove, onClear }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DrugSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced autocomplete search
  useEffect(() => {
    if (query.trim().length < 1) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchDrugs(query)
        setResults(data)
        setShowDropdown(true)
      } catch {
        setResults([])
      }
    }, 200)
    return () => clearTimeout(timerRef.current)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (name: string) => {
    if (!medicines.some((m) => m.toLowerCase() === name.toLowerCase())) {
      onAdd(name)
    }
    setQuery('')
    setShowDropdown(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSelect(query.trim())
    }
  }

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Pill size={20} style={{ color: 'var(--accent-cyan)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Active Prescriptions & Medicines
          </h3>
          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            {medicines.length} Added
          </span>
        </div>

        {medicines.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '16px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="input-field"
            type="text"
            placeholder="Search medicine brand or generic (e.g., Dolo 650, Warfarin, Metformin)..."
            value={query}
            onChange={(e) => {
              const val = e.target.value
              setQuery(val)
              if (!val.trim()) {
                setResults([])
                setShowDropdown(false)
              }
            }}
            onFocus={() => {
              if (query.trim() && results.length > 0) setShowDropdown(true)
            }}
            onKeyDown={handleKeyDown}
            style={{
              paddingLeft: '44px',
              paddingRight: '100px',
              fontSize: '0.92rem',
              height: '48px',
            }}
          />
          <button
            className="btn-primary"
            onClick={() => {
              if (query.trim()) handleSelect(query.trim())
            }}
            disabled={!query.trim()}
            style={{
              position: 'absolute',
              right: '6px',
              height: '36px',
              padding: '0 16px',
              fontSize: '0.82rem',
            }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {/* Dropdown Suggestions */}
        {showDropdown && results.length > 0 && (
          <div
            className="glass-card"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 40,
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '6px',
            }}
          >
            {results.map((r) => {
              const alreadyAdded = medicines.some((m) => m.toLowerCase() === r.name.toLowerCase())
              return (
                <div
                  key={r.name}
                  onClick={() => handleSelect(r.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: alreadyAdded ? 'default' : 'pointer',
                    background: alreadyAdded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    opacity: alreadyAdded ? 0.6 : 1,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!alreadyAdded) e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    if (!alreadyAdded) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Pill size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {r.name}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Active: {r.ingredients.join(', ')}
                      </div>
                    </div>
                  </div>

                  {alreadyAdded ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Added
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      + Select
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Medicines List */}
      {medicines.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {medicines.map((med) => (
            <div
              key={med}
              className="pill-tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(139, 92, 246, 0.18))',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              <Pill size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ textTransform: 'capitalize' }}>{med}</span>
              <button
                onClick={() => onRemove(med)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  marginLeft: '2px',
                }}
                title={`Remove ${med}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-subtle)',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            No medicines added yet. Type in the box above or click a preset below to start checking.
          </p>
        </div>
      )}

      {/* Quick-add Presets */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-amber)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Add Test Scenarios:
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {PRESET_DRUGS.map((p) => {
            const isAdded = medicines.some((m) => m.toLowerCase() === p.name.toLowerCase())
            return (
              <button
                key={p.name}
                onClick={() => handleSelect(p.name)}
                disabled={isAdded}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: isAdded ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid var(--border-subtle)',
                  background: isAdded ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.04)',
                  color: isAdded ? 'var(--text-muted)' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: isAdded ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{p.name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({p.category})</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
