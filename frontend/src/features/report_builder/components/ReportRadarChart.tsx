import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getRadarData } from '../../../services/api'

export default function ReportRadarChart({ playerId, config }: { playerId: number, config?: any }) {
  const [radarData, setRadarData] = useState<any>(null)
  const [radarData2, setRadarData2] = useState<any>(null)

  useEffect(() => {
    let isMounted = true
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
      ).then(res => {
        if (isMounted) setRadarData(res)
      }).catch(() => { })
    }
    return () => { isMounted = false }
  }, [playerId, config])

  useEffect(() => {
    let isMounted = true
    if (config?.player2Id) {
      const metricList = Array.isArray(config?.metrics) ? config.metrics.join(',') : (config?.metrics || '')
      getRadarData(
        config.player2Id, 
        metricList, 
        config?.player2League || 'Total', 
        config?.player2Season || 'Total', 
        config?.displayMode, 
        config?.comparisonPosition,
        config?.ageMin,
        config?.ageMax,
        config?.minutesMin,
        config?.minutesMax,
        config?.comparisonLeagues,
        config?.comparisonSeasons
      ).then(res => {
        if (isMounted) setRadarData2(res)
      }).catch(() => { })
    } else {
      setRadarData2(null)
    }
    return () => { isMounted = false }
  }, [config?.player2Id, config])

  if (!radarData || !radarData.metrics || radarData.metrics.length === 0) {
    return <div className="p-4 text-center text-gray-500">No data available for the selected filters.</div>
  }

  const p2Map = radarData2 ? new Map(radarData2.metrics.map((m: any) => [m.key, m.percentile])) : new Map()

  const seriesData: any[] = [
    {
      value: radarData.metrics.map((m: any) => m.percentile),
      name: radarData.player?.name || 'Player 1',
      areaStyle: { color: 'rgba(99,102,241,0.25)' },
      lineStyle: { color: '#6366f1', width: 2 },
      itemStyle: { color: '#4f46e5' },
    }
  ]

  if (radarData2) {
    seriesData.push({
      value: radarData.metrics.map((m: any) => p2Map.get(m.key) || 0),
      name: radarData2.player?.name || 'Player 2',
      areaStyle: { color: 'rgba(239,68,68,0.25)' },
      lineStyle: { color: '#ef4444', width: 2 },
      itemStyle: { color: '#dc2626' },
    })
  }

  seriesData.push({
    value: radarData.metrics.map(() => 50),
    name: 'Average',
    areaStyle: { color: 'transparent' },
    lineStyle: { color: '#fbbf24', width: 2, type: 'dashed' },
    itemStyle: { color: '#fbbf24' },
  })

  const radarOption = {
    animation: false,
    backgroundColor: 'transparent',
    legend: {
      data: seriesData.map(s => s.name),
      bottom: 0,
      textStyle: { color: '#9ca3af', fontSize: 10 }
    },
    radar: {
      center: ['50%', '45%'],
      radius: '60%',
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
      data: seriesData,
    }],
  }

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] flex-1 flex flex-col">
      <h3 className="text-sm font-bold mb-1 text-[var(--color-text-primary)]">
        {config?.title || `Radar Comparison`}
      </h3>
      <div className="w-full flex-1 min-h-[350px]">
        <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  )
}
