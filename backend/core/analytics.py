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


def aggregate_player_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregates multiple rows per player into a single row with summed stats."""
    if df.empty:
        return df

    # Remove pre-aggregated "Total" rows to avoid double counting during sum
    filtered = df[~df["tournament_name"].str.lower().eq("total")]
    if not filtered.empty:
        df = filtered

    first_cols = ["name", "team", "position", "specific_position", "age", "tournament_name", "season_name"]
    agg_dict = {col: "first" for col in first_cols if col in df.columns}

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    skip_sum = ["player_id", "tournament_id", "season_id", "age", "rating"]
    sum_cols = [c for c in numeric_cols if c not in skip_sum and not c.endswith("_pct")]
    for c in sum_cols:
        agg_dict[c] = "sum"

    agg_df = df.groupby("player_id", as_index=False).agg(agg_dict)

    if "total_passes" in agg_df.columns and "accurate_passes" in agg_df.columns:
        agg_df["accurate_passes_pct"] = np.where(agg_df["total_passes"] > 0, (agg_df["accurate_passes"] / agg_df["total_passes"]) * 100, 0)
    if "dribbles_attempted" in agg_df.columns and "dribbles_won" in agg_df.columns:
        agg_df["dribbles_won_pct"] = np.where(agg_df["dribbles_attempted"] > 0, (agg_df["dribbles_won"] / agg_df["dribbles_attempted"]) * 100, 0)
    if "aerial_duels_total" in agg_df.columns and "aerial_duels_won" in agg_df.columns:
        agg_df["aerial_duels_won_pct"] = np.where(agg_df["aerial_duels_total"] > 0, (agg_df["aerial_duels_won"] / agg_df["aerial_duels_total"]) * 100, 0)
    if "ground_duels_total" in agg_df.columns and "ground_duels_won" in agg_df.columns:
        agg_df["ground_duels_won_pct"] = np.where(agg_df["ground_duels_total"] > 0, (agg_df["ground_duels_won"] / agg_df["ground_duels_total"]) * 100, 0)
    if "total_duels_won" in agg_df.columns and "ground_duels_total" in agg_df.columns and "aerial_duels_total" in agg_df.columns:
        tot_duels = agg_df["ground_duels_total"] + agg_df["aerial_duels_total"]
        agg_df["total_duels_won_pct"] = np.where(tot_duels > 0, (agg_df["total_duels_won"] / tot_duels) * 100, 0)

    return agg_df

def apply_display_mode(df: pd.DataFrame, display_mode: str) -> pd.DataFrame:
    """Converts absolute counting stats to per_90 or per_game."""
    if df.empty or display_mode not in ["per_90", "per_game"]:
        return df
        
    res = df.copy()
    count_cols = [
        "goals", "assists", "accurate_passes", "total_passes", "key_passes",
        "big_chances_created", "accurate_long_balls", "total_long_balls",
        "accurate_crosses", "total_crosses", "total_shots", "shots_on_target",
        "shots_off_target", "blocked_scoring_attempt", "big_chances_missed",
        "dribbles_won", "dribbles_attempted", "aerial_duels_won", "aerial_duels_total",
        "ground_duels_won", "ground_duels_total", "tackles", "interceptions",
        "clearances", "blocked_shots", "dispossessed", "offsides", "possession_lost",
        "total_duels_won", "saves", "clean_sheets", "saves_inside_box", "saves_outside_box",
        "goals_conceded", "goals_conceded_inside_box", "goals_conceded_outside_box",
        "penalties_saved", "punches", "high_claims", "runs_out", "successful_runs_out",
        "expected_goals", "expected_assists"
    ]
    
    for c in count_cols:
        if c in res.columns:
            if display_mode == "per_90":
                res[c] = np.where(res["minutes_played"] > 0, (res[c] / res["minutes_played"]) * 90, 0)
            elif display_mode == "per_game":
                res[c] = np.where(res["appearances"] > 0, res[c] / res["appearances"], 0)
    return res


def get_available_metrics() -> list[dict]:
    """Return list of metric names available for charts."""
    return [
        {"key": "goals", "label": "Goals", "category": "General"},
        {"key": "assists", "label": "Assists", "category": "General"},
        {"key": "rating", "label": "Rating", "category": "General"},
        {"key": "appearances", "label": "Appearances", "category": "General"},
        {"key": "minutes_played", "label": "Minutes Played", "category": "General"},
        {"key": "expected_goals", "label": "Expected Goals (xG)", "category": "General"},
        {"key": "expected_assists", "label": "Expected Assists (xA)", "category": "General"},
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


def compute_positional_average(df: pd.DataFrame, position: str, filters: dict | None = None) -> dict:
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
    
    if filters:
        if filters.get("age_min") is not None:
            pos_df = pos_df[pos_df["age"] >= filters["age_min"]]
        if filters.get("age_max") is not None:
            pos_df = pos_df[pos_df["age"] <= filters["age_max"]]
        if filters.get("minutes_min") is not None:
            pos_df = pos_df[pos_df["minutes_played"] >= filters["minutes_min"]]
        if filters.get("minutes_max") is not None:
            pos_df = pos_df[pos_df["minutes_played"] <= filters["minutes_max"]]

    if pos_df.empty:
        return {}
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

    comp_df = df.copy()

    # Apply position filter
    if position:
        mask = (
            comp_df["position"].str.contains(position, case=False, na=False) |
            comp_df["specific_position"].str.contains(position, case=False, na=False)
        )
        comp_df = comp_df[mask]

    # Apply additional filters
    if filters:
        if filters.get("age_min"):
            comp_df = comp_df[comp_df["age"] >= filters["age_min"]]
        if filters.get("age_max"):
            comp_df = comp_df[comp_df["age"] <= filters["age_max"]]
        if filters.get("minutes_min"):
            comp_df = comp_df[comp_df["minutes_played"] >= filters["minutes_min"]]
        if filters.get("minutes_max"):
            comp_df = comp_df[comp_df["minutes_played"] <= filters["minutes_max"]]
        if filters.get("comparison_league"):
            leagues = filters["comparison_league"].split(",")
            comp_df = comp_df[comp_df["tournament_name"].isin(leagues)]
        if filters.get("comparison_season"):
            seasons = filters["comparison_season"].split(",")
            comp_df = comp_df[comp_df["season_name"].isin(seasons)]
        if filters.get("team"):
            comp_df = comp_df[comp_df["team"] == filters["team"]]

    comp_df = aggregate_player_stats(comp_df)
    
    player_row = None
    if filters and filters.get("player_id"):
        player_df = df[df["player_id"] == filters["player_id"]]
        if filters.get("player_league") and filters["player_league"] != "Total":
            player_df = player_df[player_df["tournament_name"] == filters["player_league"]]
        if filters.get("player_season") and filters["player_season"] != "Total":
            player_df = player_df[player_df["season_name"] == filters["player_season"]]
        
        player_df = aggregate_player_stats(player_df)
        if not player_df.empty:
            player_row = player_df.iloc[0:1]

    if player_row is not None and not player_row.empty:
        pid = player_row["player_id"].iloc[0]
        comp_df = comp_df[comp_df["player_id"] != pid]
        comp_df = pd.concat([comp_df, player_row], ignore_index=True)

    if filters and filters.get("display_mode"):
        comp_df = apply_display_mode(comp_df, filters["display_mode"])

    if comp_df.empty or metric_x not in comp_df.columns or metric_y not in comp_df.columns:
        return {"players": [], "average": None}

    plot_df = comp_df.dropna(subset=[metric_x, metric_y])

    avg_x = plot_df[metric_x].mean()
    avg_y = plot_df[metric_y].mean()

    if top_n and len(plot_df) > top_n:
        plot_df["score"] = normalize_0_1(plot_df[metric_x]) + normalize_0_1(plot_df[metric_y])
        # If target player is provided, ensure they are in the plot_df
        target_pid = filters.get("player_id") if filters else None
        
        top_players = plot_df.nlargest(top_n, "score")
        if target_pid and target_pid not in top_players["player_id"].values:
            target_row = plot_df[plot_df["player_id"] == target_pid]
            if not target_row.empty:
                top_players = pd.concat([top_players.iloc[:-1], target_row])
                
        plot_df = top_players

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


def get_radar_data(
    player_id: int,
    metrics: list[str] | None = None,
    player_league: str | None = None,
    player_season: str | None = None,
    display_mode: str | None = None,
    comparison_position: str | None = None,
    filters: dict | None = None,
) -> dict:
    """
    Build radar chart data for a player showing percentiles vs positional average.
    """
    df = build_dataframe()
    if df.empty:
        return {"player": None, "average": None, "metrics": []}

    comp_df = df.copy()

    player_df = df[df["player_id"] == player_id]
    if player_league and player_league != "Total":
        player_df = player_df[player_df["tournament_name"] == player_league]
    if player_season and player_season != "Total":
        player_df = player_df[player_df["season_name"] == player_season]

    player_df = aggregate_player_stats(player_df)
    if display_mode:
        player_df = apply_display_mode(player_df, display_mode)

    if player_df.empty:
        return {"player": None, "average": None, "metrics": []}

    player = player_df.iloc[0]
    position = comparison_position if comparison_position else player.get("position", "")

    if filters:
        if filters.get("comparison_league"):
            comp_league_list = filters["comparison_league"].split(",")
            comp_df = comp_df[comp_df["tournament_name"].isin(comp_league_list)]
        if filters.get("comparison_season"):
            comp_season_list = filters["comparison_season"].split(",")
            comp_df = comp_df[comp_df["season_name"].isin(comp_season_list)]
        
    comp_df = aggregate_player_stats(comp_df)
    if display_mode:
        comp_df = apply_display_mode(comp_df, display_mode)

    if not metrics:
        metrics = [
            "goals", "assists", "key_passes", "accurate_passes_pct",
            "dribbles_won", "tackles", "interceptions", "aerial_duels_won_pct",
        ]

    # Get positional average
    avg = compute_positional_average(comp_df, position, filters)

    # Get the comparison group distribution
    mask = comp_df["position"].str.contains(position, case=False, na=False)
    if mask.sum() == 0:
        mask = comp_df["specific_position"].str.contains(position, case=False, na=False)
    
    pos_df = comp_df[mask] if mask.sum() > 0 else pd.DataFrame()
    
    if filters and not pos_df.empty:
        if filters.get("age_min") is not None:
            pos_df = pos_df[pos_df["age"] >= filters["age_min"]]
        if filters.get("age_max") is not None:
            pos_df = pos_df[pos_df["age"] <= filters["age_max"]]
        if filters.get("minutes_min") is not None:
            pos_df = pos_df[pos_df["minutes_played"] >= filters["minutes_min"]]
        if filters.get("minutes_max") is not None:
            pos_df = pos_df[pos_df["minutes_played"] <= filters["minutes_max"]]

    result_metrics = []
    for m in metrics:
        player_val = float(player[m]) if m in player.index and pd.notna(player[m]) else 0
        avg_val = avg.get(m, 0) or 0
        
        pctile_val = 50.0
        if not pos_df.empty and m in pos_df.columns:
            dist = pos_df[m].dropna()
            if not dist.empty:
                pctile_val = float((dist <= player_val).mean() * 100)

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
