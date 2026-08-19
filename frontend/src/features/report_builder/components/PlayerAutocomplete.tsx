import { useState, useEffect, useRef } from 'react'
import { getPlayers, getPlayer } from '../../../services/api'

interface Props {
  playerId: number | null
  onChange: (id: number | null) => void
}

export default function PlayerAutocomplete({ playerId, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const initialLoadRef = useRef<number>(0)

  // Load initial name if playerId exists
  useEffect(() => {
    if (playerId) {
      const currentReq = ++initialLoadRef.current
      getPlayer(playerId)
        .then((res) => {
          if (currentReq === initialLoadRef.current && res?.player) {
            setQuery(res.player.name)
          }
        })
        .catch(() => {})
    } else {
      setQuery('')
    }
  }, [playerId])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const requestCounterRef = useRef<number>(0)
  const activeRequestRef = useRef<number>(0)

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    const requestId = ++requestCounterRef.current
    activeRequestRef.current = requestId

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getPlayers({ name: query, page: 1, page_size: 10 })
        if (activeRequestRef.current === requestId) {
          setResults(res.data || [])
        }
      } catch {
        if (activeRequestRef.current === requestId) {
          setResults([])
        }
      }
      if (activeRequestRef.current === requestId) {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query, open])

  return (
    <div className="relative w-64" ref={wrapperRef}>
      <input
        type="text"
        className="input-dark p-2 text-sm w-full"
        placeholder="Type to search player..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (playerId) onChange(null) // Clear selection if typing
        }}
        onFocus={() => {
          if (query.length >= 2) setOpen(true)
        }}
      />
      
      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
          {loading ? (
            <div className="p-3 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>Searching...</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((p) => (
                <li
                  key={p.player_id}
                  className="p-2 text-sm cursor-pointer hover:bg-[var(--color-surface-700)] flex items-center justify-between"
                  onClick={() => {
                    setQuery(p.name)
                    setOpen(false)
                    onChange(p.player_id)
                  }}
                >
                  <span className="text-white">{p.name}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {p.team || 'No Club'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No players found</div>
          )}
        </div>
      )}
    </div>
  )
}
