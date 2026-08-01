import { useState, useEffect } from 'react'
import { DroppedItem, useReportStore } from '../../../store/reportStore'
import { getPlayer, getMetrics, getLeagues, getSeasons } from '../../../services/api'
import PlayerAutocomplete from './PlayerAutocomplete'

const STATS_CATEGORIES = [
  { name: 'Generales', keys: ['appearances', 'minutes_played', 'goals', 'assists', 'rating'] },
  { name: 'Pases y Creación', keys: ['accurate_passes', 'key_passes', 'big_chances_created', 'accurate_long_balls', 'total_long_balls', 'accurate_crosses', 'expected_assists'] },
  { name: 'Derivados de Pases', keys: ['accurate_passes_pct', 'accurate_long_balls_pct', 'accurate_crosses_pct', 'total_passes', 'total_crosses'] },
  { name: 'Tiros y Finalización', keys: ['penalty_goals', 'shots_on_target', 'shots_off_target', 'blocked_scoring_attempt', 'big_chances_missed', 'total_shots', 'expected_goals'] },
  { name: 'Regates', keys: ['dribbles_won', 'dribbles_attempted', 'dribbles_won_pct'] },
  { name: 'Duelos Aéreos y Terrestres', keys: ['aerial_duels_won', 'aerial_duels_total', 'aerial_duels_won_pct', 'ground_duels_won', 'ground_duels_total', 'ground_duels_won_pct'] },
  { name: 'Duelos Totales', keys: ['total_duels_won', 'total_duels_won_pct'] },
  { name: 'Defensa', keys: ['tackles', 'interceptions', 'clearances', 'blocked_shots', 'dispossessed', 'offsides', 'possession_lost'] }
]

interface Props {
  item: DroppedItem
  onClose: () => void
  onSave: (config: any) => void
}

export default function ComponentConfigModal({ item, onClose, onSave }: Props) {
  const playerId = useReportStore(s => s.playerId)
  const [config, setConfig] = useState<any>(item.config || {})

  const [title, setTitle] = useState(config.title || '')

  const [availableMetrics, setAvailableMetrics] = useState<{ key: string, label: string }[]>([])

  // Scatter State
  const [xAxis, setXAxis] = useState(config.xAxis || 'expected_goals')
  const [yAxis, setYAxis] = useState(config.yAxis || 'goals')

  // Radar State
  const [radarOptions, setRadarOptions] = useState<{ label: string, id: string }[]>([])
  const [selectedRadar, setSelectedRadar] = useState<string[]>(config.metrics || (item.type === 'PercentileBars' ? ['goals'] : ['goals', 'assists', 'key_passes', 'accurate_passes_pct', 'dribbles_won', 'tackles', 'interceptions', 'aerial_duels_won']))
  const [comparisonPosition, setComparisonPosition] = useState<string>(config.comparisonPosition || '')

  // Stats State
  const [selectedStats, setSelectedStats] = useState<string[]>(config.metrics || STATS_CATEGORIES.reduce((acc: string[], c) => acc.concat(c.keys), []).slice(0, 15))
  const [columns, setColumns] = useState<number>(config.columns || 4)

  // Filter State
  const [playerStats, setPlayerStats] = useState<any[]>([])
  const [playerLeague, setPlayerLeague] = useState<string>(config.playerLeague || config.league || 'Total')
  const [playerSeason, setPlayerSeason] = useState<string>(config.playerSeason || config.season || 'Total')

  const [comparisonLeagues, setComparisonLeagues] = useState<string[]>(config.comparisonLeagues ? config.comparisonLeagues.split(',') : (config.league && config.league !== 'Total' ? config.league.split(',') : []))
  const [comparisonSeasons, setComparisonSeasons] = useState<string[]>(config.comparisonSeasons ? config.comparisonSeasons.split(',') : (config.season && config.season !== 'Total' ? config.season.split(',') : []))
  const [displayMode, setDisplayMode] = useState<string>(config.displayMode || 'total')

  const [allLeagues, setAllLeagues] = useState<string[]>([])
  const [allSeasons, setAllSeasons] = useState<string[]>([])
  const [isCompLeagueOpen, setIsCompLeagueOpen] = useState(false)
  const [isCompSeasonOpen, setIsCompSeasonOpen] = useState(false)

  const [ageMin, setAgeMin] = useState<number | undefined>(config.ageMin)
  const [ageMax, setAgeMax] = useState<number | undefined>(config.ageMax)
  const [minutesMin, setMinutesMin] = useState<number | undefined>(config.minutesMin)
  const [minutesMax, setMinutesMax] = useState<number | undefined>(config.minutesMax)

  // HeadToHead State
  const [player2Id, setPlayer2Id] = useState<number | null>(config.player2Id || null)
  const [player2League, setPlayer2League] = useState<string>(config.player2League || 'Total')
  const [player2Season, setPlayer2Season] = useState<string>(config.player2Season || 'Total')
  const [player2Stats, setPlayer2Stats] = useState<any[]>([])

  useEffect(() => {
    if (['ScatterPlot', 'RadarChart', 'PercentileBars', 'HeadToHead'].includes(item.type)) {
      getMetrics().then((res: any) => {
        if (res && res.length > 0) {
          const formatted = res.map((m: any) => ({ key: m.key, label: m.label }))
          setAvailableMetrics(formatted)
          if (item.type === 'RadarChart' && radarOptions.length === 0) {
            setRadarOptions(res.map((m: any) => ({ id: m.key, label: m.label })))
          }
        }
      }).catch(console.error)
    }

    getLeagues().then((res: any) => {
      if (res && res.length > 0) {
        setAllLeagues(res.map((l: any) => typeof l === 'string' ? l : l.name || String(l)).filter((l: string) => l && l.toLowerCase() !== 'total'))
      }
    }).catch(console.error)

    getSeasons().then((res: any) => {
      if (res && res.length > 0) {
        setAllSeasons(res.map((s: any) => typeof s === 'string' ? s : s.name || String(s)).filter((s: string) => s && s.toLowerCase() !== 'total'))
      }
    }).catch(console.error)

    getPlayer(playerId).then(res => {
      if (res && res.stats) {
        setPlayerStats(res.stats)
      }
    })

    if (player2Id) {
      getPlayer(player2Id).then(res => {
        if (res && res.stats) setPlayer2Stats(res.stats)
      })
    }
  }, [playerId, player2Id, item.type, radarOptions.length])

  const playerPlayedLeagues = Array.from(new Set(
    playerStats
      .filter(s => playerSeason === 'Total' || s.season_name === playerSeason)
      .map(s => s.tournament_name)
      .filter(l => l && l.toLowerCase() !== 'total')
  ))
  const playerPlayedSeasons = Array.from(new Set(
    playerStats
      .filter(s => playerLeague === 'Total' || s.tournament_name === playerLeague)
      .map(s => s.season_name)
      .filter(s => s && s.toLowerCase() !== 'total')
  ))

  const p2PlayedLeagues = Array.from(new Set(
    player2Stats.filter(s => player2Season === 'Total' || s.season_name === player2Season).map(s => s.tournament_name).filter(l => l && l.toLowerCase() !== 'total')
  ))
  const p2PlayedSeasons = Array.from(new Set(
    player2Stats.filter(s => player2League === 'Total' || s.tournament_name === player2League).map(s => s.season_name).filter(s => s && s.toLowerCase() !== 'total')
  ))

  const combinedLeagues = Array.from(new Set([...playerPlayedLeagues, ...p2PlayedLeagues, ...allLeagues])).sort()
  const combinedSeasons = Array.from(new Set([...playerPlayedSeasons, ...p2PlayedSeasons, ...allSeasons])).sort()

  const handleSave = () => {
    const baseConfig = {
      title, playerLeague, playerSeason, displayMode,
      comparisonLeagues: comparisonLeagues.length > 0 ? comparisonLeagues.join(',') : 'Total',
      comparisonSeasons: comparisonSeasons.length > 0 ? comparisonSeasons.join(',') : 'Total',
      ageMin, ageMax, minutesMin, minutesMax
    }
    if (item.type === 'ScatterPlot') {
      onSave({ ...baseConfig, xAxis, yAxis, comparisonPosition })
    } else if (item.type === 'RadarChart' || item.type === 'PercentileBars') {
      if (item.type === 'RadarChart' && selectedRadar.length < 3) return alert('Please select at least 3 metrics for the Radar Chart')
      if (item.type === 'PercentileBars' && selectedRadar.length === 0) return alert('Please select a metric')
      onSave({ ...baseConfig, metrics: selectedRadar, comparisonPosition, player2Id, player2League, player2Season })
    } else if (item.type === 'HeadToHead') {
      if (!player2Id) return alert('Please select a second player for the comparison')
      if (selectedRadar.length === 0) return alert('Please select at least one metric')
      onSave({ ...baseConfig, metrics: selectedRadar, player2Id, player2League, player2Season })
    } else if (item.type === 'StatsTable') {
      if (selectedStats.length === 0) return alert('Please select at least 1 statistic')
      onSave({ ...baseConfig, metrics: selectedStats, columns })
    } else {
      onSave({ ...config, ...baseConfig })
    }
  }

  const toggleRadar = (id: string) => {
    setSelectedRadar(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleStat = (key: string) => {
    setSelectedStats(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Configure {item.type}</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition-colors">✕</button>
        </div>

        <div className="px-4 pt-4 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Module Title (Optional)</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Season Statistics" className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]" />
          </div>
          <div className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-surface-900)]">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">FILTROS DEL JUGADOR</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">League Filter</label>
                <select value={playerLeague} onChange={e => setPlayerLeague(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                  <option value="Total">Total</option>
                  {playerPlayedLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Season Filter</label>
                <select value={playerSeason} onChange={e => setPlayerSeason(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                  <option value="Total">Total</option>
                  {playerPlayedSeasons.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Data Display</label>
                <select value={displayMode} onChange={e => setDisplayMode(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                  <option value="total">Total Stats</option>
                  <option value="per_game">Per Game</option>
                  <option value="per_90">Per 90 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          {['HeadToHead', 'RadarChart'].includes(item.type) && (
            <div className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-surface-900)] mt-3">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-[var(--color-accent-primary)] mb-2">FILTROS DEL SEGUNDO JUGADOR (VS)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="col-span-3">
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Select Player 2</label>
                  <PlayerAutocomplete 
                    onChange={(id) => setPlayer2Id(id || null)} 
                    playerId={player2Id || null} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">League Filter (P2)</label>
                  <select value={player2League} onChange={e => setPlayer2League(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                    <option value="Total">Total</option>
                    {p2PlayedLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Season Filter (P2)</label>
                  <select value={player2Season} onChange={e => setPlayer2Season(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                    <option value="Total">Total</option>
                    {p2PlayedSeasons.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {item.type !== 'StatsTable' && item.type !== 'HeadToHead' && (
            <>
              <div className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-surface-900)] mt-3">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">FILTROS GENERALES</h4>
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-3 relative">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Comparison Leagues</label>
                    <div
                      className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white cursor-pointer flex justify-between items-center"
                      onClick={() => setIsCompLeagueOpen(!isCompLeagueOpen)}
                    >
                      <span className="truncate">{comparisonLeagues.length > 0 ? comparisonLeagues.join(', ') : 'Total'}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">▼</span>
                    </div>
                    {isCompLeagueOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-xl max-h-48 overflow-y-auto">
                        <label className="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-700)] cursor-pointer text-sm text-white border-b border-[var(--color-border)]">
                          <input type="checkbox" checked={comparisonLeagues.length === 0} onChange={() => setComparisonLeagues([])} className="rounded bg-[var(--color-surface-900)] border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" />
                          Total
                        </label>
                        {combinedLeagues.map(l => (
                          <label key={l} className="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-700)] cursor-pointer text-sm text-white">
                            <input type="checkbox" checked={comparisonLeagues.includes(l)} onChange={() => {
                              setComparisonLeagues(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
                            }} className="rounded bg-[var(--color-surface-900)] border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" />
                            <span className="truncate">{l}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="col-span-3 relative">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Comparison Seasons</label>
                    <div
                      className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white cursor-pointer flex justify-between items-center"
                      onClick={() => setIsCompSeasonOpen(!isCompSeasonOpen)}
                    >
                      <span className="truncate">{comparisonSeasons.length > 0 ? comparisonSeasons.join(', ') : 'Total'}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">▼</span>
                    </div>
                    {isCompSeasonOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-xl max-h-48 overflow-y-auto">
                        <label className="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-700)] cursor-pointer text-sm text-white border-b border-[var(--color-border)]">
                          <input type="checkbox" checked={comparisonSeasons.length === 0} onChange={() => setComparisonSeasons([])} className="rounded bg-[var(--color-surface-900)] border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" />
                          Total
                        </label>
                        {combinedSeasons.map(s => (
                          <label key={s} className="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-700)] cursor-pointer text-sm text-white">
                            <input type="checkbox" checked={comparisonSeasons.includes(s)} onChange={() => {
                              setComparisonSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
                            }} className="rounded bg-[var(--color-surface-900)] border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" />
                            <span className="truncate">{s}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
              <div className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-surface-900)] mt-3">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">FILTROS DEMOGRÁFICOS Y DE POSICIÓN</h4>
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Average Position</label>
                    <select value={comparisonPosition} onChange={e => setComparisonPosition(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                      <option value="">Auto (Player's Position)</option>
                      <option value="GK">Goalkeeper (GK)</option>
                      <option value="DC">Center Back (CB)</option>
                      <option value="DR">Right Back (RB)</option>
                      <option value="DL">Left Back (LB)</option>
                      <option value="DM">Defensive Mid (DM)</option>
                      <option value="MC">Central Mid (CM)</option>
                      <option value="AM">Attacking Mid (AM)</option>
                      <option value="MR">Right Mid (RM)</option>
                      <option value="ML">Left Mid (LM)</option>
                      <option value="RW">Right Wing (RW)</option>
                      <option value="LW">Left Wing (LW)</option>
                      <option value="ST">Striker (ST)</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Min Age</label>
                    <input type="number" value={ageMin || ''} onChange={e => setAgeMin(e.target.value ? Number(e.target.value) : undefined)} placeholder="Min" className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Max Age</label>
                    <input type="number" value={ageMax || ''} onChange={e => setAgeMax(e.target.value ? Number(e.target.value) : undefined)} placeholder="Max" className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Min Minutes</label>
                    <input type="number" value={minutesMin || ''} onChange={e => setMinutesMin(e.target.value ? Number(e.target.value) : undefined)} placeholder="Min" className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Max Minutes</label>
                    <input type="number" value={minutesMax || ''} onChange={e => setMinutesMax(e.target.value ? Number(e.target.value) : undefined)} placeholder="Max" className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {item.type === 'ScatterPlot' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">X-Axis Metric</label>
                <select value={xAxis} onChange={e => setXAxis(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                  {availableMetrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Y-Axis Metric</label>
                <select value={yAxis} onChange={e => setYAxis(e.target.value)} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                  {availableMetrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {item.type === 'RadarChart' && (
            <div className="space-y-3">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {STATS_CATEGORIES.map(cat => (
                  <div key={cat.name} className="border border-[var(--color-border)] p-2 rounded bg-[var(--color-surface-900)]">
                    <h5 className="font-bold text-[10px] uppercase text-[var(--color-text-primary)] mb-2 border-b border-[var(--color-border)] pb-1">{cat.name}</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.keys.map(key => (
                        <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[var(--color-surface-700)] p-1 rounded">
                          <input type="checkbox" checked={selectedRadar.includes(key)} onChange={() => toggleRadar(key)} className="rounded bg-[var(--color-surface-800)] border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" />
                          <span className="truncate">{key.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.type === 'HeadToHead' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Select metrics to compare head-to-head:</p>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {STATS_CATEGORIES.map(cat => (
                  <div key={cat.name} className="border border-[var(--color-border)] p-2 rounded bg-[var(--color-surface-900)]">
                    <h5 className="font-bold text-[10px] uppercase text-[var(--color-text-primary)] mb-2 border-b border-[var(--color-border)] pb-1">{cat.name}</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.keys.map(key => (
                        <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[var(--color-surface-700)] p-1 rounded">
                          <input type="checkbox" checked={selectedRadar.includes(key)} onChange={() => toggleRadar(key)} className="rounded bg-[var(--color-surface-800)] border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" />
                          <span className="truncate">{key.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.type === 'PercentileBars' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Metric</label>
                <select
                  value={selectedRadar[0] || ''}
                  onChange={e => setSelectedRadar([e.target.value])}
                  className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]"
                >
                  <option value="">Select a metric...</option>
                  {availableMetrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {item.type === 'StatsTable' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Layout (Columns)</label>
                <select value={columns} onChange={e => setColumns(Number(e.target.value))} className="w-full bg-[var(--color-surface-900)] border border-[var(--color-border)] rounded py-1 px-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent-primary)]">
                  <option value={1}>1 Column</option>
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)] mb-2">Select statistics to include:</p>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {STATS_CATEGORIES.map(cat => (
                    <div key={cat.name} className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-surface-900)]">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">{cat.name}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.keys.map(key => (
                          <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[var(--color-surface-700)] p-1 rounded">
                            <input type="checkbox" checked={selectedStats.includes(key)} onChange={() => toggleStat(key)} className="rounded bg-[var(--color-surface-800)] border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" />
                            <span className="truncate">{key.replace(/_/g, ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-3 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-700)] hover:bg-[var(--color-surface-600)] rounded hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-[var(--color-accent-primary)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors">Save Settings</button>
        </div>

      </div>
    </div>
  )
}
