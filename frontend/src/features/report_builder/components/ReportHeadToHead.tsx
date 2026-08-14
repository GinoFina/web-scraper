import { useEffect, useState } from 'react'
import { getRadarData, getPlayerCard, getProxyImageUrl } from '../../../services/api'

export default function ReportHeadToHead({ playerId, config }: { playerId: number, config?: any }) {
  const [p1Data, setP1Data] = useState<any>(null)
  const [p2Data, setP2Data] = useState<any>(null)
  
  const [p1Info, setP1Info] = useState<any>(null)
  const [p2Info, setP2Info] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      getPlayerCard(playerId).then(res => {
        if (res && !res.error) setP1Info(res)
      })
      const metricList = Array.isArray(config?.metrics) ? config.metrics.join(',') : (config?.metrics || '')
      getRadarData(
        playerId, metricList, config?.playerLeague, config?.playerSeason, 
        config?.displayMode, config?.comparisonPosition,
        config?.ageMin, config?.ageMax, config?.minutesMin, config?.minutesMax,
        config?.comparisonLeagues === 'Total' ? undefined : config?.comparisonLeagues,
        config?.comparisonSeasons === 'Total' ? undefined : config?.comparisonSeasons
      ).then(setP1Data).catch(() => {})
    }
  }, [playerId, config])

  useEffect(() => {
    if (config?.player2Id) {
      getPlayerCard(config.player2Id).then(res => {
        if (res && !res.error) setP2Info(res)
      })
      const metricList = Array.isArray(config?.metrics) ? config.metrics.join(',') : (config?.metrics || '')
      getRadarData(
        config.player2Id, metricList, config?.player2League || 'Total', config?.player2Season || 'Total', 
        config?.displayMode, config?.comparisonPosition,
        config?.ageMin, config?.ageMax, config?.minutesMin, config?.minutesMax,
        config?.comparisonLeagues === 'Total' ? undefined : config?.comparisonLeagues,
        config?.comparisonSeasons === 'Total' ? undefined : config?.comparisonSeasons
      ).then(setP2Data).catch(() => {})
    }
  }, [config?.player2Id, config])

  if (!config?.player2Id) {
    return (
      <div className="flex flex-col h-full w-full bg-[var(--color-surface-800)] rounded-xl border border-dashed border-[var(--color-border)] p-4 items-center justify-center text-center">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">Head-to-Head Comparison</h3>
        <p className="text-xs text-[var(--color-text-muted)]">Please select a second player in the right sidebar configuration.</p>
      </div>
    )
  }

  if (!p1Data || !p2Data || !p1Data.metrics || !p2Data.metrics || !p1Info || !p2Info) {
    return <div className="p-4 text-center text-[var(--color-text-muted)] h-full flex items-center justify-center">Loading comparison data...</div>
  }

  // Map metrics so they match by key
  const p1Map = new Map(p1Data.metrics.map((m: any) => [m.key, m]))
  const p2Map = new Map(p2Data.metrics.map((m: any) => [m.key, m]))

  const allMetrics = p1Data.metrics.map((m: any) => {
    const p2m = p2Map.get(m.key) || { percentile: 0, value: 0 }
    return {
      key: m.key,
      label: m.label,
      p1Val: m.percentile,
      p2Val: p2m.percentile,
      p1Raw: m.value,
      p2Raw: p2m.value
    }
  })

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-800)] rounded-xl border border-[var(--color-border)] p-4 overflow-hidden relative">
      {config?.title && <h3 className="text-sm font-bold text-center mb-4 text-[var(--color-text-primary)]">{config.title}</h3>}
      
      {/* Header section */}
      <div className="flex justify-between items-stretch mb-6 gap-4">
        {/* Player 1 Compact Card */}
        <div className="flex-1 flex gap-2 items-center p-2 rounded bg-[var(--color-surface-900)] border border-[var(--color-border)]">
          {p1Info.images?.player ? (
            <img src={getProxyImageUrl(p1Info.images.player)} alt={p1Info.player.name} className="w-12 h-12 object-cover rounded bg-[var(--color-surface-700)]" crossOrigin="anonymous" />
          ) : (
            <div className="w-12 h-12 rounded bg-[var(--color-surface-700)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-surface-500)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-xs font-bold flex items-center gap-1 text-[var(--color-text-primary)]">
              {p1Info.player.name}
              {p1Info.images?.flag && <img src={getProxyImageUrl(p1Info.images.flag)} alt="flag" className="h-3 w-4 object-contain" crossOrigin="anonymous" />}
            </h2>
            <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
              Pos: {p1Info.player.specific_position || p1Info.player.position || '—'} | Age: {p1Info.player.age || '—'}
            </div>
          </div>
          {p1Info.images?.team && (
            <div className="pl-2 border-l border-[var(--color-border)] flex items-center justify-center">
              <img src={getProxyImageUrl(p1Info.images.team)} alt="team" className="w-8 h-8 object-contain" crossOrigin="anonymous" />
            </div>
          )}
        </div>

        {/* Player 2 Compact Card */}
        <div className="flex-1 flex gap-2 items-center p-2 rounded bg-[var(--color-surface-900)] border border-[var(--color-border)]">
          {p2Info.images?.team && (
            <div className="pr-2 border-r border-[var(--color-border)] flex items-center justify-center">
              <img src={getProxyImageUrl(p2Info.images.team)} alt="team" className="w-8 h-8 object-contain" crossOrigin="anonymous" />
            </div>
          )}
          <div className="flex-1 flex flex-col justify-center items-end text-right">
            <h2 className="text-xs font-bold flex items-center gap-1 text-[var(--color-text-primary)] flex-row-reverse">
              {p2Info.player.name}
              {p2Info.images?.flag && <img src={getProxyImageUrl(p2Info.images.flag)} alt="flag" className="h-3 w-4 object-contain" crossOrigin="anonymous" />}
            </h2>
            <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
              Age: {p2Info.player.age || '—'} | Pos: {p2Info.player.specific_position || p2Info.player.position || '—'}
            </div>
          </div>
          {p2Info.images?.player ? (
            <img src={getProxyImageUrl(p2Info.images.player)} alt={p2Info.player.name} className="w-12 h-12 object-cover rounded bg-[var(--color-surface-700)]" crossOrigin="anonymous" />
          ) : (
            <div className="w-12 h-12 rounded bg-[var(--color-surface-700)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-surface-500)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Center Glow line */}
      <div className="absolute left-1/2 top-[120px] bottom-4 w-px bg-white/20 transform -translate-x-1/2 z-0" />
      <div className="absolute left-1/2 top-1/2 w-4 h-3/4 bg-white/10 blur-xl transform -translate-x-1/2 -translate-y-1/2 z-0 rounded-full" />

      {/* Chart */}
      <div className="flex flex-col gap-4 flex-1 overflow-y-auto mt-2 z-10 relative px-2">
        {allMetrics.map((m: any) => {
          // Values are percentiles 0-100
          const val1 = m.p1Val
          const val2 = m.p2Val
          
          const p1Wins = val1 >= val2
          const p2Wins = val2 >= val1

          const p1Color = p1Wins ? 'var(--color-accent-green)' : 'var(--color-accent-red)'
          const p2Color = p2Wins ? 'var(--color-accent-green)' : 'var(--color-accent-red)'

          const p1Width = `${val1}%`
          const p2Width = `${val2}%`

          return (
            <div key={m.key} className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--color-text-primary)]">
                {m.label}
              </span>
              
              <div className="flex w-full items-center justify-center gap-[2px]">
                {/* P1 Bar (Right to Left) */}
                <div className="flex-1 flex items-center justify-end gap-2">
                  {/* Outside label: Raw absolute value */}
                  <span className="text-[10px] font-bold text-[var(--color-text-primary)] w-8 text-right">
                    {Number.isInteger(m.p1Raw) ? m.p1Raw : m.p1Raw?.toFixed(2) ?? '0'}
                  </span>
                  
                  <div className="h-[14px] bg-[var(--color-surface-900)] relative flex justify-end w-full rounded-l border border-r-0 border-[var(--color-surface-700)] overflow-hidden">
                    <div 
                      className="h-full rounded-l transition-all duration-1000 ease-out flex items-center justify-center overflow-hidden px-1"
                      style={{ 
                        width: p1Width, 
                        backgroundColor: p1Color,
                        boxShadow: p1Wins ? `0 0 10px ${p1Color}60` : 'none',
                        direction: 'rtl'
                      }} 
                    >
                      {/* Inside label: Percentile */}
                      <span className="text-[9px] font-black text-white" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                        {val1.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* P2 Bar (Left to Right) */}
                <div className="flex-1 flex items-center justify-start gap-2">
                  <div className="h-[14px] bg-[var(--color-surface-900)] relative w-full rounded-r border border-l-0 border-[var(--color-surface-700)] overflow-hidden">
                    <div 
                      className="h-full rounded-r transition-all duration-1000 ease-out flex items-center justify-center overflow-hidden px-1"
                      style={{ 
                        width: p2Width, 
                        backgroundColor: p2Color,
                        boxShadow: p2Wins ? `0 0 10px ${p2Color}60` : 'none'
                      }} 
                    >
                      {/* Inside label: Percentile */}
                      <span className="text-[9px] font-black text-white" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                        {val2.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Outside label: Raw absolute value */}
                  <span className="text-[10px] font-bold text-[var(--color-text-primary)] w-8 text-left">
                    {Number.isInteger(m.p2Raw) ? m.p2Raw : m.p2Raw?.toFixed(2) ?? '0'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
