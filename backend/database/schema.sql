-- ============================================================================
-- SOFASCORE SCOUTING APP — SQLite Schema (V2)
-- ============================================================================

-- Catalog: Players
CREATE TABLE IF NOT EXISTS players (
    player_id         INTEGER PRIMARY KEY,
    name              TEXT NOT NULL,
    team              TEXT,
    team_id           INTEGER,
    nationality       TEXT,
    country_alpha2    TEXT,
    position          TEXT,
    specific_position TEXT,
    age               INTEGER,
    updated_at        TEXT DEFAULT (datetime('now'))
);

-- Fact Table: Season Statistics
CREATE TABLE IF NOT EXISTS season_stats (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id                   INTEGER NOT NULL,
    tournament_id               INTEGER NOT NULL,
    tournament_name             TEXT,
    season_id                   INTEGER NOT NULL,
    season_name                 TEXT,
    season_year                 TEXT,
    team_id                     INTEGER,
    team_name                   TEXT,
    accumulation                TEXT DEFAULT 'total',

    -- General
    appearances                 INTEGER,
    minutes_played              INTEGER,
    goals                       INTEGER,
    assists                     INTEGER,
    rating                      REAL,
    penalty_goals               INTEGER,

    -- Passing & Creation
    accurate_passes             INTEGER,
    total_passes                INTEGER,
    accurate_passes_pct         REAL,
    key_passes                  INTEGER,
    big_chances_created         INTEGER,
    accurate_long_balls         INTEGER,
    total_long_balls            INTEGER,
    accurate_long_balls_pct     REAL,
    accurate_crosses            INTEGER,
    total_crosses               INTEGER,
    accurate_crosses_pct        REAL,

    -- Shooting
    total_shots                 INTEGER,
    shots_on_target             INTEGER,
    shots_off_target            INTEGER,
    blocked_scoring_attempt     INTEGER,
    big_chances_missed          INTEGER,

    -- Dribbling
    dribbles_won                INTEGER,
    dribbles_attempted          INTEGER,
    dribbles_won_pct            REAL,

    -- Aerial Duels
    aerial_duels_won            INTEGER,
    aerial_duels_total          INTEGER,
    aerial_duels_won_pct        REAL,

    -- Ground Duels
    ground_duels_won            INTEGER,
    ground_duels_total          INTEGER,
    ground_duels_won_pct        REAL,

    -- Defense
    tackles                     INTEGER,
    interceptions               INTEGER,
    clearances                  INTEGER,
    blocked_shots               INTEGER,
    dispossessed                INTEGER,
    offsides                    INTEGER,
    possession_lost             INTEGER,
    total_duels_won             INTEGER,
    total_duels_won_pct         REAL,

    -- Goalkeeper
    saves                       INTEGER,
    clean_sheets                INTEGER,
    saves_inside_box            INTEGER,
    saves_outside_box           INTEGER,
    goals_conceded              INTEGER,
    goals_conceded_inside_box   INTEGER,
    goals_conceded_outside_box  INTEGER,
    penalties_saved             INTEGER,
    punches                     INTEGER,
    high_claims                 INTEGER,
    runs_out                    INTEGER,
    successful_runs_out         INTEGER,

    -- Metadata
    source      TEXT DEFAULT 'league',
    raw_json    TEXT,
    fetched_at  TEXT DEFAULT (datetime('now')),

    UNIQUE(player_id, tournament_id, season_id, accumulation)
);

CREATE INDEX IF NOT EXISTS idx_stats_tournament ON season_stats(tournament_id, season_id);
CREATE INDEX IF NOT EXISTS idx_stats_player     ON season_stats(player_id);

-- Tracked Leagues for auto-update
CREATE TABLE IF NOT EXISTS tracked_leagues (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    url             TEXT NOT NULL UNIQUE,
    tournament_id   INTEGER,
    tournament_name TEXT,
    season_id       INTEGER,
    season_name     TEXT,
    accumulation    TEXT DEFAULT 'total',
    added_at        TEXT DEFAULT (datetime('now')),
    last_updated    TEXT
);

-- Player Evaluations (Role-based scoring)
CREATE TABLE IF NOT EXISTS player_evaluations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    stats_id      INTEGER NOT NULL,
    role          TEXT,
    role_score    REAL,
    league_score  REAL,
    world_score   REAL,
    calculated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(stats_id, role)
);
