import { useEffect, useState } from 'react'
import { getPlayer } from '../../../services/api'
import { usePlayerStore } from '../../../store/playerStore'

export default function ReportStatsTable({ playerId, config }: { playerId: number, config?: any }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      getPlayer(playerId).then(setData).catch(() => { })
    }
  }, [playerId])

  const globalDisplayMode = usePlayerStore(state => state.displayMode)
  const displayMode = config?.displayMode || globalDisplayMode

  if (!data) return <div className="p-4 text-center text-[var(--color-text-muted)]">Loading stats...</div>

  const findStat = () => {
    let statsList = data.stats || []
    if (config?.playerLeague && config.playerLeague !== 'Total') {
      statsList = statsList.filter((st: any) => st.tournament_name === config.playerLeague)
    }
    // Filter by season or 'Total'
    let targetRows = []
    if (config?.playerSeason === 'Total') {
      targetRows = statsList.filter((st: any) => st.accumulation === 'total')
    } else {
      targetRows = statsList.filter((st: any) => st.season_name === config?.playerSeason)
    }

    const filteredTargetRows = targetRows.filter((st: any) => st.tournament_name?.toLowerCase() !== 'total')
    if (filteredTargetRows.length > 0) {
      targetRows = filteredTargetRows
    }

    if (targetRows.length === 0) return {}
    if (targetRows.length === 1) return targetRows[0]

    // Aggregate
    const agg: any = { ...targetRows[0] }
    const keysToSum = [
      'appearances', 'minutes_played', 'goals', 'assists', 'key_passes', 
      'accurate_passes', 'total_passes', 'total_shots', 'shots_on_target', 
      'dribbles_won', 'dribbles_attempted', 'tackles', 'interceptions', 
      'clearances', 'aerial_duels_won', 'aerial_duels_total', 'ground_duels_won', 
      'ground_duels_total', 'total_duels_won', 'expected_goals', 'expected_assists'
    ]
    for (const k of keysToSum) agg[k] = 0
    let totalMinutes = 0
    let weightedRatingSum = 0

    for (const r of targetRows) {
      for (const k of keysToSum) {
        agg[k] += (r[k] || 0)
      }
      totalMinutes += (r.minutes_played || 0)
      weightedRatingSum += (r.rating || 0) * (r.minutes_played || 0)
    }
    
    agg.rating = totalMinutes > 0 ? weightedRatingSum / totalMinutes : 0
    agg.accurate_passes_pct = agg.total_passes > 0 ? (agg.accurate_passes / agg.total_passes) * 100 : 0
    agg.dribbles_won_pct = agg.dribbles_attempted > 0 ? (agg.dribbles_won / agg.dribbles_attempted) * 100 : 0
    agg.aerial_duels_won_pct = agg.aerial_duels_total > 0 ? (agg.aerial_duels_won / agg.aerial_duels_total) * 100 : 0
    agg.ground_duels_won_pct = agg.ground_duels_total > 0 ? (agg.ground_duels_won / agg.ground_duels_total) * 100 : 0
    
    agg.season_name = config?.season === 'Total' ? 'Total' : config.season
    return agg
  }
  const s = findStat()

  const formatStat = (val: number | undefined, key: string) => {
    if (val == null) return '—'
    if (key.endsWith('_pct')) return `${Number(val).toFixed(1)}%`
    if (['appearances', 'minutes_played'].includes(key)) return val.toString()

    if (displayMode === 'total') {
      return Number.isInteger(val) ? val.toString() : Number(val).toFixed(2)
    }
    if (displayMode === 'perGame' || displayMode === 'per_game') {
      const apps = s.appearances || 1
      return (val / apps).toFixed(2)
    }
    if (displayMode === 'per90' || displayMode === 'per_90') {
      const mins = s.minutes_played || 90
      return (val / (mins / 90)).toFixed(2)
    }
    return val.toString()
  }

  const metrics = config?.metrics || [
    'appearances', 'minutes_played', 'rating',
    'goals', 'assists', 'expected_goals', 'expected_assists',
    'key_passes', 'big_chances_created', 'accurate_passes_pct', 'dribbles_won',
    'tackles', 'interceptions', 'clearances', 'total_duels_won_pct'
  ]
  const columns = config?.columns || 4

  const columnGroups: string[][] = []
  const chunkSize = Math.ceil(metrics.length / columns)
  for (let i = 0; i < columns; i++) {
    columnGroups.push(metrics.slice(i * chunkSize, (i + 1) * chunkSize))
  }

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] flex-1 flex flex-col">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)]">
        {config?.title || `Season Statistics (${s.season_name || ''})`}
      </h3>

      <div className="grid gap-6 text-sm flex-1" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))` }}>
        {columnGroups.map((group, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-1">
            {group.map(key => (
              <div key={key} className="flex justify-between gap-3">
                <span className="text-[var(--color-text-secondary)] capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className={`font-semibold ${key === 'rating' ? 'text-[var(--color-accent-primary)]' : ''}`}>{formatStat(s[key], key)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
