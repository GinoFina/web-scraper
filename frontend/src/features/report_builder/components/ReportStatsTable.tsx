import { useEffect, useState } from 'react'
import { getPlayer } from '../../../services/api'
import { usePlayerStore } from '../../../store/playerStore'

export default function ReportStatsTable({ playerId }: { playerId: number }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      getPlayer(playerId).then(setData).catch(() => {})
    }
  }, [playerId])

  const displayMode = usePlayerStore(state => state.displayMode)

  if (!data) return <div className="p-4 text-center text-[var(--color-text-muted)] print:text-gray-500">Loading stats...</div>

  const s = data.stats?.[0] || {}

  const formatStat = (val: number | undefined) => {
    if (val == null) return '—'
    if (displayMode === 'total') {
      return Number.isInteger(val) ? val.toString() : Number(val).toFixed(2)
    }
    if (displayMode === 'perGame') {
      const apps = s.appearances || 1
      return (val / apps).toFixed(2)
    }
    if (displayMode === 'per90') {
      const mins = s.minutes_played || 90
      return (val / (mins / 90)).toFixed(2)
    }
    return val.toString()
  }

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] print:bg-white print:border-gray-300 print:text-black">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)] print:text-black">Season Statistics ({s.season_name || ''})</h3>
      
      <div className="grid grid-cols-4 gap-4 text-sm">
        {/* General */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Matches:</span> <span className="font-semibold">{s.appearances || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Minutes:</span> <span className="font-semibold">{s.minutes_played || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Avg Rating:</span> <span className="font-semibold text-[var(--color-accent-primary)]">{s.rating?.toFixed(2) || '—'}</span></div>
        </div>

        {/* Attacking */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Goals:</span> <span className="font-semibold">{formatStat(s.goals)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Assists:</span> <span className="font-semibold">{formatStat(s.assists)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">xG:</span> <span className="font-semibold">{formatStat(s.expected_goals ?? s.raw_json?.expectedGoals)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">xA:</span> <span className="font-semibold">{formatStat(s.expected_assists ?? s.raw_json?.expectedAssists)}</span></div>
        </div>

        {/* Passing & Creation */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Key Passes:</span> <span className="font-semibold">{formatStat(s.key_passes)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Big Chances:</span> <span className="font-semibold">{formatStat(s.big_chances_created)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Pass Acc:</span> <span className="font-semibold">{s.accurate_passes_pct ? `${Number(s.accurate_passes_pct).toFixed(1)}%` : '—'}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Succ Dribbles:</span> <span className="font-semibold">{formatStat(s.dribbles_won)}</span></div>
        </div>

        {/* Defending */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Tackles:</span> <span className="font-semibold">{formatStat(s.tackles)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Interceptions:</span> <span className="font-semibold">{formatStat(s.interceptions)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Clearances:</span> <span className="font-semibold">{formatStat(s.clearances)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Duels Won:</span> <span className="font-semibold">{s.total_duels_won_pct ? `${Number(s.total_duels_won_pct).toFixed(1)}%` : '—'}</span></div>
        </div>
      </div>
    </div>
  )
}
