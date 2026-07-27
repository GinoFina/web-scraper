import { useEffect, useState } from 'react'
import { getPlayer } from '../../../services/api'

// Import API_BASE since we need it for the direct fetch
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ReportHeatmap({ playerId }: { playerId: number }) {
  const [data, setData] = useState<any>(null)
  const [heatmapData, setHeatmapData] = useState<any[]>([])

  useEffect(() => {
    if (playerId) {
      getPlayer(playerId).then(res => {
        setData(res)
        const s = res.stats?.find((st: any) => st.season_name !== 'Total') || res.stats?.[0]
        if (s && s.tournament_id && s.season_id && s.tournament_id !== 0) {
          fetch(`${API_BASE}/api/reports/heatmap/${playerId}/${s.tournament_id}/${s.season_id}`)
            .then(r => r.json())
            .then(hmRes => {
              const hm = hmRes.points || []
              setHeatmapData(hm)
            })
            .catch(() => setHeatmapData([]))
        }
      }).catch(() => {})
    }
  }, [playerId])

  if (!data) return <div className="p-4 text-center text-[var(--color-text-muted)] print:text-gray-500">Loading heatmap...</div>

  const s = data.stats?.[0]

  // Find max count for opacity scaling
  const maxCount = Math.max(1, ...heatmapData.map((p: any) => p.count || 1))

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)] print:bg-white print:border-gray-300">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)] print:text-black">Season Heatmap ({s?.season_name || ''})</h3>
      
      <div className="w-full flex items-center justify-center">
        <div className="relative w-full max-w-[400px]" style={{ aspectRatio: '130 / 100' }}>
          {/* Pitch SVG Background */}
          <svg
            viewBox="0 0 130 100"
            className="absolute inset-0 w-full h-full rounded"
            style={{ fill: '#547a54', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 0.5 }}
          >
            {/* Green background */}
            <rect width="130" height="100" fill="#547a54" />
            
            {/* Direction Arrow */}
            <g transform="translate(55, 10)">
              <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" />
              <polygon points="20,-3 26,0 20,3" fill="rgba(0,0,0,0.8)" stroke="none" />
            </g>

            {/* Pitch outline */}
            <rect x="5" y="15" width="120" height="70" rx="0" fill="none" />
            {/* Center line */}
            <line x1="65" y1="15" x2="65" y2="85" fill="none" />
            {/* Center circle */}
            <circle cx="65" cy="50" r="10" fill="none" />
            <circle cx="65" cy="50" r="0.5" fill="rgba(0,0,0,0.6)" />
            {/* Penalty boxes */}
            <rect x="5" y="27.5" width="18" height="45" fill="none" />
            <rect x="107" y="27.5" width="18" height="45" fill="none" />
            {/* Goal boxes */}
            <rect x="5" y="37.5" width="6" height="25" fill="none" />
            <rect x="119" y="37.5" width="6" height="25" fill="none" />
          </svg>

          <div className="absolute inset-0 pointer-events-none" style={{ filter: 'blur(3px)', mixBlendMode: 'screen' }}>
            {heatmapData.map((pt: any, i: number) => {
              // Sofascore coordinates: X is 0-100 (left to right), Y is 0-100 (top to bottom)
              const intensity = (pt.count || 1) / maxCount
              let r, g, b
              if (intensity > 0.6) { r = 239; g = 68; b = 68 } // Red
              else if (intensity > 0.3) { r = 249; g = 115; b = 22 } // Orange
              else { r = 234; g = 179; b = 8 } // Yellow

              // Adjust the bounding box of the pitch (x=5 to 125, y=15 to 85)
              // X in Sofascore is 0-100. We map it to 5%-95% of SVG width.
              const xPos = 5 + (pt.x * 0.9)
              const yPos = 15 + (pt.y * 0.7)

              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${xPos}%`,
                    top: `${yPos}%`,
                    width: '8%',
                    height: '12%',
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle, rgba(${r}, ${g}, ${b}, ${intensity * 0.8 + 0.2}) 0%, rgba(${r}, ${g}, ${b}, 0) 70%)`,
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
