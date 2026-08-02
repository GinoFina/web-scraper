import { useState, useEffect, useRef, useCallback } from 'react'
import { addLeague, updateAll, getTrackedLeagues, deleteLeague, toggleLeague, createSyncWs, API_BASE } from '../../services/api'

interface LogEntry {
  level: string
  message: string
  timestamp: string
}

export default function SyncPage() {
  const [leagues, setLeagues] = useState<any[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [url, setUrl] = useState('')
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
    let ws: WebSocket
    const connect = () => {
      ws = createSyncWs((data) => {
        setLogs((prev) => [
          ...prev,
          { ...data, timestamp: new Date().toLocaleTimeString() },
        ])
      })
      ws.onclose = () => {
        // Auto-reconnect if connection is lost
        setTimeout(connect, 3000)
      }
      wsRef.current = ws
    }
    connect()

    return () => {
      if (ws) {
        ws.onclose = null // prevent reconnect on unmount
        ws.close()
      }
    }
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
      await addLeague(url.trim())
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

  const handleToggleTracking = async (id: number) => {
    await toggleLeague(id)
    await fetchLeagues()
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === 'Never') return 'Never'
    const clean = dateStr.slice(0, 10)
    const parts = clean.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return clean
  }

  // Group leagues by tournament_name
  const groupedLeagues = Object.values(
    leagues.reduce((acc: Record<string, any[]>, item: any) => {
      const name = item.tournament_name || 'Unknown League'
      if (!acc[name]) acc[name] = []
      acc[name].push(item)
      return acc
    }, {})
  ).map((group: any[]) => {
    return group.sort((a, b) => (b.season_name || '').localeCompare(a.season_name || ''))
  })

  return (
    <div className="min-h-full flex flex-col gap-5 animate-fade-in overflow-hidden" style={{ paddingLeft: '14px', paddingRight: '14px', paddingBottom: '10px' }}>
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
              <div className="flex flex-col gap-3">
                {groupedLeagues.map((group) => {
                  const main = group[0]
                  const older = group.slice(1)
                  const name = main.tournament_name || 'Unknown'
                  const isExpanded = !!expandedGroups[name]
                  const isActive = main.is_active !== 0

                  return (
                    <div key={name} className="relative flex flex-col">
                      {/* Main League Row */}
                      <div
                        className="flex items-center justify-between p-3 rounded-lg transition-all duration-200"
                        style={{
                          background: isActive ? 'var(--color-surface-700)' : 'var(--color-surface-800)',
                          border: `1px solid ${isActive ? 'var(--color-border)' : 'var(--color-surface-600)'}`,
                          opacity: isActive ? 1 : 0.65,
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {name}
                            </p>
                            {!isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: '#3f3f46', color: '#d4d4d8' }}>
                                Pausado
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            Temporada {main.season_name} · Last: {formatDate(main.last_updated)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {older.length > 0 && (
                            <button
                              onClick={() => setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }))}
                              className="btn-ghost px-2 flex items-center justify-center transition-colors duration-200"
                              style={{ border: 'none', background: isExpanded ? 'var(--color-surface-600)' : 'transparent', color: isExpanded ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }}
                              title="Historial de Temporadas"
                            >
                              <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                          <button
                            className={`text-xs px-3 py-1.5 w-[115px] whitespace-nowrap flex items-center justify-center ${isActive ? 'btn-danger' : 'btn-ghost font-medium'}`}
                            style={
                              !isActive
                                ? { background: 'var(--color-surface-600)', color: 'var(--color-text-primary)', border: '1px solid var(--color-surface-400)' }
                                : undefined
                            }
                            onClick={() => handleToggleTracking(main.id)}
                          >
                            {isActive ? 'Stop Tracking' : 'Start Tracking'}
                          </button>
                        </div>
                      </div>

                      {/* Dropdown for Older Seasons (pushes content down) */}
                      <div
                        className="relative overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                          maxHeight: isExpanded ? '500px' : '0px',
                          opacity: isExpanded ? 1 : 0,
                          marginTop: isExpanded ? '0.25rem' : '0px'
                        }}
                      >
                        <div className="rounded-lg border border-[var(--color-surface-500)] bg-[var(--color-surface-800)]">
                          <div className="p-1.5 flex flex-col max-h-[250px] overflow-y-auto">
                            {older.map((old) => (
                              <div key={old.id} className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition-colors">
                                <div>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Temporada {old.season_name} · Last: {formatDate(old.last_updated)}</p>
                                </div>
                                <button
                                  className={`text-xs px-3 py-1.5 w-[115px] whitespace-nowrap flex items-center justify-center ${old.is_active !== 0 ? 'btn-danger' : 'btn-ghost font-medium'}`}
                                  style={
                                    old.is_active === 0
                                      ? { background: 'var(--color-surface-600)', color: 'var(--color-text-primary)', border: '1px solid var(--color-surface-400)' }
                                      : undefined
                                  }
                                  onClick={() => handleToggleTracking(old.id)}
                                >
                                  {old.is_active !== 0 ? 'Stop Tracking' : 'Start Tracking'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
