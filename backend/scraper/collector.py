"""
Collector — migrated scraping logic from sofascore_collector.py.
Runs league download → enrich → recalculate as a single pipeline.
Emits log events via a callback for WebSocket streaming.
"""

import json
import time
import sqlite3
from typing import Callable

from scraper.client import SofascoreClient
from scraper.config import TOURNAMENT_NAMES
from database.connection import get_connection
from database import repositories as repo


# Type for the log callback: receives (level, message)
LogCallback = Callable[[str, str], None]


def _noop_log(level: str, msg: str) -> None:
    pass


# ─── Stat mapping (API response → DB columns) ────────────────────────────────

def _g(d: dict, *keys):
    """Return the first non-None value for the given keys."""
    for k in keys:
        v = d.get(k)
        if v is not None:
            return v
    return None


def _safe_pct(num, den) -> float | None:
    if num is not None and den and den > 0:
        return round(num / den * 100, 1)
    return None


def map_stats(raw: dict) -> dict:
    """Convert Sofascore API response fields to DB column names."""
    s = raw

    # Passes
    acc_p = _g(s, "accuratePasses")
    inacc_p = _g(s, "inaccuratePasses")
    total_p = (acc_p or 0) + (inacc_p or 0) or None

    acc_lb = _g(s, "accurateLongBalls")
    tot_lb = _g(s, "totalLongBalls")

    acc_cr = _g(s, "accurateCrosses")
    cr_pct = _g(s, "accurateCrossesPercentage")
    tot_cr = _g(s, "totalCrosses")
    if tot_cr is None and acc_cr is not None and cr_pct and 0 < cr_pct < 100:
        tot_cr = round(acc_cr / (cr_pct / 100))
    elif tot_cr is None and acc_cr is not None and cr_pct == 100:
        tot_cr = acc_cr

    # Shots
    shots_on = _g(s, "shotsOnTarget")
    shots_off = _g(s, "shotsOffTarget")
    shots_blk = _g(s, "outfielderBlocks", "blockedScoringAttempt")
    tot_shots = _g(s, "totalShots", "totalScoringAttempts")
    if tot_shots is None and any(x is not None for x in [shots_on, shots_off, shots_blk]):
        tot_shots = (shots_on or 0) + (shots_off or 0) + (shots_blk or 0) or None

    # Dribbles
    drib_won = _g(s, "successfulDribbles")
    drib_pct_raw = _g(s, "successfulDribblesPercentage")
    if drib_won is not None and drib_pct_raw and 0 < drib_pct_raw < 100:
        drib_att = round(drib_won / (drib_pct_raw / 100))
    elif drib_won is not None and drib_pct_raw == 100:
        drib_att = drib_won
    else:
        drib_att = None
    drib_pct = drib_pct_raw

    # Aerial duels
    aer_won = _g(s, "aerialDuelsWon")
    aer_pct_raw = _g(s, "aerialDuelsWonPercentage")
    if aer_won is not None and aer_pct_raw and 0 < aer_pct_raw < 100:
        aer_tot = round(aer_won / (aer_pct_raw / 100))
    elif aer_won is not None and aer_pct_raw == 100:
        aer_tot = aer_won
    else:
        aer_tot = None
    aer_pct = aer_pct_raw

    # Ground duels
    grd_won = _g(s, "groundDuelsWon")
    grd_pct_raw = _g(s, "groundDuelsWonPercentage")
    if grd_won is not None and grd_pct_raw and 0 < grd_pct_raw < 100:
        grd_tot = round(grd_won / (grd_pct_raw / 100))
    elif grd_won is not None and grd_pct_raw == 100:
        grd_tot = grd_won
    else:
        grd_tot = None
    grd_pct = grd_pct_raw

    return {
        "appearances": _g(s, "appearances"),
        "minutes_played": _g(s, "minutesPlayed"),
        "goals": _g(s, "goals"),
        "assists": _g(s, "assists"),
        "expected_goals": _g(s, "expectedGoals"),
        "expected_assists": _g(s, "expectedAssists"),
        "rating": _g(s, "rating"),
        "penalty_goals": _g(s, "penaltyGoals"),
        "accurate_passes": acc_p,
        "total_passes": total_p,
        "accurate_passes_pct": _safe_pct(acc_p, total_p),
        "key_passes": _g(s, "keyPasses"),
        "big_chances_created": _g(s, "bigChancesCreated"),
        "accurate_long_balls": acc_lb,
        "total_long_balls": tot_lb,
        "accurate_long_balls_pct": _safe_pct(acc_lb, tot_lb),
        "accurate_crosses": acc_cr,
        "total_crosses": tot_cr,
        "accurate_crosses_pct": cr_pct if cr_pct is not None else _safe_pct(acc_cr, tot_cr),
        "total_shots": tot_shots,
        "shots_on_target": shots_on,
        "shots_off_target": shots_off,
        "blocked_scoring_attempt": shots_blk,
        "big_chances_missed": _g(s, "bigChancesMissed"),
        "dribbles_won": drib_won,
        "dribbles_attempted": drib_att,
        "dribbles_won_pct": drib_pct,
        "aerial_duels_won": aer_won,
        "aerial_duels_total": aer_tot,
        "aerial_duels_won_pct": aer_pct,
        "ground_duels_won": grd_won,
        "ground_duels_total": grd_tot,
        "ground_duels_won_pct": grd_pct,
        "tackles": _g(s, "tackles"),
        "interceptions": _g(s, "interceptions"),
        "clearances": _g(s, "clearances"),
        "blocked_shots": _g(s, "blockedShots"),
        "dispossessed": _g(s, "dispossessed"),
        "offsides": _g(s, "offsides"),
        "possession_lost": _g(s, "possessionLostCtrl"),
        "total_duels_won": _g(s, "totalDuelsWon"),
        "total_duels_won_pct": _g(s, "duelSuccessRate"),
        "saves": _g(s, "saves") if _g(s, "saves") is not None else (
            (_g(s, "savedShotsFromInsideTheBox") or 0) +
            (_g(s, "savedShotsFromOutsideTheBox") or 0)
            if (_g(s, "savedShotsFromInsideTheBox") is not None
                or _g(s, "savedShotsFromOutsideTheBox") is not None)
            else None
        ),
        "clean_sheets": _g(s, "cleanSheet", "cleanSheets"),
        "saves_inside_box": _g(s, "savedShotsFromInsideTheBox"),
        "saves_outside_box": _g(s, "savedShotsFromOutsideTheBox"),
        "goals_conceded": _g(s, "goalsConceded"),
        "goals_conceded_inside_box": _g(s, "goalsConcededInsideTheBox"),
        "goals_conceded_outside_box": _g(s, "goalsConcededOutsideTheBox"),
        "penalties_saved": _g(s, "penaltiesSaved"),
        "punches": _g(s, "punches"),
        "high_claims": _g(s, "highClaims"),
        "runs_out": _g(s, "runsOut"),
        "successful_runs_out": _g(s, "successfulRunsOut"),
    }


# ─── Pipeline: league → enrich → recalculate ─────────────────────────────────

def run_league_pipeline(
    url: str,
    accumulation: str = "total",
    delay: float = 0.5,
    log: LogCallback = _noop_log,
) -> dict:
    """
    Full pipeline: download league stats → enrich players → recalculate derived fields.
    Returns summary dict.
    """
    client = SofascoreClient(delay=delay)
    conn = get_connection()

    # ── Step 1: Parse URL ─────────────────────────────────────────────────
    parsed = client.parse_league_url(url)
    if not parsed:
        log("error", f"Invalid league URL: {url}")
        return {"error": "Invalid league URL"}

    tournament_id, season_id = parsed
    log("info", f"Tournament ID {tournament_id} | Season ID {season_id} | Accumulation: {accumulation}")

    # ── Step 2: Get tournament metadata ───────────────────────────────────
    meta = client.get_tournament_meta(tournament_id, season_id)
    meta["season_id"] = season_id
    log("info", f"League: {meta['tournament_name']} — {meta['season_name']}")

    # ── Step 3: Download all pages ────────────────────────────────────────
    offset = 0
    total_saved = 0

    while True:
        try:
            page = client.get_league_page(tournament_id, season_id, offset, accumulation)
        except Exception as e:
            log("error", f"Error at page offset={offset}: {e}")
            break

        results = page.get("results", [])
        if not results:
            break

        total_pages = page.get("pages", 1)
        current_page = page.get("page", offset // 100 + 1)
        log("progress", f"Page {current_page}/{total_pages} — {offset + len(results)} players")

        for entry in results:
            player_raw = entry.get("player", {})
            team_raw = entry.get("team", {})
            if "team" in player_raw:
                del player_raw["team"]

            player_id = player_raw.get("id")
            if not player_id:
                continue

            stats_raw = {k: v for k, v in entry.items() if k not in ("player", "team")}
            mapped = map_stats(stats_raw)

            player_meta = meta.copy()
            if team_raw:
                player_meta["team_id"] = team_raw.get("id")
                player_meta["team_name"] = team_raw.get("name")

            with conn:
                repo.upsert_player(conn, player_id, player_raw)
                repo.upsert_stats(
                    conn, player_id, tournament_id, player_meta, mapped,
                    source="league", accumulation=accumulation,
                    raw_json=json.dumps(stats_raw, ensure_ascii=False),
                    heatmap=None,
                )
            total_saved += 1

        if current_page >= total_pages:
            break
        offset += 100

    log("success", f"Downloaded {total_saved} players")

    # ── Step 4: Track the league ──────────────────────────────────────────
    if total_saved > 0:
        with conn:
            repo.upsert_tracked_league(
                conn, url, tournament_id, meta["tournament_name"],
                season_id, meta["season_name"], accumulation,
            )
        conn.commit()

    # ── Step 5: Enrich (specific position, nationality, age) ──────────────
    log("info", "Starting enrichment phase...")
    enrich_count = _enrich_players(conn, client, accumulation, log)
    log("success", f"Enriched {enrich_count} players")

    # ── Step 6: Generate Total Stats ──────────────────────────────────────
    log("info", "Generating total consolidated stats...")
    repo.generate_total_stats(conn)
    log("success", "Generated Total stats")

    # ── Step 7: Recalculate derived fields ────────────────────────────────
    log("info", "Recalculating derived fields...")
    recalc_count = repo.recalculate_derived(conn)
    log("success", f"Recalculated {recalc_count} values")

    # ── Step 8: DAX Evaluations ───────────────────────────────────────────
    from scraper.evaluator import evaluate_all_players
    log("info", "Calculating player role evaluations...")
    eval_count = evaluate_all_players(conn, log)
    log("success", f"Saved {eval_count} role evaluations")

    log("success", f"Pipeline complete: {total_saved} downloaded, {enrich_count} enriched, {recalc_count} recalculated, {eval_count} evaluated")
    return {
        "downloaded": total_saved,
        "enriched": enrich_count,
        "recalculated": recalc_count,
        "evaluated": eval_count,
        "league": meta["tournament_name"],
    }


def _enrich_players(
    conn: sqlite3.Connection,
    client: SofascoreClient,
    accumulation: str,
    log: LogCallback,
) -> int:
    """Enrich players missing specific_position, nationality, or age."""
    rows = conn.execute("""
        SELECT DISTINCT p.player_id, p.name, s.tournament_id, s.season_id
        FROM players p JOIN season_stats s ON s.player_id = p.player_id
        WHERE p.nationality IS NULL OR p.nationality = ''
           OR p.specific_position IS NULL OR p.specific_position = ''
        ORDER BY p.name
    """).fetchall()

    if not rows:
        return 0

    log("info", f"Enriching {len(rows)} player(s)...")
    ok = 0

    for player_id, name, tournament_id, season_id in rows:
        try:
            info = client.get_player_info(player_id)

            # Fallback to prevent infinite enrichment loops if API genuinely lacks data
            if not info.get("positionsDetailed"):
                pos = info.get("position", "")
                info["positionsDetailed"] = [pos] if pos else ["UNKNOWN"]
            if not info.get("country") or not info["country"].get("name"):
                info["country"] = {"name": "Unknown", "alpha2": "??"}

            try:
                ind_stats = client.get_player_stats(player_id, tournament_id, season_id)
            except Exception:
                ind_stats = {}

            row = conn.execute(
                "SELECT tournament_name, season_name, season_year, team_id, team_name FROM season_stats "
                "WHERE player_id=? AND tournament_id=? AND season_id=? LIMIT 1",
                (player_id, tournament_id, season_id),
            ).fetchone()
            meta = {
                "season_id": season_id,
                "tournament_name": row[0] if row else "",
                "season_name": row[1] if row else "",
                "season_year": row[2] if row else "",
                "team_id": row[3] if row else None,
                "team_name": row[4] if row else "",
            }

            with conn:
                repo.upsert_player(conn, player_id, info)
                if ind_stats:
                    mapped = map_stats(ind_stats)
                    repo.upsert_stats(
                        conn, player_id, tournament_id, meta, mapped,
                        source="enriched", accumulation=accumulation,
                    )

            nat = (info.get("country") or {}).get("name", "?")
            log("progress", f"  OK  {name} — {nat}")
            ok += 1

        except Exception as e:
            log("warning", f"  ERR {name}: {e}")

    return ok


def run_update_all(
    delay: float = 0.5,
    log: LogCallback = _noop_log,
) -> dict:
    """Update all tracked leagues, then enrich and recalculate."""
    conn = get_connection()
    leagues = repo.get_tracked_leagues(conn)
    active_leagues = [l for l in leagues if l.get("is_active", 1) != 0]

    if not active_leagues:
        log("warning", "No active tracked leagues found. Enable tracking or use 'Add League' first.")
        return {"error": "No active tracked leagues"}

    log("info", f"Updating {len(active_leagues)} active league(s)... (Skipped {len(leagues) - len(active_leagues)} inactive)")
    results = []

    for league in active_leagues:
        log("info", f"── {league['tournament_name']} ──")
        result = run_league_pipeline(
            url=league["url"],
            accumulation=league.get("accumulation", "total"),
            delay=delay,
            log=log,
        )
        results.append(result)

    log("success", f"All {len(leagues)} leagues updated")
    return {"leagues_updated": len(results), "results": results}
