import { useEffect, useState, useCallback } from 'react'
import { getPlayers, getPositions, getLeagues, getNationalities, getTeams, getSeasons } from '../../services/api'
import { usePlayerStore } from '../../store/playerStore'

interface FilterOptions {
  positions: { general: string[]; specific: string[] }
  leagues: string[]
  nationalities: string[]
  teams: string[]
  seasons: string[]
}

export default function ExplorerPage() {
  const store = usePlayerStore()
  const [data, setData] = useState<{ data: any[]; total: number; total_pages: number }>({
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
  })
  const [loading, setLoading] = useState(false)

  // Load filter options
  useEffect(() => {
    Promise.all([getPositions(), getLeagues(), getNationalities(), getTeams(), getSeasons()])
      .then(([pos, leagues, nats, teams, seasons]) => {
        setFilterOpts({ positions: pos, leagues, nationalities: nats, teams, seasons })
      })
      .catch(() => {})
  }, [])

  // Fetch players when filters change
  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPlayers({
        page: store.page,
        page_size: store.pageSize,
        name: store.name || undefined,
        position: store.position || undefined,
        specific_position: store.specificPosition || undefined,
        nationality: store.nationality || undefined,
        team: store.team || undefined,
        league: store.league || undefined,
        season: store.season || undefined,
        age_min: store.ageMin,
        age_max: store.ageMax,
        minutes_min: store.minutesMin,
        minutes_max: store.minutesMax,
        sort_by: store.sortBy,
        sort_dir: store.sortDir,
      })
      setData(result)
    } catch {
      setData({ data: [], total: 0, total_pages: 1 })
    }
    setLoading(false)
  }, [store])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleSort = (col: string) => {
    if (store.sortBy === col) {
      store.setFilter('sortDir', store.sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      store.setFilter('sortBy', col)
      store.setFilter('sortDir', 'asc')
    }
  }

  const sortIcon = (col: string) => {
    if (store.sortBy !== col) return ''
    return store.sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const columns = [
    { key: 'name', label: 'Player' },
    { key: 'age', label: 'Age' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'minutes_played', label: 'Minutes' },
    { key: 'specific_position', label: 'Position' },
    { key: 'team', label: 'Club' },
    { key: 'tournament_name', label: 'League' },
    { key: 'season_name', label: 'Season' },
    { key: 'goals', label: 'G' },
    { key: 'assists', label: 'A' },
    { key: 'rating', label: 'Rating' },
    { key: 'role', label: 'Role' },
    { key: 'role_score', label: 'Role Score' },
    { key: 'league_score', label: 'League Score' },
    { key: 'world_score', label: 'World Score' },
  ]

  return (
    <div className="h-full flex flex-col p-6 gap-5 animate-fade-in">
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
        <button onClick={() => store.resetFilters()} className="btn-ghost text-xs">
          Reset Filters
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search name..."
            className="input-dark col-span-2"
            value={store.name}
            onChange={(e) => store.setFilter('name', e.target.value)}
          />

          {/* Position */}
          <select
            className="input-dark"
            value={store.position}
            onChange={(e) => store.setFilter('position', e.target.value)}
          >
            <option value="">All Positions</option>
            {filterOpts.positions.general.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* League */}
          <select
            className="input-dark"
            value={store.league}
            onChange={(e) => store.setFilter('league', e.target.value)}
          >
            <option value="">All Leagues</option>
            {filterOpts.leagues.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Season */}
          <select
            className="input-dark"
            value={store.season}
            onChange={(e) => store.setFilter('season', e.target.value)}
          >
            <option value="">All Seasons</option>
            {filterOpts.seasons.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Nationality */}
          <select
            className="input-dark"
            value={store.nationality}
            onChange={(e) => store.setFilter('nationality', e.target.value)}
          >
            <option value="">All Nationalities</option>
            {filterOpts.nationalities.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

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
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Age min"
              className="input-dark w-full"
              value={store.ageMin ?? ''}
              onChange={(e) => store.setFilter('ageMin', e.target.value ? +e.target.value : undefined)}
            />
            <span style={{ color: 'var(--color-text-muted)' }}>–</span>
            <input
              type="number"
              placeholder="max"
              className="input-dark w-full"
              value={store.ageMax ?? ''}
              onChange={(e) => store.setFilter('ageMax', e.target.value ? +e.target.value : undefined)}
            />
          </div>

          {/* Minutes range */}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min played"
              className="input-dark w-full"
              value={store.minutesMin ?? ''}
              onChange={(e) => store.setFilter('minutesMin', e.target.value ? +e.target.value : undefined)}
            />
            <span style={{ color: 'var(--color-text-muted)' }}>–</span>
            <input
              type="number"
              placeholder="max"
              className="input-dark w-full"
              value={store.minutesMax ?? ''}
              onChange={(e) => store.setFilter('minutesMax', e.target.value ? +e.target.value : undefined)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card flex-1 overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)}>
                  {col.label}{sortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
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
                  <td className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.name}</td>
                  <td>{p.age ?? '—'}</td>
                  <td>{p.nationality ?? '—'}</td>
                  <td>{p.minutes_played ?? '—'}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                      background: 'var(--color-surface-600)',
                      color: 'var(--color-accent-cyan)',
                    }}>
                      {p.specific_position || p.position || '—'}
                    </span>
                  </td>
                  <td>{p.team ?? '—'}</td>
                  <td>{p.tournament_name ?? '—'}</td>
                  <td>{p.season_name ?? '—'}</td>
                  <td style={{ color: 'var(--color-accent-green)' }}>{p.goals ?? '—'}</td>
                  <td style={{ color: 'var(--color-accent-amber)' }}>{p.assists ?? '—'}</td>
                  <td>{p.rating ? Number(p.rating).toFixed(2) : '—'}</td>
                  <td className="text-xs">{p.role ?? '—'}</td>
                  <td>{p.role_score ? Number(p.role_score).toFixed(2) : '—'}</td>
                  <td>{p.league_score ? Number(p.league_score).toFixed(2) : '—'}</td>
                  <td>{p.world_score ? Number(p.world_score).toFixed(2) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


    </div>
  )
}
