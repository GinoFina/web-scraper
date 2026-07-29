"""
API Router: Analytics endpoints for scatter plots, radar charts, comparisons.
"""

from fastapi import APIRouter, Query
from typing import Optional

from core.analytics import get_scatter_data, get_radar_data, get_available_metrics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/scatter")
def scatter(
    metric_x: str = Query(..., description="X-axis metric key"),
    metric_y: str = Query(..., description="Y-axis metric key"),
    position: Optional[str] = None,
    top_n: Optional[int] = Query(None, ge=1, le=500),
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    minutes_min: Optional[int] = None,
    minutes_max: Optional[int] = None,
    player_id: Optional[int] = None,
    player_league: Optional[str] = None,
    player_season: Optional[str] = None,
    comparison_league: Optional[str] = None,
    comparison_season: Optional[str] = None,
    team: Optional[str] = None,
    display_mode: Optional[str] = None,
):
    """Scatter plot data: X vs Y metric with positional average baseline."""
    filters = {}
    if age_min:
        filters["age_min"] = age_min
    if age_max:
        filters["age_max"] = age_max
    if minutes_min:
        filters["minutes_min"] = minutes_min
    if minutes_max:
        filters["minutes_max"] = minutes_max
    if player_id:
        filters["player_id"] = player_id
    if player_league:
        filters["player_league"] = player_league
    if player_season:
        filters["player_season"] = player_season
    if comparison_league:
        filters["comparison_league"] = comparison_league
    if comparison_season:
        filters["comparison_season"] = comparison_season
    if team:
        filters["team"] = team
    if display_mode:
        filters["display_mode"] = display_mode

    return get_scatter_data(
        metric_x=metric_x,
        metric_y=metric_y,
        position=position,
        top_n=top_n,
        filters=filters if filters else None,
    )


@router.get("/radar/{player_id}")
def radar(
    player_id: int,
    metrics: Optional[str] = Query(None, description="Comma-separated metric keys"),
    player_league: Optional[str] = None,
    player_season: Optional[str] = None,
    display_mode: Optional[str] = None,
    comparison_position: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    minutes_min: Optional[int] = None,
    minutes_max: Optional[int] = None,
    comparison_league: Optional[str] = None,
    comparison_season: Optional[str] = None,
):
    """Radar chart data for a player showing values + percentiles vs position average."""
    metric_list = metrics.split(",") if metrics else None
    filters = {
        "age_min": age_min,
        "age_max": age_max,
        "minutes_min": minutes_min,
        "minutes_max": minutes_max,
        "comparison_league": comparison_league,
        "comparison_season": comparison_season,
    }
    return get_radar_data(player_id, metric_list, player_league, player_season, display_mode, comparison_position, filters)


@router.get("/metrics")
def metrics():
    """List of available metrics for chart selectors."""
    return get_available_metrics()
