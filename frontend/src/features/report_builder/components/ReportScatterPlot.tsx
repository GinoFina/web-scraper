import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getScatterData, getPlayer } from '../../../services/api'

export default function ReportScatterPlot({ playerId, config }: { playerId: number, config?: any }) {
  const [data, setData] = useState<any>(null)
  const [playerInfo, setPlayerInfo] = useState<any>(null)

  // Default axes if not configured
  const metric_x = config?.xAxis || 'expected_goals'
  const metric_y = config?.yAxis || 'goals'

  useEffect(() => {
    if (playerId) {
      getPlayer(playerId).then(res => {
        setPlayerInfo(res)
        getScatterData({
          metric_x,
          metric_y,
          player_id: playerId,
          player_league: config?.playerLeague,
          player_season: config?.playerSeason,
          comparison_league: config?.comparisonLeagues,
          comparison_season: config?.comparisonSeasons,
          display_mode: config?.displayMode,
          position: config?.comparisonPosition,
          age_min: config?.ageMin,
          age_max: config?.ageMax,
          minutes_min: config?.minutesMin,
          minutes_max: config?.minutesMax
        }).then(setData).catch(() => {})
      }).catch(() => {})
    }
  }, [playerId, metric_x, metric_y, config])

  if (!data || !playerInfo) return <div className="p-4 text-center text-[var(--color-text-muted)]">Loading scatter data...</div>

  const seriesData = (data.players || []).map((p: any) => ({
    value: [p.x, p.y],
    name: p.name,
    itemStyle: {
      color: p.player_id === playerId ? '#ef4444' : 'rgba(99,102,241,0.5)',
      borderColor: p.player_id === playerId ? '#991b1b' : 'transparent',
      borderWidth: p.player_id === playerId ? 2 : 0,
    },
    symbolSize: p.player_id === playerId ? 14 : 8,
  }))

  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      show: false // No tooltips in print
    },
    xAxis: {
      type: 'value',
      name: metric_x.replace(/_/g, ' ').toUpperCase(),
      nameLocation: 'middle',
      nameGap: 25,
      splitLine: { show: false },
      axisLabel: { color: '#64748b' },
      nameTextStyle: { color: '#64748b', fontWeight: 'bold' }
    },
    yAxis: {
      type: 'value',
      name: metric_y.replace(/_/g, ' ').toUpperCase(),
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLabel: { color: '#64748b' },
      nameTextStyle: { color: '#64748b', fontWeight: 'bold' }
    },
    series: [
      {
        type: 'scatter',
        data: seriesData,
        label: {
          show: true,
          formatter: (params: any) => params.data.itemStyle.color === '#ef4444' ? params.name : '',
          position: 'top',
          color: '#ef4444',
          fontWeight: 'bold'
        }
      }
    ]
  }

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] flex-1 flex flex-col">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)]">
        {config?.title || `League Comparison (${metric_x.replace(/_/g, ' ')} vs ${metric_y.replace(/_/g, ' ')})`}
      </h3>
      <div className="w-full flex-1 min-h-[250px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  )
}
