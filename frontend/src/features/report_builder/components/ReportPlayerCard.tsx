import { useEffect, useState } from 'react'
import { getPlayerCard, getProxyImageUrl } from '../../../services/api'

export default function ReportPlayerCard({ playerId }: { playerId: number }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let isMounted = true
    if (playerId) {
      getPlayerCard(playerId).then((res) => {
        if (isMounted) setData(res)
      }).catch(() => {})
    }
    return () => { isMounted = false }
  }, [playerId])

  if (!data) return <div className="p-4 text-center text-[var(--color-text-muted)]">Loading player data...</div>
  if (data.error || !data.player) return <div className="p-4 text-center text-red-500">Player not found or data error.</div>

  const p = data.player

  return (
    <div className="flex gap-4 p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-800)]">
      {data.images.player && (
        <img 
          src={getProxyImageUrl(data.images.player)} 
          alt={p.name} 
          className="w-24 h-24 object-cover rounded bg-[var(--color-surface-700)]" 
          crossOrigin="anonymous"
        />
      )}
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
          {p.name}
          {data.images.flag && <img src={getProxyImageUrl(data.images.flag)} alt="flag" className="w-6 h-auto" crossOrigin="anonymous" />}
          {data.stats?.[0]?.role && (
            <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-2">
              {data.stats[0].role.replace(/_/g, ' ')}
            </span>
          )}
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-[var(--color-text-secondary)]">
          <div><strong className="text-[var(--color-text-primary)]">Age:</strong> {p.age || '—'}</div>
          <div><strong className="text-[var(--color-text-primary)]">Height:</strong> {p.height ? `${p.height} cm` : '—'}</div>
          <div><strong className="text-[var(--color-text-primary)]">Position:</strong> {p.specific_position || p.position || '—'}</div>
          <div><strong className="text-[var(--color-text-primary)]">Foot:</strong> {p.foot || '—'}</div>
        </div>
      </div>
      {data.images.team && (
        <div className="flex flex-col items-center justify-center border-l pl-4 border-[var(--color-border)]">
          <img src={getProxyImageUrl(data.images.team)} alt={p.team} className="w-16 h-16 object-contain" crossOrigin="anonymous" />
          <span className="text-xs font-semibold mt-1 text-center w-24 truncate">{p.team}</span>
        </div>
      )}
    </div>
  )
}
