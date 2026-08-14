import axios from 'axios'

export const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000'

export const api = axios.create({
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
  role?: string
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

export async function getSeasons() {
  const { data } = await api.get('/api/filters/seasons')
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

export async function getRoles() {
  const { data } = await api.get('/api/filters/roles')
  return data
}

export async function getMetrics() {
  const { data } = await api.get('/api/filters/metrics')
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
  player_id?: number
  player_league?: string
  player_season?: string
  comparison_league?: string
  comparison_season?: string
  team?: string
  display_mode?: string
}

export async function getScatterData(params: ScatterParams) {
  const { data } = await api.get('/api/analytics/scatter', { params })
  return data
}

export async function getRadarData(playerId: number, metrics?: string, playerLeague?: string, playerSeason?: string, displayMode?: string, comparisonPosition?: string, ageMin?: number, ageMax?: number, minutesMin?: number, minutesMax?: number, comparisonLeague?: string, comparisonSeason?: string) {
  const params: any = {}
  if (metrics) params.metrics = metrics
  if (playerLeague && playerLeague !== 'Total') params.player_league = playerLeague
  if (playerSeason && playerSeason !== 'Total') params.player_season = playerSeason
  if (displayMode) params.display_mode = displayMode
  if (comparisonPosition) params.comparison_position = comparisonPosition
  if (comparisonLeague && comparisonLeague !== 'Total') params.comparison_league = comparisonLeague
  if (comparisonSeason && comparisonSeason !== 'Total') params.comparison_season = comparisonSeason
  if (ageMin !== undefined) params.age_min = ageMin
  if (ageMax !== undefined) params.age_max = ageMax
  if (minutesMin !== undefined) params.minutes_min = minutesMin
  if (minutesMax !== undefined) params.minutes_max = minutesMax

  const { data } = await api.get(`/api/analytics/radar/${playerId}`, { params })
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

export async function toggleLeague(leagueId: number) {
  const { data } = await api.post(`/api/sync/leagues/${leagueId}/toggle`)
  return data
}

// ── Reports ────────────────────────────────────────────────────────────────
export async function getPlayerCard(playerId: number) {
  const { data } = await api.get(`/api/reports/player-card/${playerId}`)
  return data
}

export function getProxyImageUrl(originalUrl: string): string {
  if (originalUrl.includes('flagcdn.com')) return originalUrl
  return `${API_BASE}/api/reports/proxy/image?url=${encodeURIComponent(originalUrl)}`
}

// ── WebSocket ──────────────────────────────────────────────────────────────
export function createSyncWs(onMessage: (data: { level: string; message: string }) => void): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = import.meta.env.PROD 
    ? `${protocol}//${window.location.host}/api/sync/ws/sync-logs` 
    : 'ws://localhost:8000/api/sync/ws/sync-logs'
  const ws = new WebSocket(wsUrl)
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch {
      onMessage({ level: 'info', message: event.data })
    }
  }
  return ws
}
