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
    league: Optional[str] = None,
    team: Optional[str] = None,
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
    if league:
        filters["league"] = league
    if team:
        filters["team"] = team

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
):
    """Radar chart data for a player showing values + percentiles vs position average."""
    metric_list = metrics.split(",") if metrics else None
    return get_radar_data(player_id, metric_list)


@router.get("/metrics")
def metrics():
    """List of available metrics for chart selectors."""
    return get_available_metrics()
