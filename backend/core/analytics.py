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

from core.paths import ROLES_CONFIG_PATH as _ROLES_PATH


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

    # Sort by minutes_played descending so 'first' aggregation picks the tournament with most minutes
    if "minutes_played" in df.columns:
        df = df.sort_values("minutes_played", ascending=False)

    first_cols = [
        "name", "team", "position", "specific_position", "age", "tournament_name", "season_name",
        "role", "role_score", "league_score", "world_score", "nationality", "country_alpha2"
    ]
    agg_dict = {col: "first" for col in first_cols if col in df.columns}

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    skip_sum = ["player_id", "tournament_id", "season_id", "age", "rating", "role_score", "league_score", "world_score"]
    sum_cols = [c for c in numeric_cols if c not in skip_sum and not c.endswith("_pct") and not c.endswith("_id") and ":" not in c]
    for c in sum_cols:
        agg_dict[c] = "sum"
        
    if "rating" in df.columns:
        agg_dict["rating"] = "mean"
    if "max_speed" in df.columns:
        agg_dict["max_speed"] = "max"

    agg_df = df.groupby("player_id", as_index=False).agg(agg_dict)

    if "total_passes" in agg_df.columns and "accurate_passes" in agg_df.columns:
        agg_df["accurate_passes_pct"] = np.where(agg_df["total_passes"] > 0, (agg_df["accurate_passes"] / agg_df["total_passes"]) * 100, 0)
    if "dribbles_attempted" in agg_df.columns and "dribbles_won" in agg_df.columns:
        agg_df["dribbles_won_pct"] = np.where(agg_df["dribbles_attempted"] > 0, (agg_df["dribbles_won"] / agg_df["dribbles_attempted"]) * 100, 0)
    if "aerial_duels_total" in agg_df.columns and "aerial_duels_won" in agg_df.columns:
        agg_df["aerial_duels_won_pct"] = np.where(agg_df["aerial_duels_total"] > 0, (agg_df["aerial_duels_won"] / agg_df["aerial_duels_total"]) * 100, 0)
    if "ground_duels_total" in agg_df.columns and "ground_duels_won" in agg_df.columns:
        agg_df["ground_duels_won_pct"] = np.where(agg_df["ground_duels_total"] > 0, (agg_df["ground_duels_won"] / agg_df["ground_duels_total"]) * 100, 0)
    if "total_crosses" in agg_df.columns and "accurate_crosses" in agg_df.columns:
        agg_df["accurate_crosses_pct"] = np.where(agg_df["total_crosses"] > 0, (agg_df["accurate_crosses"] / agg_df["total_crosses"]) * 100, 0)
    if "total_long_balls" in agg_df.columns and "accurate_long_balls" in agg_df.columns:
        agg_df["accurate_long_balls_pct"] = np.where(agg_df["total_long_balls"] > 0, (agg_df["accurate_long_balls"] / agg_df["total_long_balls"]) * 100, 0)
    if "total_duels_won" in agg_df.columns and "ground_duels_total" in agg_df.columns and "aerial_duels_total" in agg_df.columns:
        tot_duels = agg_df["ground_duels_total"] + agg_df["aerial_duels_total"]
        agg_df["total_duels_total"] = tot_duels
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
        {"key": "total_passes", "label": "Total Passes", "category": "Passing"},
        {"key": "accurate_passes", "label": "Accurate Passes", "category": "Passing"},
        {"key": "accurate_passes_pct", "label": "Pass Accuracy %", "category": "Passing"},
        {"key": "key_passes", "label": "Key Passes", "category": "Passing"},
        {"key": "big_chances_created", "label": "Big Chances Created", "category": "Passing"},
        {"key": "total_long_balls", "label": "Total Long Balls", "category": "Passing"},
        {"key": "accurate_long_balls", "label": "Accurate Long Balls", "category": "Passing"},
        {"key": "accurate_long_balls_pct", "label": "Long Ball Accuracy %", "category": "Passing"},
        {"key": "total_crosses", "label": "Total Crosses", "category": "Passing"},
        {"key": "accurate_crosses", "label": "Accurate Crosses", "category": "Passing"},
        {"key": "accurate_crosses_pct", "label": "Cross Accuracy %", "category": "Passing"},
        {"key": "total_shots", "label": "Total Shots", "category": "Shooting"},
        {"key": "shots_on_target", "label": "Shots on Target", "category": "Shooting"},
        {"key": "big_chances_missed", "label": "Big Chances Missed", "category": "Shooting"},
        {"key": "dribbles_attempted", "label": "Dribbles Attempted", "category": "Dribbling"},
        {"key": "dribbles_won", "label": "Dribbles Won", "category": "Dribbling"},
        {"key": "dribbles_won_pct", "label": "Dribble Success %", "category": "Dribbling"},
        {"key": "aerial_duels_total", "label": "Aerial Duels Total", "category": "Duels"},
        {"key": "aerial_duels_won", "label": "Aerial Duels Won", "category": "Duels"},
        {"key": "aerial_duels_won_pct", "label": "Aerial Duel %", "category": "Duels"},
        {"key": "ground_duels_total", "label": "Ground Duels Total", "category": "Duels"},
        {"key": "ground_duels_won", "label": "Ground Duels Won", "category": "Duels"},
        {"key": "ground_duels_won_pct", "label": "Ground Duel %", "category": "Duels"},
        {"key": "total_duels_total", "label": "Total Duels Total", "category": "Duels"},
        {"key": "total_duels_won", "label": "Total Duels Won", "category": "Duels"},
        {"key": "total_duels_won_pct", "label": "Duel Success %", "category": "Duels"},
        {"key": "tackles", "label": "Tackles", "category": "Defense"},
        {"key": "interceptions", "label": "Interceptions", "category": "Defense"},
        {"key": "clearances", "label": "Clearances", "category": "Defense"},
        {"key": "blocked_shots", "label": "Blocked Shots", "category": "Defense"},
        {"key": "dispossessed", "label": "Dispossessed", "category": "Defense"},
        {"key": "distance_covered", "label": "Distance Covered", "category": "Physical"},
        {"key": "sprints", "label": "Sprints", "category": "Physical"},
        {"key": "max_speed", "label": "Max Speed", "category": "Physical"},
    ]


def build_dataframe(accumulation: str = "total") -> pd.DataFrame:
    """Build a Pandas DataFrame from all stats + player info."""
    conn = get_connection()
    data = repo.get_all_stats_as_dicts(conn, accumulation)
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)


def get_filtered_paginated_players(
    page: int,
    page_size: int,
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
    role: str | None = None,
) -> dict:
    """Fetch players using pandas to properly aggregate multiple matching rows (e.g. halves of a season)."""
    # ALWAYS load accumulation="total" since Sofascore scraper stores both tournament rows and career rows under "total".
    df = build_dataframe(accumulation="total")
    
    if df.empty:
        return {"data": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}

    # Solve the role multiplier bug: player_evaluations has multiple roles per stats_id.
    # We must deduplicate by stats_id (which is 'id' in df) before summing, otherwise stats get multiplied by the number of roles!
    if role:
        df = df[df["role"] == role]
    else:
        if "id" in df.columns and "world_score" in df.columns:
            df = df.sort_values("world_score", ascending=False).drop_duplicates(subset=["id"], keep="first")

    # IMPORTANT: 
    # If the user filters by season or league, we want to sum the specific tournament rows, so EXCLUDE the Career Total row.
    # If the user does NOT filter by season or league ("All Seasons"), we ONLY want the Career Total row.
    if season or league:
        df = df[df["tournament_name"].str.lower() != "total"]
    else:
        df = df[df["tournament_name"].str.lower() == "total"]

    # Apply filters
    if name:
        df = df[df["name"].str.contains(name, case=False, na=False)]
    
    if position:
        mask = df["position"].str.contains(position, case=False, na=False)
        if mask.sum() == 0:
            mask = df["specific_position"].str.contains(position, case=False, na=False)
        df = df[mask]
        
    if specific_position:
        sp_list = [sp.strip() for sp in specific_position.split(",") if sp.strip()]
        if sp_list:
            masks = [df["specific_position"].str.contains(sp, case=False, na=False) for sp in sp_list]
            df = df[pd.concat(masks, axis=1).any(axis=1)]
            
    if nationality:
        nat_list = [n.strip() for n in nationality.split(",") if n.strip()]
        if nat_list:
            df = df[df["nationality"].isin(nat_list)]
            
    if team:
        df = df[df["team"] == team]
        
    if league:
        league_list = [l.strip() for l in league.split(",") if l.strip()]
        if league_list:
            df = df[df["tournament_name"].isin(league_list)]
            
    if season:
        df = df[df["season_name"] == season]
        
    if age_min is not None:
        df = df[df["age"] >= age_min]
    if age_max is not None:
        df = df[df["age"] <= age_max]
        
    if role:
        df = df[df["role"] == role]
        
    if df.empty:
        return {"data": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}
        
    # Aggregate to sum multiple rows per player
    agg_df = aggregate_player_stats(df)
    
    # Apply minutes filter AFTER aggregation
    if minutes_min is not None:
        agg_df = agg_df[agg_df["minutes_played"] >= minutes_min]
    if minutes_max is not None:
        agg_df = agg_df[agg_df["minutes_played"] <= minutes_max]
        
    if agg_df.empty:
        return {"data": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 1}

    # Sort
    if sort_by in agg_df.columns:
        ascending = sort_dir.lower() == "asc"
        # For strings, pandas sorts normally. For numbers, NaN should be handled
        agg_df = agg_df.sort_values(by=sort_by, ascending=ascending, na_position='last')
    
    total = len(agg_df)
    total_pages = max(1, (total + page_size - 1) // page_size)
    
    # Paginate
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_df = agg_df.iloc[start_idx:end_idx]
    
    # Convert to list of dicts. Replace NaN with None
    paginated_df = paginated_df.replace({np.nan: None})
    data = paginated_df.to_dict(orient="records")
    
    return {
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


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
    df = build_dataframe(accumulation="total")
    if df.empty:
        return {"players": [], "average": None}

    # Solve the role multiplier bug: deduplicate by stats_id
    if "id" in df.columns and "world_score" in df.columns:
        df = df.sort_values("world_score", ascending=False).drop_duplicates(subset=["id"], keep="first")

    # If no league filter is applied, we want the Career Total rows.
    # If a league filter IS applied, we want the specific tournament rows.
    if filters and filters.get("comparison_league"):
        leagues = [l.strip() for l in filters["comparison_league"].split(",")]
        if "Total" not in leagues and "total" not in [l.lower() for l in leagues]:
            df = df[df["tournament_name"].str.lower() != "total"]
    else:
        df = df[df["tournament_name"].str.lower() == "total"]

    comp_df = df.copy()

    # Auto-resolve position if not provided but player_id is known
    if not position and filters and filters.get("player_id"):
        player_df = df[df["player_id"] == filters["player_id"]]
        if not player_df.empty:
            position = player_df.iloc[0].get("position", "")

    # Apply position filter
    if position:
        pos_list = [p.strip() for p in position.split(",") if p.strip()]
        if pos_list:
            masks = []
            for p in pos_list:
                m = (
                    comp_df["position"].str.contains(p, case=False, na=False) |
                    comp_df["specific_position"].str.contains(p, case=False, na=False)
                )
                masks.append(m)
            final_mask = pd.concat(masks, axis=1).any(axis=1)
            comp_df = comp_df[final_mask]

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
            leagues = [l.strip() for l in filters["comparison_league"].split(",")]
            if "Total" not in leagues and "total" not in [l.lower() for l in leagues]:
                comp_df = comp_df[comp_df["tournament_name"].isin(leagues)]
        if filters.get("comparison_season"):
            seasons = [s.strip() for s in filters["comparison_season"].split(",")]
            if "Total" not in seasons and "total" not in [s.lower() for s in seasons]:
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
    df = build_dataframe(accumulation="total")
    if df.empty:
        return {"player": None, "average": None, "metrics": []}

    # Solve the role multiplier bug: deduplicate by stats_id
    if "id" in df.columns and "world_score" in df.columns:
        df = df.sort_values("world_score", ascending=False).drop_duplicates(subset=["id"], keep="first")

    comp_df = df.copy()

    # Determine comp_df based on comparison_league
    if filters and filters.get("comparison_league"):
        comp_league_list = [l.strip() for l in filters["comparison_league"].split(",")]
        if "Total" not in comp_league_list and "total" not in [l.lower() for l in comp_league_list]:
            comp_df = comp_df[comp_df["tournament_name"].str.lower() != "total"]
            comp_df = comp_df[comp_df["tournament_name"].isin(comp_league_list)]
        else:
            comp_df = comp_df[comp_df["tournament_name"].str.lower() == "total"]
    else:
        comp_df = comp_df[comp_df["tournament_name"].str.lower() == "total"]

    player_df = df[df["player_id"] == player_id]
    if player_league and player_league != "Total":
        player_df = player_df[player_df["tournament_name"] == player_league]
    elif player_league == "Total":
        player_df = player_df[player_df["tournament_name"].str.lower() == "total"]
    
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
        if filters.get("comparison_season"):
            comp_season_list = [s.strip() for s in filters["comparison_season"].split(",")]
            if "Total" not in comp_season_list and "total" not in [s.lower() for s in comp_season_list]:
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
