"""
API Router: Filter options for frontend dropdowns.
"""

from fastapi import APIRouter

from database.connection import get_connection
from database import repositories as repo
from core.analytics import get_available_metrics, get_roles

router = APIRouter(prefix="/api/filters", tags=["filters"])


@router.get("/positions")
def list_positions():
    conn = get_connection()
    general_raw = repo.get_distinct_values(conn, "players", "position")
    specific_raw = repo.get_distinct_values(conn, "players", "specific_position")
    
    specific_set = set()
    for pos in specific_raw:
        for p in pos.split("/"):
            if p.strip():
                specific_set.add(p.strip().upper())
                
    general = sorted([p.upper() for p in general_raw])
    specific = sorted(list(specific_set))
    
    return {"general": general, "specific": specific}


@router.get("/leagues")
def list_leagues():
    conn = get_connection()
    return repo.get_distinct_values(conn, "season_stats", "tournament_name")


@router.get("/nationalities")
def list_nationalities():
    conn = get_connection()
    return repo.get_distinct_values(conn, "players", "nationality")


@router.get("/teams")
def list_teams():
    conn = get_connection()
    return repo.get_distinct_values(conn, "players", "team")


@router.get("/seasons")
def list_seasons():
    conn = get_connection()
    return repo.get_distinct_values(conn, "season_stats", "season_name")


@router.get("/metrics")
def list_metrics():
    return get_available_metrics()


@router.get("/roles")
def list_roles():
    return get_roles()
