import { useEffect, useState, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { getScatterData, getMetrics, getPositions, getLeagues, getRadarData } from '../../services/api'
import { useDashboardStore } from '../../store/dashboardStore'
import PitchSelector from './PitchSelector'

export default function DashboardPage() {
  const store = useDashboardStore()
  const [metrics, setMetrics] = useState<{ key: string; label: string; category: string }[]>([])
  const [positions, setPositions] = useState<{ general: string[]; specific: string[] }>({ general: [], specific: [] })
  const [leagues, setLeagues] = useState<string[]>([])
  const [scatterData, setScatterData] = useState<any>(null)
  const [radarData, setRadarData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isLeagueOpen, setIsLeagueOpen] = useState(false)

  useEffect(() => {
    Promise.all([getMetrics(), getPositions(), getLeagues()])
      .then(([m, p, l]) => { setMetrics(m); setPositions(p); setLeagues(l.filter((league: string) => league !== 'Total')) })
      .catch(() => { })
  }, [])

  const fetchScatter = useCallback(async () => {
    setLoading(true)
    try {
      const filters: any = {
        metric_x: store.metricX,
        metric_y: store.metricY,
        position: store.position || undefined,
        top_n: store.topN,
        comparison_league: store.leagues?.length > 0 ? store.leagues.join(',') : undefined,
        team: store.team || undefined,
      }
      if (store.ageMin != null && !isNaN(store.ageMin)) filters.age_min = store.ageMin
      if (store.ageMax != null && !isNaN(store.ageMax)) filters.age_max = store.ageMax
      if (store.minutesMin != null && !isNaN(store.minutesMin)) filters.minutes_min = store.minutesMin
      if (store.minutesMax != null && !isNaN(store.minutesMax)) filters.minutes_max = store.minutesMax

      const result = await getScatterData(filters)
      setScatterData(result)
    } catch {
      setScatterData(null)
    }
    setLoading(false)
  }, [store.metricX, store.metricY, store.position, store.topN, store.ageMin, store.ageMax, store.minutesMin, store.minutesMax, store.leagues, store.team])

  useEffect(() => { fetchScatter() }, [fetchScatter])

  // Load radar for first selected player
  useEffect(() => {
    if (store.selectedPlayers.length > 0) {
      getRadarData(store.selectedPlayers[0]).then(setRadarData).catch(() => setRadarData(null))
    } else {
      setRadarData(null)
    }
  }, [store.selectedPlayers])

  const metricLabel = (key: string) => metrics.find((m) => m.key === key)?.label || key

  // Scatter chart option
  const scatterOption = scatterData ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: any) => `<b>${p.data[3]}</b><br/>${p.data[4]}<br/>${metricLabel(store.metricX)}: ${p.data[0]}<br/>${metricLabel(store.metricY)}: ${p.data[1]}`,
    },
    grid: { left: 80, right: 60, top: 40, bottom: 60 },
    xAxis: {
      name: metricLabel(store.metricX),
      nameLocation: 'middle' as const,
      nameGap: 35,
      nameTextStyle: { color: '#94a3b8', fontSize: 12 },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1c2640' } },
      splitLine: { lineStyle: { color: '#1c2640', type: 'dashed' as const } },
    },
    yAxis: {
      name: metricLabel(store.metricY),
      nameLocation: 'middle' as const,
      nameGap: 45,
      nameTextStyle: { color: '#94a3b8', fontSize: 12 },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1c2640' } },
      splitLine: { lineStyle: { color: '#1c2640', type: 'dashed' as const } },
    },
    series: [
      {
        type: 'scatter',
        data: scatterData.players.map((p: any) => [p.x, p.y, p.player_id, p.name, p.team]),
        symbolSize: 10,
        itemStyle: { color: '#6366f1', borderColor: '#818cf8', borderWidth: 1 },
        emphasis: { itemStyle: { color: '#818cf8', borderWidth: 2, shadowBlur: 12, shadowColor: 'rgba(99,102,241,0.5)' } },
      },
      ...(scatterData.average?.x != null ? [{
        type: 'scatter' as const,
        data: [[scatterData.average.x, scatterData.average.y, 0, scatterData.average.label, '']],
        symbolSize: 16,
        symbol: 'diamond',
        itemStyle: { color: '#fbbf24', borderColor: '#f59e0b', borderWidth: 2 },
        z: 10,
      }, {
        type: 'line' as const,
        markLine: {
          silent: true,
          lineStyle: { color: '#fbbf24', type: 'dashed' as const, opacity: 0.4 },
          data: [
            { xAxis: scatterData.average.x },
            { yAxis: scatterData.average.y },
          ],
        },
        data: [],
      }] : []),
    ],
  } : null

  // Radar chart option
  const radarOption = radarData?.metrics?.length ? {
    backgroundColor: 'transparent',
    radar: {
      indicator: radarData.metrics.map((m: any) => ({ name: m.label, max: 100 })),
      shape: 'polygon' as const,
      axisName: { color: '#94a3b8', fontSize: 10 },
      splitArea: { areaStyle: { color: ['rgba(99,102,241,0.02)', 'rgba(99,102,241,0.05)'] } },
      splitLine: { lineStyle: { color: '#1c2640' } },
      axisLine: { lineStyle: { color: '#1c2640' } },
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: radarData.metrics.map((m: any) => m.percentile),
          name: radarData.player?.name || 'Player',
          areaStyle: { color: 'rgba(99,102,241,0.25)' },
          lineStyle: { color: '#6366f1', width: 2 },
          itemStyle: { color: '#818cf8' },
        },
        {
          value: radarData.metrics.map(() => 50),
          name: radarData.average_label || 'Average',
          areaStyle: { color: 'rgba(251,191,36,0.08)' },
          lineStyle: { color: '#fbbf24', width: 1, type: 'dashed' as const },
          itemStyle: { color: '#fbbf24' },
        },
      ],
    }],
  } : null

  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'scatter') {
        const playerId = params.data[2]
        if (playerId) {
          store.clearPlayers()
          store.togglePlayer(playerId)
        }
      }
    }
  }

  return (
    <div className="min-h-full flex flex-col gap-5 animate-fade-in overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Analytics Dashboard</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Interactive scatter plots & player evaluation radars
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 shrink-0 flex flex-col gap-4 relative" style={{ zIndex: 9999 }}>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.metricX} onChange={(e) => store.setMetricX(e.target.value)}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label} (X)</option>)}
          </select>
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.metricY} onChange={(e) => store.setMetricY(e.target.value)}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label} (Y)</option>)}
          </select>
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.position} onChange={(e) => store.setPosition(e.target.value)}>
            <option value="">All Positions</option>
            {positions.specific.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="relative w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]">
            <button 
              className="input-dark w-full text-left flex justify-between items-center" 
              style={{ height: '35px', padding: '8px 12px' }}
              onClick={() => setIsLeagueOpen(!isLeagueOpen)}
            >
              <span className="truncate">
                {store.leagues?.length > 0 ? `${store.leagues.length} Leagues selected` : 'All Leagues'}
              </span>
              <span className="text-[10px] ml-2">▼</span>
            </button>
            {isLeagueOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsLeagueOpen(false)}></div>
                <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-2xl z-[70] py-1 max-h-60 overflow-y-auto">
                  {leagues.map((l) => {
                    const isSelected = (store.leagues || []).includes(l)
                    return (
                    <label 
                      key={l} 
                      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#2563eb] hover:text-white transition-none group"
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => {
                          const current = store.leagues || []
                          store.setFilter('leagues', current.includes(l) ? current.filter(x => x !== l) : [...current, l])
                        }} 
                        className="rounded border-[var(--color-border)] bg-[var(--color-surface-900)] text-[#2563eb] focus:ring-[#2563eb]" 
                      />
                      <span className="text-[13px] truncate text-[var(--color-text-primary)] group-hover:text-white">
                        {l}
                      </span>
                    </label>
                  )})}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[260px]">
            <label className="text-xs whitespace-nowrap font-medium" style={{ color: 'var(--color-text-muted)' }}>Top N</label>
            <input
              type="range"
              min={10}
              max={200}
              value={store.topN}
              onChange={(e) => store.setTopN(+e.target.value)}
              className="flex-1 min-w-0 cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={2000}
              value={store.topN}
              onChange={(e) => store.setTopN(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-dark text-xs text-center py-1 px-1.5 w-14 shrink-0"
              style={{ border: '1px solid var(--color-border)' }}
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[170px] max-w-[220px]">
            <input type="number" placeholder="Min Played" title="Mínimo de minutos jugados" className="input-dark text-xs px-2 w-full min-w-0 text-center" value={store.minutesMin ?? ''} onChange={(e) => store.setFilter('minutesMin', e.target.value ? +e.target.value : undefined)} />
            <span style={{ color: 'var(--color-text-muted)' }}>–</span>
            <input type="number" placeholder="Max Played" title="Máximo de minutos jugados" className="input-dark text-xs px-2 w-full min-w-0 text-center" value={store.minutesMax ?? ''} onChange={(e) => store.setFilter('minutesMax', e.target.value ? +e.target.value : undefined)} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0">
        {/* Scatter (2/3 width) */}
        <div className="glass-card p-4 lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {metricLabel(store.metricX)} vs {metricLabel(store.metricY)}
            {loading && <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading...</span>}
          </h3>
          <div className="flex-1 min-h-0">
            {scatterOption ? (
              <ReactECharts option={scatterOption} onEvents={onEvents} style={{ height: '100%', width: '100%' }} />
            ) : (
              <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                No data. Sync leagues first.
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Pitch + Radar */}
        <div className="flex flex-col gap-5 min-h-0">
          {/* Pitch Selector */}
          <div className="glass-card p-4 shrink-0">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>Position Filter</h3>
            <PitchSelector selected={store.position} onSelect={store.setPosition} />
          </div>

          {/* Radar */}
          <div className="glass-card p-4 flex-1 min-h-0 flex flex-col">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              {radarData?.player ? `${radarData.player.name} — Percentile Radar` : 'Player Radar'}
            </h3>
            {radarOption ? (
              <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Click a player in the scatter plot to see their radar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
