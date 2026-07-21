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

  useEffect(() => {
    Promise.all([getMetrics(), getPositions(), getLeagues()])
      .then(([m, p, l]) => { setMetrics(m); setPositions(p); setLeagues(l) })
      .catch(() => {})
  }, [])

  const fetchScatter = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getScatterData({
        metric_x: store.metricX,
        metric_y: store.metricY,
        position: store.position || undefined,
        top_n: store.topN,
        age_min: store.ageMin,
        age_max: store.ageMax,
        minutes_min: store.minutesMin,
        minutes_max: store.minutesMax,
        league: store.league || undefined,
        team: store.team || undefined,
      })
      setScatterData(result)
    } catch {
      setScatterData(null)
    }
    setLoading(false)
  }, [store.metricX, store.metricY, store.position, store.topN, store.ageMin, store.ageMax, store.minutesMin, store.minutesMax, store.league, store.team])

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

  return (
    <div className="h-full flex flex-col p-6 gap-5 animate-fade-in overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Scouting Dashboards</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Scatter plots, radar comparisons & positional analysis
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.metricX} onChange={(e) => store.setMetricX(e.target.value)}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label} (X)</option>)}
          </select>
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.metricY} onChange={(e) => store.setMetricY(e.target.value)}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label} (Y)</option>)}
          </select>
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.position} onChange={(e) => store.setPosition(e.target.value)}>
            <option value="">All Positions</option>
            {positions.general.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.league} onChange={(e) => store.setFilter('league', e.target.value)}>
            <option value="">All Leagues</option>
            {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-[200px]">
            <label className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>Top N</label>
            <input
              type="range"
              min={10}
              max={200}
              value={store.topN}
              onChange={(e) => store.setTopN(+e.target.value)}
              className="flex-1 min-w-0"
            />
            <span className="text-xs w-8 text-right shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{store.topN}</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-[200px]">
            <input type="number" placeholder="Age min" className="input-dark w-full min-w-0" value={store.ageMin ?? ''} onChange={(e) => store.setFilter('ageMin', e.target.value ? +e.target.value : undefined)} />
            <input type="number" placeholder="max" className="input-dark w-full min-w-0" value={store.ageMax ?? ''} onChange={(e) => store.setFilter('ageMax', e.target.value ? +e.target.value : undefined)} />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-[200px]">
            <input type="number" placeholder="Min '" className="input-dark w-full min-w-0" value={store.minutesMin ?? ''} onChange={(e) => store.setFilter('minutesMin', e.target.value ? +e.target.value : undefined)} />
            <input type="number" placeholder="max" className="input-dark w-full min-w-0" value={store.minutesMax ?? ''} onChange={(e) => store.setFilter('minutesMax', e.target.value ? +e.target.value : undefined)} />
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
              <ReactECharts option={scatterOption} style={{ height: '100%', width: '100%' }} />
            ) : (
              <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                No data. Sync leagues first.
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Pitch + Radar */}
        <div className="flex flex-col gap-5">
          {/* Pitch Selector */}
          <div className="glass-card p-4">
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
