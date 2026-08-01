import { useEffect, useState, useCallback, useRef } from 'react'
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
        display_mode: store.displayMode,
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
  }, [store.metricX, store.metricY, store.position, store.topN, store.ageMin, store.ageMax, store.minutesMin, store.minutesMax, store.leagues, store.team, store.displayMode])

  useEffect(() => { fetchScatter() }, [fetchScatter])

  const [radarDataList, setRadarDataList] = useState<any[]>([])
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const [isRadarConfigOpen, setIsRadarConfigOpen] = useState(false)

  const radarCache = useRef<Record<string, any>>({})

  // Load radar for selected players with debounce to prevent API spam on rapid clicking
  useEffect(() => {
    let active = true

    const timeoutId = setTimeout(() => {
      if (store.selectedPlayers.length > 0) {
        const fetchPromises = store.selectedPlayers.map(id => {
          const customMetrics = store.radarMetrics.length >= 3 ? store.radarMetrics.join(',') : undefined;
          const cacheKey = `${id}-${store.displayMode}-${customMetrics || 'default'}`
          if (radarCache.current[cacheKey]) {
            return Promise.resolve(radarCache.current[cacheKey])
          }
          return getRadarData(id, customMetrics, undefined, undefined, store.displayMode).then(res => {
            radarCache.current[cacheKey] = res
            return res
          })
        })

        Promise.all(fetchPromises)
          .then(results => {
            if (active) setRadarDataList(results)
          })
          .catch(() => {
            if (active) setRadarDataList([])
          })
      } else {
        setRadarDataList([])
      }
    }, 500) // 500ms debounce

    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [store.selectedPlayers, store.displayMode, store.radarMetrics])

  const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

  const metricLabel = (key: string) => metrics.find((m) => m.key === key)?.label || key

  // Scatter chart option
  const scatterOption = scatterData ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: any) => {
        const vals = p.data?.value || p.data;
        const realX = vals[5] !== undefined ? vals[5] : vals[0];
        const realY = vals[6] !== undefined ? vals[6] : vals[1];
        return `<b>${vals[3]}</b><br/>${vals[4]}<br/>${metricLabel(store.metricX)}: ${realX}<br/>${metricLabel(store.metricY)}: ${realY}`
      },
    },
    grid: { left: 80, right: 60, top: 40, bottom: 60, containLabel: false },
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
        labelLayout: {
          moveOverlap: 'shiftXY'
        },
        data: scatterData.players.map((p: any, _index: number, arr: any[]) => {
          const isSelected = store.selectedPlayers.includes(p.player_id);
          const selIdx = store.selectedPlayers.indexOf(p.player_id);
          const color = isSelected ? COLORS[selIdx % COLORS.length] : 'rgba(99,102,241,0.6)';

          // Use deterministic pseudo-random jitter based on player_id so points don't move on every re-render
          const jitterX = Math.sin(p.player_id * 1.23) * 0.3;
          const jitterY = Math.cos(p.player_id * 4.56) * 0.3;
          const realX = p.x;
          const realY = p.y;
          const maxX = arr.reduce((max, cur) => Math.max(max, cur.x), 0.001);

          return {
            value: [p.x + jitterX, p.y + jitterY, p.player_id, p.name, p.team, realX, realY],
            itemStyle: {
              color: color,
              borderColor: isSelected ? '#fff' : '#818cf8',
              borderWidth: isSelected ? 2 : 1,
              shadowBlur: isSelected ? 12 : 0,
              shadowColor: color
            },
            label: {
              show: isSelected,
              formatter: () => `{name|${p.name}}\n{team|${p.team}}\n{stats|${metricLabel(store.metricX)}: ${realX} | ${metricLabel(store.metricY)}: ${realY}}`,
              position: (() => {
                const positions = ['right', 'top', 'bottom', 'left'];
                let pos = positions[selIdx % positions.length];
                // basic edge avoidance for horizontal
                if (pos === 'right' && realX > maxX * 0.8) pos = 'left';
                if (pos === 'left' && realX < maxX * 0.1) pos = 'right';
                return pos;
              })(),
              backgroundColor: 'rgba(15, 21, 32, 0.95)',
              borderColor: color,
              borderWidth: 2,
              padding: [6, 8],
              borderRadius: 6,
              rich: {
                name: { color: '#fff', fontWeight: 'bold', fontSize: 12, padding: [0, 0, 4, 0] },
                team: { color: '#94a3b8', fontSize: 10, padding: [0, 0, 6, 0] },
                stats: { color: '#fff', fontSize: 11, fontWeight: 'bold' }
              }
            },
            z: isSelected ? 20 : 0
          };
        }),
        symbolSize: (val: any) => store.selectedPlayers.includes(val[2]) ? 16 : 10,
        emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 2, shadowBlur: 12, opacity: 1 } },
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
  const radarOption = radarDataList.length > 0 && radarDataList[0]?.metrics?.length ? {
    backgroundColor: 'transparent',
    radar: {
      indicator: radarDataList[0].metrics.map((m: any) => ({ name: m.label, max: 100 })),
      shape: 'polygon' as const,
      axisName: { color: '#94a3b8', fontSize: 10 },
      splitArea: { areaStyle: { color: ['rgba(99,102,241,0.02)', 'rgba(99,102,241,0.05)'] } },
      splitLine: { lineStyle: { color: '#1c2640' } },
      axisLine: { lineStyle: { color: '#1c2640' } },
      center: ['50%', '45%'], // leave room for legend
    },
    series: [{
      type: 'radar',
      data: [
        ...radarDataList.map((rd, idx) => ({
          value: rd.metrics.map((m: any) => m.percentile),
          name: rd.player?.name || 'Player',
          areaStyle: { color: COLORS[idx % COLORS.length] + '40' },
          lineStyle: { color: COLORS[idx % COLORS.length], width: 2 },
          itemStyle: { color: COLORS[idx % COLORS.length] },
        })),
        {
          value: radarDataList[0].metrics.map(() => 50),
          name: 'Average',
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
        const playerId = params.data?.value ? params.data.value[2] : params.data[2]
        if (playerId) {
          store.togglePlayer(playerId)
        }
      }
    }
  }

  return (
    <div className="min-h-full flex flex-col gap-5 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Analytics Dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Interactive scatter plots & player evaluation radars
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <select
            className="input-dark text-sm"
            value={store.displayMode}
            onChange={(e) => store.setDisplayMode(e.target.value)}
          >
            <option value="total">Total Stats</option>
            <option value="per_game">Per Game</option>
            <option value="per_90">Per 90</option>
          </select>
          <button onClick={store.resetFilters} className="btn-ghost text-xs">
            Reset Filters
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 shrink-0 flex flex-col gap-4 relative" style={{ zIndex: 9999 }}>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.metricX} onChange={(e) => store.setMetricX(e.target.value)}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}{store.metricX === m.key ? ' (X)' : ''}</option>)}
          </select>
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[140px] max-w-[200px]" value={store.metricY} onChange={(e) => store.setMetricY(e.target.value)}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}{store.metricY === m.key ? ' (Y)' : ''}</option>)}
          </select>
          <select className="input-dark w-full sm:w-auto flex-1 min-w-[120px] max-w-[20px]" value={store.position} onChange={(e) => store.setPosition(e.target.value)}>
            <option value="">All Positions</option>
            {positions.specific.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="relative w-full sm:w-auto flex-1 min-w-[120px] max-w-[20px]">
            <button
              className="input-dark w-full text-left flex justify-between items-center"
              style={{ height: '35px', padding: '8px 12px' }}
              onClick={() => setIsLeagueOpen(!isLeagueOpen)}
            >
              <span className="truncate">
                {store.leagues?.length > 0 ? `${store.leagues.length} Selected` : 'All Leagues'}
              </span>
              <span className="text-[10px] ml-2">▼</span>
            </button>
            {isLeagueOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsLeagueOpen(false)}></div>
                <div className="absolute top-full left-0 mt-1 w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-2xl z-[70] py-1 max-h-60 overflow-y-auto">
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
                    )
                  })}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[120px] w-full max-w-full">
            <label className="text-xs whitespace-nowrap font-medium" style={{ color: 'var(--color-text-muted)' }}>Top N</label>
            <input
              type="range"
              min={10}
              max={200}
              value={store.topN}
              onChange={(e) => store.setTopN(+e.target.value)}
              className="flex-1 min-w-0 cursor-pointer accent-[#6366f1]"
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

          <div className="flex items-center gap-2 flex-1 min-w-[120px] max-w-[190px]">
            <input type="number" placeholder="Min Age" title="Edad mínima" className="input-dark text-xs px-2 w-full min-w-0 text-center" value={store.ageMin ?? ''} onChange={(e) => store.setFilter('ageMin', e.target.value ? +e.target.value : undefined)} />
            <span style={{ color: 'var(--color-text-muted)' }}>–</span>
            <input type="number" placeholder="Max Age" title="Edad máxima" className="input-dark text-xs px-2 w-full min-w-0 text-center" value={store.ageMax ?? ''} onChange={(e) => store.setFilter('ageMax', e.target.value ? +e.target.value : undefined)} />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[215px] max-w-[220px]">
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
          <div className="glass-card p-4 flex-1 min-h-0 flex flex-col relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {store.selectedPlayers.length === 0 ? 'Player Radar' : `${radarDataList.length} Players — Percentile Radar`}
              </h3>
              {radarDataList.length > 0 && (
                <div className="flex gap-2 relative">
                  <button
                    onClick={() => { setIsRadarConfigOpen(!isRadarConfigOpen); setIsLegendOpen(false); }}
                    className="p-1 rounded hover:bg-[var(--color-surface-700)] text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)]"
                    title="Configurar estadísticas del Radar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </button>
                  {isRadarConfigOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsRadarConfigOpen(false)}></div>
                      <div className="absolute top-full right-0 mt-1 w-64 bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-2xl z-[70] py-2 max-h-[300px] overflow-y-auto">
                        <div className="px-3 pb-2 mb-2 border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] font-bold">RADAR METRICS (MIN 3)</div>
                        {metrics.map((m) => {
                          // The default radar config falls back to the top 6 metrics or specific ones if store.radarMetrics is empty, 
                          // but since we don't know the exact default the backend uses on the frontend side easily, 
                          // let's initialize the checkboxes visually as if the user is making a custom selection.
                          // If empty, we can just say "default". Wait, we need to show checkboxes.
                          const isSelected = store.radarMetrics.includes(m.key);
                          return (
                            <label key={m.key} className="flex items-center gap-3 px-3 py-1.5 hover:bg-[var(--color-surface-700)] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    store.setRadarMetrics([...store.radarMetrics, m.key])
                                  } else {
                                    if (store.radarMetrics.length <= 3 && store.radarMetrics.length > 0) {
                                      // Can't deselect if it would drop below 3 (only if they already have custom metrics)
                                      alert("Debes mantener al menos 3 estadísticas seleccionadas para el Radar.");
                                      return;
                                    }
                                    store.setRadarMetrics(store.radarMetrics.filter(k => k !== m.key))
                                  }
                                }}
                                className="rounded border-[var(--color-border)] bg-[var(--color-surface-900)] text-[#2563eb] focus:ring-[#2563eb]"
                              />
                              <span className="text-xs text-white truncate">{m.label}</span>
                            </label>
                          )
                        })}
                        {store.radarMetrics.length > 0 && (
                          <div className="px-3 pt-2 mt-2 border-t border-[var(--color-border)]">
                            <button onClick={() => store.setRadarMetrics([])} className="w-full btn-ghost text-[10px] py-1 text-[#ef4444] hover:bg-[#ef444420]">
                              Reset to Default
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => { setIsLegendOpen(!isLegendOpen); setIsRadarConfigOpen(false); }}
                    className="p-1 rounded hover:bg-[var(--color-surface-700)] text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)]"
                    title="Ver Leyenda"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  {isLegendOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsLegendOpen(false)}></div>
                      <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded shadow-2xl z-[70] py-2 max-h-60 overflow-y-auto">
                        <div className="px-3 pb-2 mb-2 border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] font-bold">LEGEND</div>
                        {radarDataList.map((rd, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-3 py-1.5 hover:bg-[var(--color-surface-700)] cursor-default">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="text-xs text-white truncate">{rd.player?.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
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
