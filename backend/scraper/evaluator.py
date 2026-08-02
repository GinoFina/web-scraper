import sqlite3
import json
from pathlib import Path
from collections import defaultdict
from typing import Callable

# Load unified roles config
ROLES_CONFIG_PATH = Path(__file__).parent.parent / "core" / "roles_config.json"
with open(ROLES_CONFIG_PATH, "r", encoding="utf-8") as f:
    ROLES_CONFIG = json.load(f)
from database import repositories as repo
from scraper.config import get_league_multipliers

def _noop_log(level: str, msg: str) -> None:
    pass

def evaluate_all_players(conn: sqlite3.Connection, log: Callable[[str, str], None] = _noop_log) -> int:
    """
    Evaluate player roles based on DAX scoring configuration.
    Calculates both World Score (global pool) and League Score (tournament pool).
    """
    
    LEAGUE_MULTIPLIERS = get_league_multipliers()
    
    # 1. Collect all stats needed
    all_stats = set()
    for role, config in ROLES_CONFIG.items():
        for stat in config["weights"].keys():
            all_stats.add(stat)
            
    # Add minutes_played as we filter by it
    all_stats.add("minutes_played")
    
    # Ensure stats match database column names exactly
    valid_cols_query = "PRAGMA table_info(season_stats)"
    cols = {row[1] for row in conn.execute(valid_cols_query).fetchall()}
    
    # Filter only valid columns to avoid SQL errors
    actual_stats = [s for s in all_stats if s in cols]
    
    # 2. Get global min/max for world_score (Pool: minutes >= 180)
    world_bounds = {}
    if actual_stats:
        agg_exprs = []
        for s in actual_stats:
            agg_exprs.append(f"MIN({s}) as min_{s}")
            agg_exprs.append(f"MAX({s}) as max_{s}")
        
        sql_world = f"SELECT {', '.join(agg_exprs)} FROM season_stats WHERE minutes_played >= 180"
        row = conn.execute(sql_world).fetchone()
        
        if row:
            for s in actual_stats:
                world_bounds[s] = {
                    "min": row[f"min_{s}"] or 0,
                    "max": row[f"max_{s}"] or 0
                }

    # 3. Get league min/max for league_score (Pool: minutes >= 180 by tournament_id)
    league_bounds = defaultdict(dict)
    if actual_stats:
        sql_league = f"SELECT tournament_id, {', '.join(agg_exprs)} FROM season_stats WHERE minutes_played >= 180 GROUP BY tournament_id"
        for row in conn.execute(sql_league).fetchall():
            t_id = row["tournament_id"]
            for s in actual_stats:
                league_bounds[t_id][s] = {
                    "min": row[f"min_{s}"] or 0,
                    "max": row[f"max_{s}"] or 0
                }
                
    # 4. Fetch all eligible player stats (minutes >= 180)
    # We also need their specific_position from players table
    select_cols = ", ".join(f"s.{c}" for c in actual_stats)
    sql_players = f"""
        SELECT s.id as stats_id, s.tournament_id, p.player_id, p.position, p.specific_position, {select_cols}
        FROM season_stats s
        JOIN players p ON p.player_id = s.player_id
        WHERE s.minutes_played >= 180
    """
    players = conn.execute(sql_players).fetchall()
    
    # 5. Pre-calculate weighted multipliers for "Total" rows (tournament_id = 0)
    player_multipliers = {}
    sql_mults = """
        SELECT player_id, tournament_id, minutes_played
        FROM season_stats
        WHERE tournament_id != 0 AND minutes_played > 0
    """
    for r in conn.execute(sql_mults).fetchall():
        pid = r["player_id"]
        tid = r["tournament_id"]
        mins = r["minutes_played"] or 0
        mult = LEAGUE_MULTIPLIERS.get(int(tid), 0.5)
        
        if pid not in player_multipliers:
            player_multipliers[pid] = {"mins": 0, "weighted": 0.0}
            
        player_multipliers[pid]["mins"] += mins
        player_multipliers[pid]["weighted"] += (mult * mins)

    for pid, data in player_multipliers.items():
        if data["mins"] > 0:
            player_multipliers[pid] = data["weighted"] / data["mins"]
        else:
            player_multipliers[pid] = 0.5
    
    log("info", f"Evaluating roles for {len(players)} eligible season records...")
    
    evaluated_count = 0
    with conn:
        # Clear existing evaluations before recalculating all
        conn.execute("DELETE FROM player_evaluations")
        
        for p in players:
            stats_id = p["stats_id"]
            t_id = p["tournament_id"]
            pos = p["specific_position"]
            if not pos:
                pos = p["position"] or ""
            
            best_role = None
            best_role_score = -1.0
            best_league_score = -1.0
            
            # Expand generic positions to specific roles
            expanded_pos = pos.upper()
            pos_parts = expanded_pos.replace(" ", "").split("/")
            if "F" in pos_parts:
                expanded_pos += "/ST/RW/LW"
            if "M" in pos_parts:
                expanded_pos += "/AM/MC/DM/ML/MR"
            if "D" in pos_parts:
                expanded_pos += "/DC/DL/DR"
                
            # Find which roles apply to this player's position
            for role_name, config in ROLES_CONFIG.items():
                valid_positions = config["valid_positions"]
                
                is_valid = False
                for vp in valid_positions:
                    if vp.upper() in expanded_pos:
                        is_valid = True
                        break
                        
                if not is_valid:
                    continue
                    
                # Calculate scores
                world_score = 0.0
                league_score = 0.0
                
                for stat, weight in config["weights"].items():
                    if stat not in actual_stats:
                        continue
                        
                    val = p[stat] or 0.0
                    
                    # World normalization
                    w_min = world_bounds.get(stat, {}).get("min", 0)
                    w_max = world_bounds.get(stat, {}).get("max", 0)
                    if w_max > w_min:
                        world_score += weight * ((val - w_min) / (w_max - w_min))
                        
                    # League normalization
                    l_min = league_bounds.get(t_id, {}).get(stat, {}).get("min", 0)
                    l_max = league_bounds.get(t_id, {}).get(stat, {}).get("max", 0)
                    if l_max > l_min:
                        league_score += weight * ((val - l_min) / (l_max - l_min))
                
                role_score_final = min(100.0, max(0.0, world_score * 100))
                league_score_final = min(100.0, max(0.0, league_score * 100))
                
                if role_score_final > best_role_score:
                    best_role_score = role_score_final
                    best_league_score = league_score_final
                    best_role = role_name
            
            # Save only the best role
            if best_role:
                # Apply multiplier for world score (default to a low multiplier like 0.5 if league is unknown)
                if int(t_id) == 0:
                    multiplier = player_multipliers.get(p["player_id"], 0.5)
                else:
                    multiplier = LEAGUE_MULTIPLIERS.get(int(t_id), 0.5)
                
                final_world_score = best_role_score * multiplier
                
                repo.upsert_evaluation(
                    conn, 
                    stats_id=stats_id,
                    role=best_role,
                    role_score=best_role_score,
                    league_score=best_league_score,
                    world_score=final_world_score
                )
                evaluated_count += 1
                
    return evaluated_count
