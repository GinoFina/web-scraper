import { useEffect, useState, useRef } from 'react'
import { getPlayer, API_BASE } from '../../../services/api'

export default function ReportHeatmap({ playerId }: { playerId: number }) {
  const [data, setData] = useState<any>(null)
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (playerId) {
      getPlayer(playerId).then(res => {
        setData(res)
        // Pick the season with the most matches to ensure we get the main league heatmap
        const validStats = res.stats?.filter((st: any) => st.season_name !== 'Total' && st.tournament_id !== 0) || []
        const s = validStats.sort((a: any, b: any) => (b.matches || 0) - (a.matches || 0))[0]
        if (s && s.tournament_id && s.season_id) {
          fetch(`${API_BASE}/api/reports/heatmap/${playerId}/${s.tournament_id}/${s.season_id}`)
            .then(r => r.json())
            .then(hmRes => {
              if (hmRes.error) {
                setHeatmapData([])
              } else {
                const hm = hmRes.points || []
                setHeatmapData(hm)
              }
            })
            .catch(() => setHeatmapData([]))
        } else {
          setHeatmapData([])
        }
      }).catch(() => {})
    }
  }, [playerId])

  useEffect(() => {
    if (!canvasRef.current || heatmapData.length === 0) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    // Find max count
    const maxCount = Math.max(1, ...heatmapData.map((p: any) => p.count || 1))

    // Create a hidden canvas to draw the alpha mask
    const alphaCanvas = document.createElement('canvas')
    alphaCanvas.width = width
    alphaCanvas.height = height
    const alphaCtx = alphaCanvas.getContext('2d')!

    // Draw blurred circles on the alpha canvas
    alphaCtx.fillStyle = 'black'
    
    // Pitch bounds in percentages (same as SVG inner pitch)
    const pitchX = width * 0.05
    const pitchY = height * 0.15
    const pitchW = width * 0.90
    const pitchH = height * 0.70

    heatmapData.forEach((pt: any) => {
      const intensity = (pt.count || 1) / maxCount
      
      // Invert Y and map to inner pitch
      const cx = pitchX + (pt.x / 100) * pitchW
      const cy = pitchY + ((100 - pt.y) / 100) * pitchH

      const radius = width * 0.040 // Larger dots like Photo 2

      const gradient = alphaCtx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      
      gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity * 0.6 + 0.1})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      alphaCtx.fillStyle = gradient
      alphaCtx.beginPath()
      alphaCtx.arc(cx, cy, radius, 0, Math.PI * 2)
      alphaCtx.fill()
    })

    // Colorize the alpha mask
    const imageData = alphaCtx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Build a smooth 256-color palette
    const createPalette = () => {
      const p = new Uint8ClampedArray(256 * 4)
      for (let i = 0; i < 256; i++) {
        const offset = i * 4
        if (i < 10) {
          p[offset] = 0; p[offset+1] = 0; p[offset+2] = 0; p[offset+3] = 0;
        } else if (i < 80) {
          // Transparent to Yellow (234, 179, 8)
          p[offset] = 234; p[offset+1] = 179; p[offset+2] = 8; p[offset+3] = i * 2;
        } else if (i < 160) {
          // Yellow to Orange (249, 115, 22)
          const t = (i - 80) / 80
          p[offset] = 234 + (249 - 234) * t
          p[offset+1] = 179 + (115 - 179) * t
          p[offset+2] = 8 + (22 - 8) * t
          p[offset+3] = 255
        } else {
          // Orange to Red (239, 68, 68)
          const t = (i - 160) / 95
          p[offset] = 249 + (239 - 249) * t
          p[offset+1] = 115 + (68 - 115) * t
          p[offset+2] = 22 + (68 - 22) * t
          p[offset+3] = 255
        }
      }
      return p
    }

    const palette = createPalette()

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha > 0) {
        data[i] = palette[alpha * 4]
        data[i + 1] = palette[alpha * 4 + 1]
        data[i + 2] = palette[alpha * 4 + 2]
        data[i + 3] = palette[alpha * 4 + 3]
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [heatmapData])

  if (!data) return <div className="p-4 text-center text-[var(--color-text-muted)]">Loading heatmap...</div>

  const s = data.stats?.filter((st: any) => st.season_name !== 'Total' && st.tournament_id !== 0).sort((a: any, b: any) => (b.matches || 0) - (a.matches || 0))[0] || data.stats?.[0]

  return (
    <div className="bg-[var(--color-surface-800)] rounded-lg p-4 border border-[var(--color-border)]">
      <h3 className="text-sm font-bold mb-3 text-[var(--color-text-primary)]">Season Heatmap ({s?.season_name || ''})</h3>
      
      <div className="w-full flex items-center justify-center">
        <div className="relative w-full max-w-[400px]" style={{ aspectRatio: '130 / 100' }}>
          {/* Base green background */}
          <div className="absolute inset-0 bg-[#547a54] rounded print:![color-adjust:exact] print:![-webkit-print-color-adjust:exact]" />

          {heatmapData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 font-medium z-10">
              No heatmap data available
            </div>
          )}

          {/* Canvas for Heatmap (placed UNDER the pitch lines) */}
          <canvas
            ref={canvasRef}
            width={780}
            height={600}
            className="absolute inset-0 w-full h-full"
            style={{ 
              clipPath: 'polygon(5% 15%, 95% 15%, 95% 85%, 5% 85%)' // Restrict heatmap to exactly the pitch lines
            }}
          />

          {/* Pitch SVG Lines (Transparent background, drawn OVER the canvas) */}
          <svg
            viewBox="0 0 130 100"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ fill: 'none', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 0.5 }}
          >
            {/* Direction Arrow */}
            <g transform="translate(55, 6)">
              <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" />
              <polygon points="20,-3 26,0 20,3" fill="rgba(0,0,0,0.8)" stroke="none" />
            </g>

            {/* Pitch outline */}
            <rect x="6.5" y="15" width="117" height="70" rx="0" />
            {/* Center line */}
            <line x1="65" y1="15" x2="65" y2="85" />
            {/* Center circle */}
            <circle cx="65" cy="50" r="10" />
            <circle cx="65" cy="50" r="0.5" fill="rgba(0,0,0,0.6)" />
            {/* Penalty boxes */}
            <rect x="6.5" y="27.5" width="18" height="45" />
            <rect x="105.5" y="27.5" width="18" height="45" />
            {/* Goal boxes */}
            <rect x="6.5" y="37.5" width="6" height="25" />
            <rect x="117.5" y="37.5" width="6" height="25" />
          </svg>
        </div>
      </div>
    </div>
  )
}
