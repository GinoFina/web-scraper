"""
API Router: Sync — scraper control, tracked leagues, WebSocket logs.
"""

import asyncio
import io
import csv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database.connection import get_connection
from database import repositories as repo
from scraper.collector import run_league_pipeline, run_update_all

router = APIRouter(prefix="/api/sync", tags=["sync"])

# ── Connected WebSocket clients ───────────────────────────────────────────────
_ws_clients: set[WebSocket] = set()


async def _broadcast(level: str, message: str) -> None:
    """Send a log message to all connected WebSocket clients."""
    global _ws_clients
    payload = {"level": level, "message": message}
    dead = set()
    for ws in _ws_clients:
        try:
            await ws.send_json(payload)
        except Exception as e:
            print(f"[WS ERROR] Failed to send to {ws}: {e}", flush=True)
            dead.add(ws)
    _ws_clients -= dead


def _make_log_callback(loop: asyncio.AbstractEventLoop):
    """Create a sync log callback that pushes to WebSocket via the event loop."""
    def log(level: str, message: str) -> None:
        try:
            asyncio.run_coroutine_threadsafe(_broadcast(level, message), loop)
        except Exception as e:
            print(f"[WS] Error scheduling log: {e}", flush=True)
    return log


# ── Models ────────────────────────────────────────────────────────────────────

class AddLeagueRequest(BaseModel):
    url: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/leagues")
def get_leagues():
    """List all tracked leagues with their status."""
    conn = get_connection()
    return repo.get_tracked_leagues(conn)


@router.post("/league")
async def add_league(req: AddLeagueRequest):
    """Add and scrape a new league URL. Runs league → enrich → recalculate pipeline."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.get_event_loop()
    log = _make_log_callback(loop)

    result = await asyncio.to_thread(
        run_league_pipeline,
        url=req.url,
        accumulation="total",
        delay=0.5,
        log=log,
    )
    return result


@router.post("/update-all")
async def update_all():
    """Update all tracked leagues, enrich, and recalculate."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.get_event_loop()
    log = _make_log_callback(loop)

    result = await asyncio.to_thread(
        run_update_all,
        delay=0.5,
        log=log,
    )
    return result


@router.post("/leagues/{league_id}/toggle")
def toggle_league(league_id: int):
    """Toggle tracking state of a league without deleting it."""
    conn = get_connection()
    return repo.toggle_tracked_league(conn, league_id)


@router.delete("/leagues/{league_id}")
def delete_league(league_id: int):
    """Remove a tracked league."""
    conn = get_connection()
    deleted = repo.delete_tracked_league(conn, league_id)
    return {"deleted": deleted}


@router.get("/export")
def export_csv():
    """Export all season stats to a CSV file."""
    conn = get_connection()
    stats = repo.get_all_stats_as_dicts(conn)
    
    if not stats:
        return {"error": "No data available"}
        
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=stats[0].keys())
    writer.writeheader()
    writer.writerows(stats)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sofascore_stats.csv"}
    )

# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/sync-logs")
async def ws_sync_logs(ws: WebSocket):
    """WebSocket endpoint for real-time scraper log streaming."""
    await ws.accept()
    _ws_clients.add(ws)
    await ws.send_json({"level": "success", "message": "WebSocket connected!"})
    try:
        while True:
            # Keep connection alive, client can send pings
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _ws_clients.discard(ws)
