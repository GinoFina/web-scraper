"""
HTTP client for Sofascore API using curl_cffi to bypass Cloudflare.
"""

import re
import time
from curl_cffi import requests
from scraper.config import API_BASE, IMPERSONATE, HEADERS, LEAGUE_STAT_FIELDS, TOURNAMENT_NAMES


class SofascoreClient:
    """Wrapper around curl_cffi with Chrome TLS impersonation."""

    def __init__(self, delay: float = 0.5):
        self.delay = delay
        self._last_request = 0.0

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_request = time.time()

    def api_get(self, path: str, params: dict | None = None) -> dict:
        """GET request to Sofascore API with impersonation."""
        self._rate_limit()
        url = f"{API_BASE}{path}"
        r = requests.get(
            url, headers=HEADERS, params=params or {},
            timeout=15, impersonate=IMPERSONATE,
        )
        r.raise_for_status()
        return r.json()

    # ── Player endpoints ──────────────────────────────────────────────────

    def get_player_info(self, player_id: int) -> dict:
        return self.api_get(f"/player/{player_id}").get("player", {})

    def get_player_stats(self, player_id: int, tournament_id: int, season_id: int) -> dict:
        return self.api_get(
            f"/player/{player_id}/unique-tournament/{tournament_id}"
            f"/season/{season_id}/statistics/overall"
        ).get("statistics", {})

    # ── Tournament endpoints ──────────────────────────────────────────────

    def get_tournament_meta(self, tournament_id: int, season_id: int) -> dict:
        """Get tournament and season names. Uses standardized name if available."""
        std_name = TOURNAMENT_NAMES.get(tournament_id)
        raw_name = f"ID:{tournament_id}"
        
        if not std_name:
            try:
                info = self.api_get(f"/unique-tournament/{tournament_id}")
                raw_name = info.get("uniqueTournament", {}).get("name", raw_name)
            except Exception:
                pass
                
        try:
            data = self.api_get(f"/unique-tournament/{tournament_id}/season/{season_id}")
            if not std_name:
                raw_name = data.get("uniqueTournament", {}).get("name", raw_name)
            season = data.get("season", {})
            return {
                "tournament_name": std_name or raw_name,
                "season_name": season.get("year", f"ID:{season_id}"),
                "season_year": season.get("year", ""),
            }
        except Exception:
            pass
        try:
            data = self.api_get(f"/unique-tournament/{tournament_id}/seasons")
            if not std_name:
                raw_name = data.get("uniqueTournament", {}).get("name", raw_name)
            season = next(
                (s for s in data.get("seasons", []) if s.get("id") == season_id), None
            )
            return {
                "tournament_name": std_name or raw_name,
                "season_name": season.get("year", f"ID:{season_id}") if season else f"ID:{season_id}",
                "season_year": season.get("year", "") if season else "",
            }
        except Exception:
            return {
                "tournament_name": std_name or f"ID:{tournament_id}",
                "season_name": f"ID:{season_id}",
                "season_year": "",
            }

    def get_league_page(
        self, tournament_id: int, season_id: int, offset: int,
        accumulation: str, order: str = "-rating",
    ) -> dict:
        return self.api_get(
            f"/unique-tournament/{tournament_id}/season/{season_id}/statistics",
            {
                "limit": 100, "offset": offset,
                "order": order, "accumulation": accumulation,
                "fields": LEAGUE_STAT_FIELDS,
            },
        )

    # ── URL parsers ───────────────────────────────────────────────────────

    @staticmethod
    def parse_league_url(url: str) -> tuple[int, int] | None:
        m = re.search(r"/tournament/[^/]+/[^/]+/(\d+)(?:/season/(\d+))?", url)
        if not m:
            return None
        tid = int(m.group(1))
        if m.group(2):
            return tid, int(m.group(2))
        frag = re.search(r"[#&,]id[=:](\d+)", url)
        if frag:
            return tid, int(frag.group(1))
        return None
