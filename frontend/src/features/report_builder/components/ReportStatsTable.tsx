import { useEffect, useState } from 'react'
import { getPlayer } from '../../../services/api'

export default function ReportStatsTable({ playerId }: { playerId: number }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      getPlayer(playerId).then(setData).catch(() => {})
    }
  }, [playerId])

  if (!data) return <div className="p-4 text-center text-[var(--color-text-muted)] print:text-gray-500">Loading stats...</div>

  const s = data.stats

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] print:bg-white print:border-gray-300 print:text-black">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)] print:text-black">Season Statistics ({data.player.season_name})</h3>
      
      <div className="grid grid-cols-4 gap-4 text-sm">
        {/* General */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Matches:</span> <span className="font-semibold">{s.appearances || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Minutes:</span> <span className="font-semibold">{s.minutes_played || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Avg Rating:</span> <span className="font-semibold text-[var(--color-accent-primary)]">{s.rating?.toFixed(2) || '—'}</span></div>
        </div>

        {/* Attacking */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Goals:</span> <span className="font-semibold">{s.goals || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Assists:</span> <span className="font-semibold">{s.assists || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">xG:</span> <span className="font-semibold">{s.expected_goals?.toFixed(2) || '—'}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">xA:</span> <span className="font-semibold">{s.expected_assists?.toFixed(2) || '—'}</span></div>
        </div>

        {/* Passing & Creation */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Key Passes:</span> <span className="font-semibold">{s.key_passes || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Big Chances:</span> <span className="font-semibold">{s.big_chances_created || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Pass Acc:</span> <span className="font-semibold">{s.accurate_passes_pct ? `${s.accurate_passes_pct}%` : '—'}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Succ Dribbles:</span> <span className="font-semibold">{s.dribbles_won || 0}</span></div>
        </div>

        {/* Defending */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Tackles:</span> <span className="font-semibold">{s.tackles || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Interceptions:</span> <span className="font-semibold">{s.interceptions || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Clearances:</span> <span className="font-semibold">{s.clearances || 0}</span></div>
          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)] print:text-gray-600">Duels Won:</span> <span className="font-semibold">{s.duels_won_pct ? `${s.duels_won_pct}%` : '—'}</span></div>
        </div>
      </div>
    </div>
  )
}
