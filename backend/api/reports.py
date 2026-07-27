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

    # Fetch height and foot live if they are missing
    if not player.get("height") or not player.get("foot"):
        try:
            from scraper.client import SofascoreClient
            client = SofascoreClient()
            p_res = client.api_get(f"/player/{player_id}")
            raw_p = p_res.get("player", {})
            h = raw_p.get("height")
            f = raw_p.get("preferredFoot")
            if h or f:
                conn.execute("UPDATE players SET height = ?, foot = ? WHERE player_id = ?", (h, f, player_id))
                conn.commit()
                player["height"] = h
                player["foot"] = f
        except Exception:
            pass

    alpha2 = player.get('country_alpha2', '').lower()
    if alpha2 == 'en': alpha2 = 'gb-eng'
    elif alpha2 == 'wa': alpha2 = 'gb-wls'
    elif alpha2 == 'sc': alpha2 = 'gb-sct'
    elif alpha2 == 'ni': alpha2 = 'gb-nir'
    elif alpha2 == 'ks': alpha2 = 'xk' # Kosovo

    # Build image URLs (fetched live, not stored)
    images = {
        "player": f"{IMG_BASE}/player/{player_id}/image",
        "team": f"{IMG_BASE}/team/{player.get('team_id', 0)}/image" if player.get("team_id") else None,
        "flag": f"https://flagcdn.com/w40/{alpha2}.png" if alpha2 else None,
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

@router.get("/heatmap/{player_id}/{tournament_id}/{season_id}")
def live_heatmap(player_id: int, tournament_id: int, season_id: int):
    """Fetch live heatmap data from Sofascore."""
    try:
        from scraper.client import SofascoreClient
        client = SofascoreClient()
        res = client.api_get(f"/player/{player_id}/unique-tournament/{tournament_id}/season/{season_id}/heatmap/overall")
        return res
    except Exception as e:
        return {"error": str(e)}
