"""
Analytics engine — Pandas/Numpy-based statistical processing.
Handles percentiles, positional averages, normalization, and role scoring.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from database.connection import get_connection
from database import repositories as repo
from scraper.config import LEAGUE_MULTIPLIERS

# Load role definitions
_ROLES_PATH = Path(__file__).resolve().parent / "roles.json"


def _load_roles() -> dict:
    with open(_ROLES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_roles() -> dict:
    """Return role definitions for frontend consumption."""
    return _load_roles()


def get_available_metrics() -> list[dict]:
    """Return list of metric names available for charts."""
    return [
        {"key": "goals", "label": "Goals", "category": "General"},
        {"key": "assists", "label": "Assists", "category": "General"},
        {"key": "rating", "label": "Rating", "category": "General"},
        {"key": "appearances", "label": "Appearances", "category": "General"},
        {"key": "minutes_played", "label": "Minutes Played", "category": "General"},
        {"key": "accurate_passes", "label": "Accurate Passes", "category": "Passing"},
        {"key": "accurate_passes_pct", "label": "Pass Accuracy %", "category": "Passing"},
        {"key": "key_passes", "label": "Key Passes", "category": "Passing"},
        {"key": "big_chances_created", "label": "Big Chances Created", "category": "Passing"},
        {"key": "accurate_long_balls", "label": "Accurate Long Balls", "category": "Passing"},
        {"key": "accurate_long_balls_pct", "label": "Long Ball Accuracy %", "category": "Passing"},
        {"key": "accurate_crosses", "label": "Accurate Crosses", "category": "Passing"},
        {"key": "accurate_crosses_pct", "label": "Cross Accuracy %", "category": "Passing"},
        {"key": "total_shots", "label": "Total Shots", "category": "Shooting"},
        {"key": "shots_on_target", "label": "Shots on Target", "category": "Shooting"},
        {"key": "big_chances_missed", "label": "Big Chances Missed", "category": "Shooting"},
        {"key": "dribbles_won", "label": "Dribbles Won", "category": "Dribbling"},
        {"key": "dribbles_won_pct", "label": "Dribble Success %", "category": "Dribbling"},
        {"key": "aerial_duels_won", "label": "Aerial Duels Won", "category": "Duels"},
        {"key": "aerial_duels_won_pct", "label": "Aerial Duel %", "category": "Duels"},
        {"key": "ground_duels_won", "label": "Ground Duels Won", "category": "Duels"},
        {"key": "ground_duels_won_pct", "label": "Ground Duel %", "category": "Duels"},
        {"key": "total_duels_won", "label": "Total Duels Won", "category": "Duels"},
        {"key": "total_duels_won_pct", "label": "Duel Success %", "category": "Duels"},
        {"key": "tackles", "label": "Tackles", "category": "Defense"},
        {"key": "interceptions", "label": "Interceptions", "category": "Defense"},
        {"key": "clearances", "label": "Clearances", "category": "Defense"},
        {"key": "blocked_shots", "label": "Blocked Shots", "category": "Defense"},
        {"key": "dispossessed", "label": "Dispossessed", "category": "Defense"},
        {"key": "possession_lost", "label": "Possession Lost", "category": "Defense"},
    ]


def build_dataframe(accumulation: str = "total") -> pd.DataFrame:
    """Build a Pandas DataFrame from all stats + player info."""
    conn = get_connection()
    data = repo.get_all_stats_as_dicts(conn, accumulation)
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)


def compute_positional_average(df: pd.DataFrame, position: str) -> dict:
    """
    Compute the average stats for a given position.
    Used as the baseline "Average Player" in charts.
    """
    if df.empty:
        return {}

    mask = df["position"].str.contains(position, case=False, na=False)
    if mask.sum() == 0:
        # Try specific_position
        mask = df["specific_position"].str.contains(position, case=False, na=False)

    if mask.sum() == 0:
        return {}

    pos_df = df[mask]
    numeric_cols = pos_df.select_dtypes(include=[np.number]).columns
    averages = pos_df[numeric_cols].mean().to_dict()

    # Clean NaN values
    return {k: round(v, 2) if pd.notna(v) else None for k, v in averages.items()}


def compute_percentiles(df: pd.DataFrame, position: str, metrics: list[str]) -> pd.DataFrame:
    """
    Compute percentile ranks for players within a position group.
    Returns a DataFrame with player_id and percentile columns (0-100).
    """
    if df.empty:
        return pd.DataFrame()

    mask = df["position"].str.contains(position, case=False, na=False)
    if mask.sum() == 0:
        mask = df["specific_position"].str.contains(position, case=False, na=False)

    pos_df = df[mask].copy()
    if pos_df.empty:
        return pd.DataFrame()

    result = pos_df[["player_id", "name"]].copy()
    for metric in metrics:
        if metric in pos_df.columns:
            result[f"{metric}_percentile"] = pos_df[metric].rank(pct=True) * 100

    return result


def normalize_0_1(series: pd.Series) -> pd.Series:
    """Min-max normalization to [0, 1] range."""
    min_val = series.min()
    max_val = series.max()
    if max_val == min_val:
        return pd.Series(0.5, index=series.index)
    return (series - min_val) / (max_val - min_val)


def get_scatter_data(
    metric_x: str,
    metric_y: str,
    position: str | None = None,
    top_n: int | None = None,
    filters: dict | None = None,
) -> dict:
    """
    Build scatter plot data with X/Y metrics.
    Includes the positional average as a reference point.
    """
    df = build_dataframe()
    if df.empty:
        return {"players": [], "average": None}

    # Apply position filter
    if position:
        mask = (
            df["position"].str.contains(position, case=False, na=False) |
            df["specific_position"].str.contains(position, case=False, na=False)
        )
        df = df[mask]

    # Apply additional filters
    if filters:
        if filters.get("age_min"):
            df = df[df["age"] >= filters["age_min"]]
        if filters.get("age_max"):
            df = df[df["age"] <= filters["age_max"]]
        if filters.get("minutes_min"):
            df = df[df["minutes_played"] >= filters["minutes_min"]]
        if filters.get("minutes_max"):
            df = df[df["minutes_played"] <= filters["minutes_max"]]
        if filters.get("league"):
            df = df[df["tournament_name"] == filters["league"]]
        if filters.get("team"):
            df = df[df["team"] == filters["team"]]

    if df.empty or metric_x not in df.columns or metric_y not in df.columns:
        return {"players": [], "average": None}

    # Drop rows with NaN in the selected metrics
    plot_df = df.dropna(subset=[metric_x, metric_y])

    # Compute positional average
    avg_x = plot_df[metric_x].mean()
    avg_y = plot_df[metric_y].mean()

    # Sort by rating or first metric and take top N
    if top_n and top_n > 0:
        sort_col = "rating" if "rating" in plot_df.columns else metric_x
        plot_df = plot_df.nlargest(top_n, sort_col)

    players = []
    for _, row in plot_df.iterrows():
        players.append({
            "player_id": int(row.get("player_id", 0)),
            "name": row.get("name", ""),
            "team": row.get("team", ""),
            "age": int(row["age"]) if pd.notna(row.get("age")) else None,
            "x": round(float(row[metric_x]), 2) if pd.notna(row[metric_x]) else None,
            "y": round(float(row[metric_y]), 2) if pd.notna(row[metric_y]) else None,
        })

    return {
        "players": players,
        "average": {
            "x": round(float(avg_x), 2) if pd.notna(avg_x) else None,
            "y": round(float(avg_y), 2) if pd.notna(avg_y) else None,
            "label": f"Average {position or 'All'}",
        },
        "meta": {"metric_x": metric_x, "metric_y": metric_y, "count": len(players)},
    }


def get_radar_data(player_id: int, metrics: list[str] | None = None) -> dict:
    """
    Build radar chart data for a player showing percentiles vs positional average.
    """
    df = build_dataframe()
    if df.empty:
        return {"player": None, "average": None, "metrics": []}

    player_row = df[df["player_id"] == player_id]
    if player_row.empty:
        return {"player": None, "average": None, "metrics": []}

    player = player_row.iloc[0]
    position = player.get("position", "")

    if not metrics:
        metrics = [
            "goals", "assists", "key_passes", "accurate_passes_pct",
            "dribbles_won", "tackles", "interceptions", "aerial_duels_won_pct",
        ]

    # Get positional average
    avg = compute_positional_average(df, position)

    # Compute percentiles within position group
    pctiles = compute_percentiles(df, position, metrics)
    player_pctile = pctiles[pctiles["player_id"] == player_id]

    result_metrics = []
    for m in metrics:
        player_val = float(player[m]) if m in player.index and pd.notna(player[m]) else 0
        avg_val = avg.get(m, 0) or 0
        pctile_val = 50.0
        if not player_pctile.empty and f"{m}_percentile" in player_pctile.columns:
            pv = player_pctile.iloc[0][f"{m}_percentile"]
            pctile_val = float(pv) if pd.notna(pv) else 50.0

        result_metrics.append({
            "key": m,
            "label": m.replace("_", " ").title(),
            "value": round(player_val, 2),
            "average": round(avg_val, 2),
            "percentile": round(pctile_val, 1),
        })

    return {
        "player": {
            "player_id": int(player["player_id"]),
            "name": player.get("name", ""),
            "team": player.get("team", ""),
            "position": position,
        },
        "average_label": f"Average {position}",
        "metrics": result_metrics,
    }
