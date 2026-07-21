import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getRadarData } from '../../../services/api'

export default function ReportRadarChart({ playerId }: { playerId: number }) {
  const [radarData, setRadarData] = useState<any>(null)

  useEffect(() => {
    if (playerId) {
      getRadarData(playerId).then(setRadarData).catch(() => {})
    }
  }, [playerId])

  if (!radarData) return <div className="p-4 text-center text-gray-500">Loading radar data...</div>

  const radarOption = {
    animation: false, // Better for print
    backgroundColor: 'transparent',
    radar: {
      indicator: radarData.metrics.map((m: any) => ({ name: m.label, max: 100 })),
      shape: 'polygon',
      axisName: { color: '#4b5563', fontSize: 11, fontWeight: 'bold' }, // Darker for print
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
    <div className="w-full h-[400px]">
      <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
