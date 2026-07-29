import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getRadarData } from '../../../services/api'

export default function ReportRadarChart({ playerId, config }: { playerId: number, config?: any }) {
  const [radarData, setRadarData] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      const metricList = config?.metrics?.join(',') || ''
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
      ).then(setRadarData).catch(() => { })
    }
  }, [playerId, config])

  if (!radarData || !radarData.metrics || radarData.metrics.length === 0) {
    return <div className="p-4 text-center text-gray-500">No data available for the selected filters.</div>
  }

  const radarOption = {
    animation: false, // Better for print
    backgroundColor: 'transparent',
    radar: {
      center: ['50%', '45%'],
      radius: '65%',
      indicator: radarData.metrics.map((m: any) => ({ name: m.label, max: 100 })),
      shape: 'polygon',
      axisName: {
        color: '#4b5563',
        fontSize: 9,
        fontWeight: 'bold',
      },
      splitArea: { areaStyle: { color: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)'] } },
      splitLine: { lineStyle: { color: '#cbd5e1' } },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: radarData.metrics.map((m: any) => m.percentile),
          name: radarData.player?.name || 'Player',
          areaStyle: { color: 'rgba(99,102,241,0.25)' },
          lineStyle: { color: '#6366f1', width: 2 },
          itemStyle: { color: '#4f46e5' },
        },
        {
          value: radarData.metrics.map(() => 50),
          name: radarData.average_label || 'Average',
          areaStyle: { color: 'transparent' },
          lineStyle: { color: '#fbbf24', width: 2, type: 'dashed' },
          itemStyle: { color: '#fbbf24' },
        },
      ],
    }],
  }

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] flex-1 flex flex-col">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)]">
        {config?.title || `Radar Comparison`}
      </h3>
      <div className="w-full flex-1 min-h-[350px]">
        <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  )
}
