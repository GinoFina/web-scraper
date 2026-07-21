import { useEffect, useState } from 'react'
import { getPlayerCard, getProxyImageUrl } from '../../../services/api'

export default function ReportPlayerCard({ playerId }: { playerId: number }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      getPlayerCard(playerId).then(setData).catch(() => {})
    }
  }, [playerId])

  if (!data) return <div className="p-4 text-center text-[var(--color-text-muted)] print:text-gray-500">Loading player data...</div>

  const p = data.player

  return (
    <div className="flex gap-4 p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-800)] print:border-gray-300 print:bg-white print:text-black">
      {data.images.player && (
        <img 
          src={getProxyImageUrl(data.images.player)} 
          alt={p.name} 
          className="w-24 h-24 object-cover rounded bg-[var(--color-surface-700)] print:bg-gray-100" 
          crossOrigin="anonymous"
        />
      )}
      <div className="flex-1">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {p.name}
          {data.images.flag && <img src={getProxyImageUrl(data.images.flag)} alt="flag" className="w-6 h-auto" crossOrigin="anonymous" />}
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-[var(--color-text-secondary)] print:text-gray-600">
          <div><strong className="text-[var(--color-text-primary)] print:text-black">Age:</strong> {p.age || '—'}</div>
          <div><strong className="text-[var(--color-text-primary)] print:text-black">Height:</strong> {p.height ? `${p.height} cm` : '—'}</div>
          <div><strong className="text-[var(--color-text-primary)] print:text-black">Position:</strong> {p.specific_position || p.position || '—'}</div>
          <div><strong className="text-[var(--color-text-primary)] print:text-black">Foot:</strong> {p.foot || '—'}</div>
        </div>
      </div>
      {data.images.team && (
        <div className="flex flex-col items-center justify-center border-l pl-4 border-[var(--color-border)] print:border-gray-200">
          <img src={getProxyImageUrl(data.images.team)} alt={p.team} className="w-16 h-16 object-contain" crossOrigin="anonymous" />
          <span className="text-xs font-semibold mt-1 text-center w-24 truncate">{p.team}</span>
        </div>
      )}
    </div>
  )
}
