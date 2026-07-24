import axios from 'axios'

export const API_BASE = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000, // 5 minutes timeout for scraping operations
})

// ── Players ────────────────────────────────────────────────────────────────
export interface PlayerFilters {
  page?: number
  page_size?: number
  name?: string
  position?: string
  specific_position?: string
  nationality?: string
  team?: string
  league?: string
  season?: string
  age_min?: number
  age_max?: number
  minutes_min?: number
  minutes_max?: number
  sort_by?: string
  sort_dir?: string
}

export async function getPlayers(filters: PlayerFilters = {}) {
  const { data } = await api.get('/api/players', { params: filters })
  return data
}

export async function getPlayer(playerId: number) {
  const { data } = await api.get(`/api/players/${playerId}`)
  return data
}

// ── Filters ────────────────────────────────────────────────────────────────
export async function getPositions() {
  const { data } = await api.get('/api/filters/positions')
  return data
}

export async function getLeagues() {
  const { data } = await api.get('/api/filters/leagues')
  return data
}

export async function getNationalities() {
  const { data } = await api.get('/api/filters/nationalities')
  return data
}

export async function getTeams() {
  const { data } = await api.get('/api/filters/teams')
  return data
}

export async function getMetrics() {
  const { data } = await api.get('/api/filters/metrics')
  return data
}

export async function getSeasons() {
  const { data } = await api.get('/api/filters/seasons')
  return data
}

// ── Analytics ──────────────────────────────────────────────────────────────
export interface ScatterParams {
  metric_x: string
  metric_y: string
  position?: string
  top_n?: number
  age_min?: number
  age_max?: number
  minutes_min?: number
  minutes_max?: number
  league?: string
  team?: string
}

export async function getScatterData(params: ScatterParams) {
  const { data } = await api.get('/api/analytics/scatter', { params })
  return data
}

export async function getRadarData(playerId: number, metrics?: string) {
  const { data } = await api.get(`/api/analytics/radar/${playerId}`, {
    params: metrics ? { metrics } : {},
  })
  return data
}

// ── Sync ───────────────────────────────────────────────────────────────────
export async function addLeague(url: string) {
  const { data } = await api.post('/api/sync/league', { url })
  return data
}

export async function updateAll() {
  const { data } = await api.post('/api/sync/update-all')
  return data
}

export async function getTrackedLeagues() {
  const { data } = await api.get('/api/sync/leagues')
  return data
}

export async function deleteLeague(leagueId: number) {
  const { data } = await api.delete(`/api/sync/leagues/${leagueId}`)
  return data
}

// ── Reports ────────────────────────────────────────────────────────────────
export async function getPlayerCard(playerId: number) {
  const { data } = await api.get(`/api/reports/player-card/${playerId}`)
  return data
}

export function getProxyImageUrl(originalUrl: string): string {
  return `${API_BASE}/api/reports/proxy/image?url=${encodeURIComponent(originalUrl)}`
}

// ── WebSocket ──────────────────────────────────────────────────────────────
export function createSyncWs(onMessage: (data: { level: string; message: string }) => void): WebSocket {
  const ws = new WebSocket('ws://localhost:8000/api/sync/ws/sync-logs')
  ws.onmessage = (event) => {
    console.log('[WS MESSAGE]', event.data)
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch {
      onMessage({ level: 'info', message: event.data })
    }
  }
  return ws
}
