import { useEffect, useState, useCallback, useRef } from 'react'
import { getPlayers, getPositions, getLeagues, getNationalities, getTeams, getSeasons, getMetrics, getRoles } from '../../services/api'
import { usePlayerStore, DEFAULT_COLUMNS } from '../../store/playerStore'

interface FilterOptions {
  positions: { general: string[]; specific: string[] }
  leagues: string[]
  nationalities: string[]
  teams: string[]
  seasons: string[]
  roles: string[]
}

export default function ExplorerPage() {
  const store = usePlayerStore()
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<{ data: any[]; total: number; total_pages: number; page: number }>({
    data: [],
    total: 0,
    total_pages: 1,
  })
  const [filterOpts, setFilterOpts] = useState<FilterOptions>({
    positions: { general: [], specific: [] },
    leagues: [],
    nationalities: [],
    teams: [],
    seasons: [],
    roles: [],
  })
  const [availableMetrics, setAvailableMetrics] = useState<{ key: string, label: string, category: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [isSpecificPositionOpen, setIsSpecificPositionOpen] = useState(false)
  const [isLeagueOpen, setIsLeagueOpen] = useState(false)
  const [isNationalityOpen, setIsNationalityOpen] = useState(false)

  // Load filter options
  useEffect(() => {
    Promise.all([getPositions(), getLeagues(), getNationalities(), getTeams(), getSeasons(), getMetrics(), getRoles()])
      .then(([pos, leagues, nats, teams, seasons, metrics, roles]) => {
        setFilterOpts({ positions: pos, leagues, nationalities: nats, teams, seasons, roles })
        setAvailableMetrics(metrics || [])
      })
      .catch(() => { })
  }, [])

  // Fetch players when filters change
  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const filters: any = {
        page: store.page,
        page_size: store.pageSize,
        name: store.name || undefined,
        position: store.position || undefined,
        specific_position: store.specificPosition?.length > 0 ? store.specificPosition.join(',') : undefined,
        nationality: store.nationality?.length > 0 ? store.nationality.join(',') : undefined,
        team: store.team || undefined,
        league: store.league?.length > 0 ? store.league.join(',') : undefined,
        season: store.season || undefined,
        role: store.role || undefined,
        sort_by: store.sortBy,
        sort_dir: store.sortDir,
      }
      if (store.ageMin != null && !isNaN(store.ageMin)) filters.age_min = store.ageMin
      if (store.ageMax != null && !isNaN(store.ageMax)) filters.age_max = store.ageMax
      if (store.minutesMin != null && !isNaN(store.minutesMin)) filters.minutes_min = store.minutesMin
      if (store.minutesMax != null && !isNaN(store.minutesMax)) filters.minutes_max = store.minutesMax

      const result = await getPlayers(filters)
      setData(prev => {
        if (store.page === 1) return result
        return {
          ...result,
          data: [...prev.data, ...result.data]
        }
      })
    } catch (e: any) {
      console.error(e)
      if (store.page === 1) setData({ data: [], total: 0, total_pages: 1, page: 1, error: e.message } as any)
    }
    setLoading(false)
  }, [store])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleSort = (col: string) => {
    if (store.sortBy === col) {
      store.setFilter('sortDir', store.sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      store.setFilter('sortBy', col)
      store.setFilter('sortDir', 'desc')
    }
  }

  const handleScroll = () => {
    if (!tableContainerRef.current || loading) return
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (store.page < data.total_pages) {
        store.setPage(store.page + 1)
      }
    }
  }

  const sortIcon = (col: string) => {
    if (store.sortBy !== col) return ''
    return store.sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const formatStat = (val: number | undefined, player: any) => {
    if (val == null) return '—'

    // Helper to format any raw value cleanly
    const formatRaw = (v: number) => Number.isInteger(v) ? v.toString() : Number(v.toFixed(2)).toString()

    if (store.displayMode === 'total') return formatRaw(val)

    if (store.displayMode === 'perGame') {
      const apps = player.appearances || 1
      return (val / apps).toFixed(2)
    }

    if (store.displayMode === 'per90') {
      const mins = player.minutes_played || 90
      return (val / (mins / 90)).toFixed(2)
    }

    return formatRaw(val)
  }

  const columns = store.columns || DEFAULT_COLUMNS
  const setColumns = (cols: any) => store.setFilter('columns', cols)
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null)

  return (
    <div className="min-h-full flex flex-col gap-5 animate-fade-in" style={{ paddingLeft: '14px', paddingRight: '4px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Player Explorer
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {data.total} players found
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <select
            className="input-dark text-sm"
            value={store.displayMode}
            onChange={(e) => store.setFilter('displayMode', e.target.value)}
          >
            <option value="total">Total Stats</option>
            <option value="perGame">Per Game</option>
            <option value="per90">Per 90</option>
          </select>
          <button onClick={() => {
            store.resetFilters()
            setColumns(DEFAULT_COLUMNS)
          }} className="btn-ghost text-xs whitespace-nowrap">
            Reset Filters
          </button>

          <select
            className="input-dark text-sm w-[110px]"
            onChange={(e) => {
              if (!e.target.value) return;
              const metric = availableMetrics.find(m => m.key === e.target.value)
              if (metric && !columns.find(c => c.key === metric.key)) {
                setColumns([...columns, { key: metric.key, label: metric.label }])
              }
              e.target.value = "" // reset
            }}
            value=""
          >
            <option value="" disabled>+ Add Stat</option>
            {availableMetrics.map(m => (
              <option key={m.key} value={m.key} disabled={columns.some(c => c.key === m.key)}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 relative z-50">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search name..."
            className="input-dark w-64"
            value={store.name}
            onChange={(e) => store.setFilter('name', e.target.value)}
          />

          {/* General Position */}
          <select
            className="input-dark w-40"
            value={store.position}
            onChange={(e) => store.setFilter('position', e.target.value)}
          >
            <option value="">All General</option>
            {filterOpts.positions.general.map((p) => (
              <option key={p} value={p}>
                {p === 'G' ? 'Goalkeeper (G)' : p === 'D' ? 'Defender (D)' : p === 'M' ? 'Midfielder (M)' : p === 'F' ? 'Forward (F)' : p}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            className="input-dark w-48"
            value={store.role}
            onChange={(e) => store.setFilter('role', e.target.value)}
          >
            <option value="">All Roles</option>
            {filterOpts.roles?.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Specific Position */}
          <div className="relative w-full sm:w-auto flex-1 min-w-[120px] max-w-[200px]">
            <button
              className="input-dark w-full text-left flex justify-between items-center"
              style={{ height: '35px', padding: '8px 12px' }}
              onClick={() => setIsSpecificPositionOpen(!isSpecificPositionOpen)}
            >
              <span className="truncate">
                {store.specificPosition?.length > 0 ? `${store.specificPosition.length} Selected` : 'All Positions'}
              </span>
              <span className="text-[10px] ml-2">▼</span>
            </button>
            {isSpecificPositionOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsSpecificPositionOpen(false)}></div>
                <div className="absolute top-full left-0 mt-1 w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-2xl z-[70] py-1 max-h-60 overflow-y-auto">
                  {filterOpts.positions.specific
                    .filter(p => !['G', 'D', 'M', 'F'].includes(p))
                    .map((p) => {
                      const isSelected = (store.specificPosition || []).includes(p)
                      return (
                        <label
                          key={p}
                          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#2563eb] hover:text-white transition-none group"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const current = store.specificPosition || []
                              store.setFilter('specificPosition', current.includes(p) ? current.filter(x => x !== p) : [...current, p])
                            }}
                            className="rounded border-[var(--color-border)] bg-[var(--color-surface-900)] text-[#2563eb] focus:ring-[#2563eb]"
                          />
                          <span className="text-[13px] truncate text-[var(--color-text-primary)] group-hover:text-white">
                            {p}
                          </span>
                        </label>
                      )
                    })}
                </div>
              </>
            )}
          </div>

          {/* League */}
          <div className="relative w-full sm:w-auto flex-1 min-w-[120px] max-w-[200px]">
            <button
              className="input-dark w-full text-left flex justify-between items-center"
              style={{ height: '35px', padding: '8px 12px' }}
              onClick={() => setIsLeagueOpen(!isLeagueOpen)}
            >
              <span className="truncate">
                {store.league?.length > 0 ? `${store.league.length} Selected` : 'All Leagues'}
              </span>
              <span className="text-[10px] ml-2">▼</span>
            </button>
            {isLeagueOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsLeagueOpen(false)}></div>
                <div className="absolute top-full left-0 mt-1 w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-2xl z-[70] py-1 max-h-60 overflow-y-auto">
                  {filterOpts.leagues.filter(l => l.toLowerCase() !== 'total').map((l) => {
                    const isSelected = (store.league || []).includes(l)
                    return (
                      <label
                        key={l}
                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#2563eb] hover:text-white transition-none group"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const current = store.league || []
                            store.setFilter('league', current.includes(l) ? current.filter(x => x !== l) : [...current, l])
                          }}
                          className="rounded border-[var(--color-border)] bg-[var(--color-surface-900)] text-[#2563eb] focus:ring-[#2563eb]"
                        />
                        <span className="text-[13px] truncate text-[var(--color-text-primary)] group-hover:text-white">
                          {l}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Season */}
          <select
            className="input-dark w-40"
            value={store.season}
            onChange={(e) => store.setFilter('season', e.target.value)}
          >
            <option value="">All Seasons</option>
            {filterOpts.seasons.filter(s => s.toLowerCase() !== 'total').map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Nationality */}
          <div className="relative w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]">
            <button
              className="input-dark w-full text-left flex justify-between items-center"
              style={{ height: '35px', padding: '8px 12px' }}
              onClick={() => setIsNationalityOpen(!isNationalityOpen)}
            >
              <span className="truncate">
                {store.nationality?.length > 0 ? `${store.nationality.length} Selected` : 'All Nationalities'}
              </span>
              <span className="text-[10px] ml-2">▼</span>
            </button>
            {isNationalityOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsNationalityOpen(false)}></div>
                <div className="absolute top-full left-0 mt-1 w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-2xl z-[70] py-1 max-h-60 overflow-y-auto">
                  {filterOpts.nationalities.map((n) => {
                    const isSelected = (store.nationality || []).includes(n)
                    return (
                      <label
                        key={n}
                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#2563eb] hover:text-white transition-none group"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const current = store.nationality || []
                            store.setFilter('nationality', current.includes(n) ? current.filter(x => x !== n) : [...current, n])
                          }}
                          className="rounded border-[var(--color-border)] bg-[var(--color-surface-900)] text-[#2563eb] focus:ring-[#2563eb]"
                        />
                        <span className="text-[13px] truncate text-[var(--color-text-primary)] group-hover:text-white">
                          {n}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Team */}
          <select
            className="input-dark"
            value={store.team}
            onChange={(e) => store.setFilter('team', e.target.value)}
          >
            <option value="">All Clubs</option>
            {filterOpts.teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Age range */}
          <div className="flex gap-2 items-center w-38">
            <input
              type="number"
              placeholder="Min Age"
              className="input-dark w-full min-w-0 !px-1 text-xs text-center"
              value={store.ageMin ?? ''}
              onChange={(e) => store.setFilter('ageMin', e.target.value ? +e.target.value : undefined)}
            />
            <span style={{ color: 'var(--color-text-muted)' }}>–</span>
            <input
              type="number"
              placeholder="Max Age"
              className="input-dark w-full min-w-0 !px-1 text-xs text-center"
              value={store.ageMax ?? ''}
              onChange={(e) => store.setFilter('ageMax', e.target.value ? +e.target.value : undefined)}
            />
          </div>

          {/* Minutes range */}
          <div className="flex gap-2 items-center w-46">
            <input
              type="number"
              placeholder="Min Played"
              className="input-dark w-full min-w-0 !px-1 text-[11px] text-center"
              value={store.minutesMin ?? ''}
              onChange={(e) => store.setFilter('minutesMin', e.target.value ? +e.target.value : undefined)}
            />
            <span style={{ color: 'var(--color-text-muted)' }}>–</span>
            <input
              type="number"
              placeholder="Max Played"
              className="input-dark w-full min-w-0 !px-1 text-[11px] text-center"
              value={store.minutesMax ?? ''}
              onChange={(e) => store.setFilter('minutesMax', e.target.value ? +e.target.value : undefined)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card flex-1 overflow-auto" ref={tableContainerRef} onScroll={handleScroll}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  draggable
                  onDragStart={(e) => {
                    setDraggedColIdx(idx)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedColIdx === null || draggedColIdx === idx) return
                    const newCols = [...columns]
                    const [draggedItem] = newCols.splice(draggedColIdx, 1)
                    newCols.splice(idx, 0, draggedItem)
                    setColumns(newCols)
                    setDraggedColIdx(null)
                  }}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer hover:bg-[var(--color-surface-700)] select-none transition-colors group relative"
                  style={{ opacity: draggedColIdx === idx ? 0.5 : 1 }}
                  title="Arrastra para reordenar"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{col.label}{sortIcon(col.key)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setColumns(columns.filter(c => c.key !== col.key))
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full w-4 h-4 flex items-center justify-center transition-all"
                      title="Quitar columna"
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ opacity: loading && store.page === 1 ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {(data as any).error ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-red-500 font-bold">
                  Error: {(data as any).error}
                </td>
              </tr>
            ) : data.data.length === 0 && loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  Loading...
                </td>
              </tr>
            ) : data.data.length === 0 ? (

              <tr>
                <td colSpan={columns.length} className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  No players found. Add leagues from the Sync panel to get started.
                </td>
              </tr>
            ) : (
              data.data.map((p: any, i: number) => (
                <tr key={`${p.player_id}-${i}`}>
                  {columns.map(col => {
                    switch (col.key) {
                      case 'name': return <td key={col.key} className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.name}</td>
                      case 'age': return <td key={col.key}>{p.age ?? '—'}</td>
                      case 'nationality': return <td key={col.key}>{p.nationality ?? '—'}</td>
                      case 'minutes_played': return <td key={col.key}>{p.minutes_played ?? '—'}</td>
                      case 'specific_position': return (
                        <td key={col.key}>
                          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--color-surface-600)', color: 'var(--color-accent-cyan)' }}>
                            {p.specific_position || p.position || '—'}
                          </span>
                        </td>
                      )
                      case 'team': return <td key={col.key}>{p.team ?? '—'}</td>
                      case 'tournament_name': return <td key={col.key}>{p.tournament_name ?? '—'}</td>
                      case 'season_name': return <td key={col.key}>{p.season_name ?? '—'}</td>
                      case 'goals': return <td key={col.key} style={{ color: 'var(--color-accent-green)' }}>{formatStat(p.goals, p)}</td>
                      case 'assists': return <td key={col.key} style={{ color: 'var(--color-accent-amber)' }}>{formatStat(p.assists, p)}</td>
                      case 'rating': return <td key={col.key}>{p.rating ? Number(p.rating).toFixed(2) : '—'}</td>
                      case 'role': return <td key={col.key} className="text-xs">{p.role ?? '—'}</td>
                      case 'role_score': return <td key={col.key}>{p.role_score ? Number(p.role_score).toFixed(2) : '—'}</td>
                      case 'league_score': return <td key={col.key}>{p.league_score ? Number(p.league_score).toFixed(2) : '—'}</td>
                      case 'world_score': return <td key={col.key}>{p.world_score ? Number(p.world_score).toFixed(2) : '—'}</td>
                      default: return <td key={col.key}>{p[col.key] != null ? formatStat(p[col.key], p) : '—'}</td>
                    }
                  })}
                </tr>
              ))
            )}
            {loading && data.data.length > 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Loading more...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  )
}
