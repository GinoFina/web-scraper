"""
Scraper configuration — constants and mappings extracted from sofascore_collector.py.
"""

API_BASE = "https://api.sofascore.com/api/v1"
IMPERSONATE = "chrome124"

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.sofascore.com",
    "Referer": "https://www.sofascore.com/",
}

# Sofascore image base URLs
IMG_BASE = "https://api.sofascore.app/api/v1"
FLAGS_BASE = "https://www.sofascore.com/static/images/flags"

# tournament_id -> standardized league name
TOURNAMENT_NAMES: dict[int, str] = {
    8: "Spain 1", 17: "England 1", 18: "England 2", 20: "Norway 1",
    22: "Norway 2", 23: "Italy 1", 24: "England 3", 34: "France 1",
    35: "Germany 1", 37: "Netherlands 1", 38: "Belgium 1", 39: "Denmark 1",
    40: "Sweden 1", 41: "Finland 1", 44: "Germany 2", 45: "Austria 1",
    46: "Sweden 2", 47: "Denmark 2", 52: "Turkey 1", 53: "Italy 2",
    54: "Spain 2", 55: "Finland 2", 65: "Denmark 3", 67: "Sweden 3A",
    68: "Sweden 3B", 152: "Romania 1", 154: "Montenegro 1", 155: "Argentina 1",
    170: "Croatia 1", 172: "Czech 1", 178: "Estonia 1", 182: "France 2",
    183: "France 3", 185: "Greece 1", 187: "Hungary 1", 188: "Iceland 1",
    196: "Japan 1", 202: "Poland 1", 203: "Russia 1", 210: "Serbia 1",
    211: "Slovakia 1", 212: "Slovenia 1", 215: "Swiss 1", 218: "Ukraine 1",
    222: "Bosnia 1", 231: "Venezuela 1", 238: "Portugal 1", 240: "Ecuador 1",
    242: "USA 1", 247: "Bulgaria 1", 278: "Uruguay 1", 325: "Brazil 1",
    406: "Peru 1", 410: "Korea 1", 671: "Armenia 1", 675: "Iceland 2",
    678: "Estonia 2", 703: "Argentina 2", 704: "Georgia 1", 720: "Albania 1",
    955: "Saudi 1", 11085: "Norway 3A", 11090: "Norway 3B",
    11536: "Colombia 1C", 11539: "Colombia 1A", 11540: "Paraguay 1A",
    11541: "Paraguay 1C", 11620: "Mexico 1C", 11621: "Mexico 1A",
    11653: "Chile 1", 16736: "Bolivia 1", 17073: "Spain 3",
}

# tournament_id -> league quality multiplier (logarithmic scale based on Opta)
LEAGUE_MULTIPLIERS: dict[int, float] = {
    8: 0.9766, 17: 1.0, 18: 0.9504, 20: 0.9401, 22: 0.8758,
    23: 0.9757, 24: 0.9169, 34: 0.9738, 35: 0.9794, 37: 0.9363,
    38: 0.954, 39: 0.9461, 40: 0.9306, 41: 0.8809, 44: 0.9346,
    45: 0.9229, 46: 0.8636, 47: 0.8532, 52: 0.9379, 53: 0.9223,
    54: 0.9306, 55: 0.7851, 65: 0.7663, 67: 0.7972, 68: 0.7972,
    152: 0.9205, 154: 0.8456, 155: 0.9509, 170: 0.9412, 172: 0.9294,
    178: 0.8155, 182: 0.9223, 183: 0.8867, 185: 0.93, 187: 0.9247,
    188: 0.8675, 196: 0.9351, 202: 0.9429, 203: 0.9306, 210: 0.8909,
    211: 0.901, 212: 0.9056, 215: 0.9311, 218: 0.8997, 222: 0.8936,
    231: 0.899, 238: 0.953, 240: 0.9368, 242: 0.9407, 247: 0.897,
    278: 0.9241, 325: 0.9488, 406: 0.9049, 410: 0.9199, 671: 0.8773,
    675: 0.8003, 678: 0.5, 703: 0.9181, 704: 0.8766, 720: 0.8902,
    955: 0.9199, 11085: 0.8175, 11090: 0.8175, 11536: 0.9317,
    11539: 0.9317, 11540: 0.9271, 11541: 0.9271, 11620: 0.9317,
    11621: 0.9317, 11653: 0.9229, 16736: 0.9075, 17073: 0.8997,
}

# Fields requested from the league statistics endpoint
LEAGUE_STAT_FIELDS = ",".join([
    "appearances", "minutesPlayed", "goals", "assists", "rating",
    "penaltyGoals", "expectedGoals", "expectedAssists",
    "accuratePasses", "inaccuratePasses", "keyPasses",
    "accurateLongBalls", "totalLongBalls",
    "accurateCrosses", "accurateCrossesPercentage",
    "bigChancesCreated",
    "totalShots", "shotsOnTarget", "shotsOffTarget",
    "outfielderBlocks", "blockedShots", "bigChancesMissed",
    "goalConversionPercentage",
    "successfulDribbles", "successfulDribblesPercentage",
    "aerialDuelsWon", "aerialDuelsWonPercentage",
    "groundDuelsWon", "groundDuelsWonPercentage",
    "tackles", "interceptions", "clearances", "blockedShots", "dispossessed",
    "offsides", "possessionLostCtrl",
    "totalDuelsWon", "duelSuccessRate",
    "saves", "cleanSheet",
    "savedShotsFromInsideTheBox", "savedShotsFromOutsideTheBox",
    "goalsConceded", "goalsConcededInsideTheBox", "goalsConcededOutsideTheBox",
    "penaltiesSaved", "punches", "highClaims", "runsOut", "successfulRunsOut",
])
