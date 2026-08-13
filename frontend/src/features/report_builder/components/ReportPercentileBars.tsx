import { useEffect, useState } from 'react'
import { getRadarData } from '../../../services/api'

export default function ReportPercentileBars({ playerId, config }: { playerId: number, config?: any }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      const metricList = Array.isArray(config?.metrics) ? config.metrics.join(',') : (config?.metrics || '')
      getRadarData(
        playerId, 
        metricList, 
        config?.playerLeague, 
        config?.playerSeason, 
        config?.displayMode, 
        config?.comparisonPosition,
        config?.ageMin,
        config?.ageMax,
        config?.minutesMin,
        config?.minutesMax,
        config?.comparisonLeagues,
        config?.comparisonSeasons
      ).then(setData).catch(() => { })
    }
  }, [playerId, config])

  if (!data || !data.metrics || data.metrics.length === 0) {
    return <div className="p-4 text-center text-[var(--color-text-muted)]">No data available for the selected filters.</div>
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-800)] rounded-xl border border-[var(--color-border)] p-2 sm:p-3 overflow-hidden justify-center">
      {config?.title && <h3 className="text-sm font-bold text-center mb-2 text-[var(--color-text-primary)]">{config.title}</h3>}
      
      <div className="flex flex-col gap-2">
        {data.metrics.map((m: any) => (
          <div key={m.key} className="border border-[var(--color-border)] rounded-xl p-2 px-3 bg-[var(--color-surface-900)] flex flex-col justify-center shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-1 z-10 relative">
              <span className="text-[11px] font-bold text-[var(--color-text-primary)] truncate pr-2 uppercase" title={m.label}>{m.label}</span>
              <span className="text-[11px] font-bold text-[var(--color-text-primary)] whitespace-nowrap">{m.percentile.toFixed(2)} %</span>
            </div>
            <div className="w-full bg-[var(--color-surface-700)] rounded-full h-3 overflow-hidden shadow-inner z-10 relative border border-[var(--color-border)]">
              <div 
                className="bg-[var(--color-accent-primary)] h-full transition-all duration-1000 ease-out rounded-full" 
                style={{ width: `${Math.max(0, Math.min(100, m.percentile))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
