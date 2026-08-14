import os
import shutil
from pathlib import Path

# The user's persistence directory
USER_DIR = Path.home() / ".df_scouting_app"
USER_DIR.mkdir(parents=True, exist_ok=True)

# Original bundled paths
_BUNDLED_DIR = Path(__file__).resolve().parent

def get_config_path(filename: str) -> Path:
    """
    Returns the path to the configuration file in the user directory.
    If it doesn't exist there, it copies the bundled default file.
    """
    user_path = USER_DIR / filename
    bundled_path = _BUNDLED_DIR / filename
    
    if not user_path.exists() and bundled_path.exists():
        shutil.copy2(bundled_path, user_path)
        
    return user_path

# Helper constants to get paths
ROLES_CONFIG_PATH = get_config_path("roles_config.json")
MULTIPLIERS_PATH = get_config_path("league_multipliers.json")
