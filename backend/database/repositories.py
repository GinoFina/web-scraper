"""
Database repository layer — CRUD operations for all tables.
All functions accept a sqlite3.Connection and return dicts/lists.
"""

import json
import sqlite3
from datetime import datetime


# ─── Players ──────────────────────────────────────────────────────────────────

def upsert_player(conn: sqlite3.Connection, player_id: int, info: dict) -> None:
    """Insert or update a player from Sofascore API player data."""
    team = (info.get("team") or {}).get("name", "")
    team_id = (info.get("team") or {}).get("id")
    country = (info.get("country") or {}).get("name", "")
    alpha2 = (info.get("country") or {}).get("alpha2", "")
    dob_ts = info.get("dateOfBirthTimestamp")
    age = (
        (datetime.utcnow() - datetime.utcfromtimestamp(dob_ts)).days // 365
        if dob_ts
        else None
    )
    pos = info.get("position") or ""

    # Extract specific position from positionsDetailed
    pos_detailed = info.get("positionsDetailed") or []
    sp = ""
    if isinstance(pos_detailed, list) and pos_detailed:
        sp = "/".join(str(p).upper() for p in pos_detailed if p)

    conn.execute(
        """
        INSERT INTO players (player_id, name, team, team_id, nationality, country_alpha2,
                             position, specific_position, age, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(player_id) DO UPDATE SET
            name              = excluded.name,
            team              = excluded.team,
            team_id           = COALESCE(excluded.team_id, team_id),
            nationality       = COALESCE(NULLIF(excluded.nationality,''), nationality),
            country_alpha2    = COALESCE(NULLIF(excluded.country_alpha2,''), country_alpha2),
            position          = COALESCE(NULLIF(excluded.position,''), position),
            specific_position = COALESCE(NULLIF(excluded.specific_position,''), specific_position),
            age               = COALESCE(excluded.age, age),
            updated_at        = excluded.updated_at
        """,
        (player_id, info.get("name", ""), team, team_id, country, alpha2, pos, sp, age),
    )


def get_players_paginated(
    conn: sqlite3.Connection,
    *,
    page: int = 1,
    page_size: int = 50,
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
) -> dict:
    """Return paginated players with their stats, applying all filters."""
    conditions = []
    params: list = []

    if name:
        conditions.append("p.name LIKE ?")
        params.append(f"%{name}%")
    if position:
        conditions.append("p.position = ?")
        params.append(position)
    if specific_position:
        conditions.append("p.specific_position LIKE ?")
        params.append(f"%{specific_position}%")
    if nationality:
        conditions.append("p.nationality = ?")
        params.append(nationality)
    if team:
        conditions.append("p.team = ?")
        params.append(team)
    if league:
        conditions.append("s.tournament_name = ?")
        params.append(league)
    if season:
        conditions.append("s.season_name = ?")
        params.append(season)
    if age_min is not None:
        conditions.append("p.age >= ?")
        params.append(age_min)
    if age_max is not None:
        conditions.append("p.age <= ?")
        params.append(age_max)
    if minutes_min is not None:
        conditions.append("s.minutes_played >= ?")
        params.append(minutes_min)
    if minutes_max is not None:
        conditions.append("s.minutes_played <= ?")
        params.append(minutes_max)

    where = " AND ".join(conditions) if conditions else "1=1"

    # Validate sort column to prevent injection
    allowed_sorts = {
        "name", "age", "team", "nationality", "position", "specific_position",
        "minutes_played", "goals", "assists", "rating", "appearances",
        "tournament_name", "season_name",
        "role_score", "league_score", "world_score",
    }
    if sort_by not in allowed_sorts:
        sort_by = "name"
    sort_direction = "DESC" if sort_dir.lower() == "desc" else "ASC"

    # Prefix sort column
    if sort_by in ("name", "age", "team", "nationality", "position", "specific_position"):
        order_col = f"p.{sort_by}"
    elif sort_by in ("role_score", "league_score", "world_score"):
        order_col = f"e.{sort_by}"
    else:
        order_col = f"s.{sort_by}"

    # Count
    count_sql = f"""
        SELECT COUNT(DISTINCT p.player_id)
        FROM players p
        LEFT JOIN season_stats s ON s.player_id = p.player_id
        LEFT JOIN player_evaluations e ON e.stats_id = s.id
        WHERE {where}
    """
    total = conn.execute(count_sql, params).fetchone()[0]

    # Data
    offset = (page - 1) * page_size
    data_sql = f"""
        SELECT
            p.player_id, p.name, p.age, COALESCE(s.team_name, p.team) as team, s.team_id as team_id, p.nationality,
            p.country_alpha2, p.position, p.specific_position,
            s.minutes_played, s.goals, s.assists, s.rating, s.appearances,
            s.tournament_name, s.season_name,
            s.key_passes, s.big_chances_created, s.accurate_passes_pct,
            s.dribbles_won, s.dribbles_won_pct,
            s.tackles, s.interceptions, s.aerial_duels_won_pct,
            e.role, e.role_score, e.league_score, e.world_score
        FROM players p
        LEFT JOIN season_stats s ON s.player_id = p.player_id
        LEFT JOIN player_evaluations e ON e.stats_id = s.id
        WHERE {where}
        ORDER BY {order_col} {sort_direction} NULLS LAST
        LIMIT ? OFFSET ?
    """
    rows = conn.execute(data_sql, params + [page_size, offset]).fetchall()
    players = [dict(r) for r in rows]

    return {
        "data": players,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


def get_player_detail(conn: sqlite3.Connection, player_id: int) -> dict | None:
    """Get a single player with all their season stats."""
    player = conn.execute(
        "SELECT * FROM players WHERE player_id = ?", (player_id,)
    ).fetchone()
    if not player:
        return None

    stats = conn.execute(
        """SELECT s.*, e.role, e.role_score, e.league_score, e.world_score
           FROM season_stats s
           LEFT JOIN player_evaluations e ON e.stats_id = s.id
           WHERE s.player_id = ?
           ORDER BY s.fetched_at DESC""",
        (player_id,),
    ).fetchall()

    return {
        "player": dict(player),
        "stats": [dict(s) for s in stats],
    }


# ─── Season Stats ─────────────────────────────────────────────────────────────

def upsert_stats(
    conn: sqlite3.Connection,
    player_id: int,
    tournament_id: int,
    meta: dict,
    mapped: dict,
    source: str = "league",
    accumulation: str = "total",
    raw_json: str | None = None,
) -> None:
    """Insert or update season stats from mapped stat dict."""
    m = mapped
    conn.execute(
        """
        INSERT INTO season_stats (
            player_id, tournament_id, tournament_name, season_id, season_name, season_year,
            team_id, team_name, accumulation,
            appearances, minutes_played, goals, assists, rating, penalty_goals,
            accurate_passes, total_passes, accurate_passes_pct,
            key_passes, big_chances_created,
            accurate_long_balls, total_long_balls, accurate_long_balls_pct,
            accurate_crosses, total_crosses, accurate_crosses_pct,
            total_shots, shots_on_target, shots_off_target, blocked_scoring_attempt, big_chances_missed,
            dribbles_won, dribbles_attempted, dribbles_won_pct,
            aerial_duels_won, aerial_duels_total, aerial_duels_won_pct,
            ground_duels_won, ground_duels_total, ground_duels_won_pct,
            tackles, interceptions, clearances, blocked_shots, dispossessed,
            offsides, possession_lost, total_duels_won, total_duels_won_pct,
            saves, clean_sheets, saves_inside_box, saves_outside_box,
            goals_conceded, goals_conceded_inside_box, goals_conceded_outside_box,
            penalties_saved, punches, high_claims, runs_out, successful_runs_out,
            source, raw_json
        ) VALUES (
            ?,?,?,?,?,?,?,?,?,
            ?,?,?,?,?,?,
            ?,?,?,?,?,
            ?,?,?,?,?,?,
            ?,?,?,?,?,
            ?,?,?,
            ?,?,?,?,?,?,
            ?,?,?,?,?,
            ?,?,?,?,
            ?,?,?,?,?,?,?,?,?,?,?,?,
            ?,?
        )
        ON CONFLICT(player_id, tournament_id, season_id, accumulation) DO UPDATE SET
            tournament_name             = COALESCE(NULLIF(excluded.tournament_name,''), tournament_name),
            season_name                 = COALESCE(NULLIF(excluded.season_name,''), season_name),
            season_year                 = COALESCE(NULLIF(excluded.season_year,''), season_year),
            team_id                     = COALESCE(excluded.team_id, team_id),
            team_name                   = COALESCE(NULLIF(excluded.team_name,''), team_name),
            appearances                 = COALESCE(excluded.appearances, appearances),
            minutes_played              = COALESCE(excluded.minutes_played, minutes_played),
            goals                       = COALESCE(excluded.goals, goals),
            assists                     = COALESCE(excluded.assists, assists),
            rating                      = COALESCE(excluded.rating, rating),
            penalty_goals               = COALESCE(excluded.penalty_goals, penalty_goals),
            accurate_passes             = COALESCE(excluded.accurate_passes, accurate_passes),
            total_passes                = COALESCE(excluded.total_passes, total_passes),
            accurate_passes_pct         = COALESCE(excluded.accurate_passes_pct, accurate_passes_pct),
            key_passes                  = COALESCE(excluded.key_passes, key_passes),
            big_chances_created         = COALESCE(excluded.big_chances_created, big_chances_created),
            accurate_long_balls         = COALESCE(excluded.accurate_long_balls, accurate_long_balls),
            total_long_balls            = COALESCE(excluded.total_long_balls, total_long_balls),
            accurate_long_balls_pct     = COALESCE(excluded.accurate_long_balls_pct, accurate_long_balls_pct),
            accurate_crosses            = COALESCE(excluded.accurate_crosses, accurate_crosses),
            total_crosses               = COALESCE(excluded.total_crosses, total_crosses),
            accurate_crosses_pct        = COALESCE(excluded.accurate_crosses_pct, accurate_crosses_pct),
            total_shots                 = COALESCE(excluded.total_shots, total_shots),
            shots_on_target             = COALESCE(excluded.shots_on_target, shots_on_target),
            shots_off_target            = COALESCE(excluded.shots_off_target, shots_off_target),
            blocked_scoring_attempt     = COALESCE(excluded.blocked_scoring_attempt, blocked_scoring_attempt),
            big_chances_missed          = COALESCE(excluded.big_chances_missed, big_chances_missed),
            dribbles_won                = COALESCE(excluded.dribbles_won, dribbles_won),
            dribbles_attempted          = COALESCE(excluded.dribbles_attempted, dribbles_attempted),
            dribbles_won_pct            = COALESCE(excluded.dribbles_won_pct, dribbles_won_pct),
            aerial_duels_won            = COALESCE(excluded.aerial_duels_won, aerial_duels_won),
            aerial_duels_total          = COALESCE(excluded.aerial_duels_total, aerial_duels_total),
            aerial_duels_won_pct        = COALESCE(excluded.aerial_duels_won_pct, aerial_duels_won_pct),
            ground_duels_won            = COALESCE(excluded.ground_duels_won, ground_duels_won),
            ground_duels_total          = COALESCE(excluded.ground_duels_total, ground_duels_total),
            ground_duels_won_pct        = COALESCE(excluded.ground_duels_won_pct, ground_duels_won_pct),
            tackles                     = COALESCE(excluded.tackles, tackles),
            interceptions               = COALESCE(excluded.interceptions, interceptions),
            clearances                  = COALESCE(excluded.clearances, clearances),
            blocked_shots               = COALESCE(excluded.blocked_shots, blocked_shots),
            dispossessed                = COALESCE(excluded.dispossessed, dispossessed),
            offsides                    = COALESCE(excluded.offsides, offsides),
            possession_lost             = COALESCE(excluded.possession_lost, possession_lost),
            total_duels_won             = COALESCE(excluded.total_duels_won, total_duels_won),
            total_duels_won_pct         = COALESCE(excluded.total_duels_won_pct, total_duels_won_pct),
            saves                       = COALESCE(excluded.saves, saves),
            clean_sheets                = COALESCE(excluded.clean_sheets, clean_sheets),
            saves_inside_box            = COALESCE(excluded.saves_inside_box, saves_inside_box),
            saves_outside_box           = COALESCE(excluded.saves_outside_box, saves_outside_box),
            goals_conceded              = COALESCE(excluded.goals_conceded, goals_conceded),
            goals_conceded_inside_box   = COALESCE(excluded.goals_conceded_inside_box, goals_conceded_inside_box),
            goals_conceded_outside_box  = COALESCE(excluded.goals_conceded_outside_box, goals_conceded_outside_box),
            penalties_saved             = COALESCE(excluded.penalties_saved, penalties_saved),
            punches                     = COALESCE(excluded.punches, punches),
            high_claims                 = COALESCE(excluded.high_claims, high_claims),
            runs_out                    = COALESCE(excluded.runs_out, runs_out),
            successful_runs_out         = COALESCE(excluded.successful_runs_out, successful_runs_out),
            source                      = excluded.source,
            raw_json                    = excluded.raw_json,
            fetched_at                  = datetime('now')
        """,
        (
            player_id, tournament_id, meta.get("tournament_name", ""),
            meta["season_id"], meta.get("season_name", ""), meta.get("season_year", ""),
            meta.get("team_id"), meta.get("team_name", ""),
            accumulation,
            m.get("appearances"), m.get("minutes_played"), m.get("goals"), m.get("assists"),
            m.get("rating"), m.get("penalty_goals"),
            m.get("accurate_passes"), m.get("total_passes"), m.get("accurate_passes_pct"),
            m.get("key_passes"), m.get("big_chances_created"),
            m.get("accurate_long_balls"), m.get("total_long_balls"), m.get("accurate_long_balls_pct"),
            m.get("accurate_crosses"), m.get("total_crosses"), m.get("accurate_crosses_pct"),
            m.get("total_shots"), m.get("shots_on_target"), m.get("shots_off_target"),
            m.get("blocked_scoring_attempt"), m.get("big_chances_missed"),
            m.get("dribbles_won"), m.get("dribbles_attempted"), m.get("dribbles_won_pct"),
            m.get("aerial_duels_won"), m.get("aerial_duels_total"), m.get("aerial_duels_won_pct"),
            m.get("ground_duels_won"), m.get("ground_duels_total"), m.get("ground_duels_won_pct"),
            m.get("tackles"), m.get("interceptions"), m.get("clearances"),
            m.get("blocked_shots"), m.get("dispossessed"),
            m.get("offsides"), m.get("possession_lost"),
            m.get("total_duels_won"), m.get("total_duels_won_pct"),
            m.get("saves"), m.get("clean_sheets"), m.get("saves_inside_box"), m.get("saves_outside_box"),
            m.get("goals_conceded"), m.get("goals_conceded_inside_box"), m.get("goals_conceded_outside_box"),
            m.get("penalties_saved"), m.get("punches"), m.get("high_claims"),
            m.get("runs_out"), m.get("successful_runs_out"),
            source, raw_json,
        ),
    )


def get_all_stats_as_dicts(conn: sqlite3.Connection, accumulation: str = "total") -> list[dict]:
    """Fetch all stats joined with players for Pandas processing."""
    rows = conn.execute(
        """
        SELECT s.*, p.name, COALESCE(s.team_name, p.team) as team, p.team_id, p.nationality, p.country_alpha2,
               p.position, p.specific_position, p.age
        FROM season_stats s
        JOIN players p ON p.player_id = s.player_id
        WHERE s.accumulation = ?
        ORDER BY p.name
        """,
        (accumulation,),
    ).fetchall()
    return [dict(r) for r in rows]


# ─── Tracked Leagues ──────────────────────────────────────────────────────────

def upsert_tracked_league(
    conn: sqlite3.Connection,
    url: str,
    tournament_id: int,
    tournament_name: str,
    season_id: int,
    season_name: str,
    accumulation: str = "total",
) -> None:
    conn.execute(
        """
        INSERT INTO tracked_leagues (url, tournament_id, tournament_name, season_id, season_name, accumulation)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
            tournament_name = excluded.tournament_name,
            season_name     = excluded.season_name,
            last_updated    = datetime('now')
        """,
        (url, tournament_id, tournament_name, season_id, season_name, accumulation),
    )


def get_tracked_leagues(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM tracked_leagues ORDER BY tournament_name"
    ).fetchall()
    return [dict(r) for r in rows]


def delete_tracked_league(conn: sqlite3.Connection, league_id: int) -> bool:
    cur = conn.execute("DELETE FROM tracked_leagues WHERE id = ?", (league_id,))
    conn.commit()
    return cur.rowcount > 0


# ─── Evaluations ──────────────────────────────────────────────────────────────

def upsert_evaluation(
    conn: sqlite3.Connection,
    stats_id: int,
    role: str,
    role_score: float,
    league_score: float,
    world_score: float,
) -> None:
    conn.execute(
        """
        INSERT INTO player_evaluations (stats_id, role, role_score, league_score, world_score)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(stats_id, role) DO UPDATE SET
            role_score    = excluded.role_score,
            league_score  = excluded.league_score,
            world_score   = excluded.world_score,
            calculated_at = datetime('now')
        """,
        (stats_id, role, role_score, league_score, world_score),
    )


# ─── Filters (distinct values) ───────────────────────────────────────────────

def get_distinct_values(conn: sqlite3.Connection, table: str, column: str) -> list[str]:
    """Get distinct non-null values for filter dropdowns."""
    allowed = {
        ("players", "position"),
        ("players", "specific_position"),
        ("players", "nationality"),
        ("players", "team"),
        ("season_stats", "tournament_name"),
        ("season_stats", "season_name"),
    }
    if (table, column) not in allowed:
        return []
    rows = conn.execute(
        f"SELECT DISTINCT {column} FROM {table} WHERE {column} IS NOT NULL AND {column} != '' ORDER BY {column}"
    ).fetchall()
    return [r[0] for r in rows]


# ─── Recalculate derived fields ───────────────────────────────────────────────

def recalculate_derived(conn: sqlite3.Connection) -> int:
    """Recalculate totals and percentages from existing data. Returns rows updated."""
    updates = [
        """UPDATE season_stats SET total_shots =
            COALESCE(shots_on_target,0) + COALESCE(shots_off_target,0) + COALESCE(blocked_scoring_attempt,0)
            WHERE total_shots IS NULL
              AND (shots_on_target IS NOT NULL OR shots_off_target IS NOT NULL OR blocked_scoring_attempt IS NOT NULL)""",
        """UPDATE season_stats SET accurate_passes_pct =
            ROUND(CAST(accurate_passes AS REAL) / NULLIF(total_passes,0) * 100, 1)
            WHERE accurate_passes_pct IS NULL AND accurate_passes IS NOT NULL AND total_passes IS NOT NULL""",
        """UPDATE season_stats SET accurate_long_balls_pct =
            ROUND(CAST(accurate_long_balls AS REAL) / NULLIF(total_long_balls,0) * 100, 1)
            WHERE accurate_long_balls_pct IS NULL AND accurate_long_balls IS NOT NULL AND total_long_balls IS NOT NULL""",
        """UPDATE season_stats SET accurate_crosses_pct =
            ROUND(CAST(accurate_crosses AS REAL) / NULLIF(total_crosses,0) * 100, 1)
            WHERE accurate_crosses_pct IS NULL AND accurate_crosses IS NOT NULL AND total_crosses IS NOT NULL""",
        """UPDATE season_stats SET total_duels_won_pct =
            ROUND(CAST(total_duels_won AS REAL) / NULLIF(
                (COALESCE(aerial_duels_total,0) + COALESCE(ground_duels_total,0)), 0) * 100, 1)
            WHERE total_duels_won_pct IS NULL
              AND total_duels_won IS NOT NULL
              AND (aerial_duels_total IS NOT NULL OR ground_duels_total IS NOT NULL)""",
        """UPDATE season_stats SET dribbles_won_pct =
            ROUND(CAST(dribbles_won AS REAL) / NULLIF(dribbles_attempted,0) * 100, 1)
            WHERE dribbles_won_pct IS NULL AND dribbles_won IS NOT NULL AND dribbles_attempted IS NOT NULL""",
        """UPDATE season_stats SET aerial_duels_won_pct =
            ROUND(CAST(aerial_duels_won AS REAL) / NULLIF(aerial_duels_total,0) * 100, 1)
            WHERE aerial_duels_won_pct IS NULL
              AND aerial_duels_won IS NOT NULL AND aerial_duels_total IS NOT NULL
              AND aerial_duels_total > aerial_duels_won""",
        """UPDATE season_stats SET ground_duels_won_pct =
            ROUND(CAST(ground_duels_won AS REAL) / NULLIF(ground_duels_total,0) * 100, 1)
            WHERE ground_duels_won_pct IS NULL
              AND ground_duels_won IS NOT NULL AND ground_duels_total IS NOT NULL
              AND ground_duels_total > ground_duels_won""",
    ]

    total = 0
    for sql in updates:
        cur = conn.execute(sql)
        total += cur.rowcount
    conn.commit()
    return total
