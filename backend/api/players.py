"""
API Router: Player CRUD and detail endpoints.
"""

from fastapi import APIRouter, Query

from database.connection import get_connection
from database import repositories as repo

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("")
def get_players(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    name: str | None = None,
    position: str | None = None,
    specific_position: str | None = None,
    nationality: str | None = None,
    team: str | None = None,
    league: str | None = None,
    season: str | None = None,
    age_min: int | None = None,
    age_max: int | None = None,
    minutes_min: int | None = None,
    minutes_max: int | None = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
):
    """Paginated player list with filtering and sorting."""
    conn = get_connection()
    return repo.get_players_paginated(
        conn,
        page=page,
        page_size=page_size,
        name=name,
        position=position,
        specific_position=specific_position,
        nationality=nationality,
        team=team,
        league=league,
        season=season,
        age_min=age_min,
        age_max=age_max,
        minutes_min=minutes_min,
        minutes_max=minutes_max,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


@router.get("/{player_id}")
def get_player(player_id: int):
    """Get detailed player data with all stats."""
    conn = get_connection()
    result = repo.get_player_detail(conn, player_id)
    if not result:
        return {"error": "Player not found"}
    return result
