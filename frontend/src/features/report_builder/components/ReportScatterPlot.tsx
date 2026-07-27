import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getScatterData, getPlayer } from '../../../services/api'

export default function ReportScatterPlot({ playerId }: { playerId: number }) {
  const [data, setData] = useState<any>(null)
  const [playerInfo, setPlayerInfo] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      getPlayer(playerId).then(res => {
        setPlayerInfo(res)
        // Fetch scatter data for this player's league/season
        const statsObj = res.stats?.[0] || {}
        const league = statsObj.tournament_name
        const season = statsObj.season_name
        if (league && season) {
          getScatterData({
            metric_x: 'expected_goals',
            metric_y: 'goals',
            league,
          }).then(setData).catch(() => {})
        }
      }).catch(() => {})
    }
  }, [playerId])

  if (!data || !playerInfo) return <div className="p-4 text-center text-[var(--color-text-muted)] print:text-gray-500">Loading scatter data...</div>

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
      name: 'Expected Goals (xG)',
      nameLocation: 'middle',
      nameGap: 25,
      splitLine: { show: false },
      axisLabel: { color: '#64748b' },
      nameTextStyle: { color: '#64748b', fontWeight: 'bold' }
    },
    yAxis: {
      type: 'value',
      name: 'Goals',
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
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] print:bg-white print:border-gray-300">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)] print:text-black">League Comparison (xG vs Goals)</h3>
      <div className="w-full h-[300px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  )
}
