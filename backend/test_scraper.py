import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scraper.client import SofascoreClient

def test_fetch_player():
    client = SofascoreClient(delay=0.1)

    # Erling Haaland (ID: 839956)
    player_id = 839956
    # Premier League: tournament 17, season 61627 (24/25)
    tournament_id = 17
    season_id = 61627
    
    print(f"Fetching attributes for player {player_id}...")
    try:
        attr_res = client.api_get(f"/player/{player_id}/attribute-overviews")
        attributes = attr_res.get("averageAttributeOverviews") or attr_res.get("attributeOverviews") or attr_res
        print("Attributes fetched correctly:", bool(attributes))
    except Exception as e:
        print("Failed to fetch attributes:", e)

    print(f"Fetching heatmap for player {player_id}, season {season_id}...")
    try:
        hm_res = client.api_get(f"/player/{player_id}/unique-tournament/{tournament_id}/season/{season_id}/heatmap/overall")
        hm_data = hm_res.get("heatmap", []) if isinstance(hm_res, dict) else hm_res
        print("Heatmap fetched correctly, points count:", len(hm_data) if hm_data else 0)
    except Exception as e:
        print("Failed to fetch heatmap:", e)

if __name__ == "__main__":
    test_fetch_player()
