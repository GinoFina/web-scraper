"""
API Router: Reports — player card data and image proxy.
"""

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import io

from database.connection import get_connection
from database import repositories as repo
from scraper.config import IMG_BASE, FLAGS_BASE

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/player-card/{player_id}")
def player_card(player_id: int):
    """Pre-computed data for rendering a player report card."""
    conn = get_connection()
    detail = repo.get_player_detail(conn, player_id)
    if not detail:
        return {"error": "Player not found"}

    player = detail["player"]

    # Build image URLs (fetched live, not stored)
    images = {
        "player": f"{IMG_BASE}/player/{player_id}/image",
        "team": f"{IMG_BASE}/team/{player.get('team_id', 0)}/image" if player.get("team_id") else None,
        "flag": f"{FLAGS_BASE}/{player.get('country_alpha2', '').lower()}.png" if player.get("country_alpha2") else None,
    }

    return {
        **detail,
        "images": images,
    }


@router.get("/proxy/image")
def proxy_image(url: str = Query(..., description="Sofascore image URL to proxy")):
    """
    Proxy for Sofascore images to avoid CORS issues in the frontend.
    Fetches the image on the server side and returns it to the client.
    """
    try:
        from curl_cffi import requests
        from scraper.config import HEADERS, IMPERSONATE

        r = requests.get(url, headers=HEADERS, timeout=10, impersonate=IMPERSONATE)
        r.raise_for_status()

        content_type = r.headers.get("content-type", "image/png")
        return StreamingResponse(
            io.BytesIO(r.content),
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception as e:
        return {"error": str(e)}
