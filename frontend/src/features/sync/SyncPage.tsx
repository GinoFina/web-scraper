import { useState, useEffect, useRef, useCallback } from 'react'
import { addLeague, updateAll, getTrackedLeagues, deleteLeague, createSyncWs, API_BASE } from '../../services/api'

interface LogEntry {
  level: string
  message: string
  timestamp: string
}

export default function SyncPage() {
  const [leagues, setLeagues] = useState<any[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [url, setUrl] = useState('')
  const [accumulation, setAccumulation] = useState('total')
  const [syncing, setSyncing] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch tracked leagues
  const fetchLeagues = useCallback(async () => {
    try {
      const data = await getTrackedLeagues()
      setLeagues(data)
    } catch {
      // Backend not available
    }
  }, [])

  useEffect(() => { fetchLeagues() }, [fetchLeagues])

  // WebSocket connection
  useEffect(() => {
    const ws = createSyncWs((data) => {
      setLogs((prev) => [
        ...prev,
        { ...data, timestamp: new Date().toLocaleTimeString() },
      ])
    })
    wsRef.current = ws
    return () => { ws.close() }
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  const handleAddLeague = async () => {
    if (!url.trim()) return
    setSyncing(true)
    setLogs((prev) => [...prev, { level: 'info', message: `Starting pipeline for: ${url}`, timestamp: new Date().toLocaleTimeString() }])
    try {
      await addLeague(url.trim(), accumulation)
      setUrl('')
      await fetchLeagues()
    } catch (err: any) {
      setLogs((prev) => [...prev, { level: 'error', message: `Error: ${err.message}`, timestamp: new Date().toLocaleTimeString() }])
    }
    setSyncing(false)
  }

  const handleUpdateAll = async () => {
    setSyncing(true)
    setLogs((prev) => [...prev, { level: 'info', message: 'Updating all tracked leagues...', timestamp: new Date().toLocaleTimeString() }])
    try {
      await updateAll()
      await fetchLeagues()
    } catch (err: any) {
      setLogs((prev) => [...prev, { level: 'error', message: `Error: ${err.message}`, timestamp: new Date().toLocaleTimeString() }])
    }
    setSyncing(false)
  }

  const handleDelete = async (id: number) => {
    await deleteLeague(id)
    await fetchLeagues()
  }

  return (
    <div className="h-full flex flex-col p-6 gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Sync Panel</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Scraper control & real-time logs
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost flex items-center gap-2 text-xs"
            onClick={() => window.location.href = `${API_BASE}/api/sync/export`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleUpdateAll}
            disabled={syncing || leagues.length === 0}
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Update All
          </button>
        </div>
      </div>

      {/* Add League Form */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>Add New League</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Sofascore league URL (e.g. https://www.sofascore.com/tournament/football/...)"
            className="input-dark flex-1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLeague()}
          />
          <select className="input-dark w-32" value={accumulation} onChange={(e) => setAccumulation(e.target.value)}>
            <option value="total">Total</option>
            <option value="perGame">Per Game</option>
            <option value="per90">Per 90</option>
          </select>
          <button className="btn-primary" onClick={handleAddLeague} disabled={syncing || !url.trim()}>
            {syncing ? 'Syncing...' : 'Add & Sync'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0">
        {/* Tracked Leagues */}
        <div className="glass-card p-4 flex flex-col">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Tracked Leagues ({leagues.length})
          </h3>
          <div className="flex-1 overflow-auto">
            {leagues.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                No leagues tracked yet. Add one above.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {leagues.map((league: any) => (
                  <div
                    key={league.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--color-surface-700)', border: '1px solid var(--color-border)' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {league.tournament_name || 'Unknown'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {league.season_name} · {league.accumulation} · Last: {league.last_updated?.slice(0, 10) || 'Never'}
                      </p>
                    </div>
                    <button className="btn-danger" onClick={() => handleDelete(league.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Terminal Console */}
        <div className="glass-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Console</h3>
            <button
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-700)', border: 'none', cursor: 'pointer' }}
              onClick={() => setLogs([])}
            >
              Clear
            </button>
          </div>
          <div ref={terminalRef} className="terminal flex-1 min-h-[200px]">
            {logs.length === 0 ? (
              <span style={{ color: 'var(--color-text-muted)' }}>
                {'>'} Waiting for sync activity...{'\n'}
                {'>'} Add a league URL and click "Add & Sync" to begin.
              </span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`log-${log.level}`}>
                  <span style={{ color: 'var(--color-text-muted)' }}>[{log.timestamp}]</span>{' '}
                  {log.level === 'error' && <span style={{ color: 'var(--color-accent-red)' }}>✗ </span>}
                  {log.level === 'success' && <span style={{ color: 'var(--color-accent-green)' }}>✓ </span>}
                  {log.level === 'warning' && <span style={{ color: 'var(--color-accent-amber)' }}>⚠ </span>}
                  {log.level === 'progress' && <span style={{ color: 'var(--color-accent-cyan)' }}>→ </span>}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
