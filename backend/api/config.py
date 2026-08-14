import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Any
import logging

from database.connection import get_connection
from scraper.evaluator import evaluate_all_players
from scraper.config import TOURNAMENT_NAMES, get_league_multipliers

router = APIRouter(prefix="/api/config", tags=["config"])
logger = logging.getLogger(__name__)

from core.paths import ROLES_CONFIG_PATH, MULTIPLIERS_PATH


class RoleConfig(BaseModel):
    valid_positions: List[str]
    weights: Dict[str, float]


@router.get("/roles")
def get_roles_config():
    """Get the current DAX roles scoring configuration."""
    try:
        with open(ROLES_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/roles")
def update_roles_config(new_config: Dict[str, RoleConfig]):
    """Update the DAX roles scoring configuration."""
    try:
        # Convert pydantic models to dict
        config_dict = {role: data.dict() for role, data in new_config.items()}
        with open(ROLES_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=2)
        return {"message": "Configuration updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/multipliers")
def get_multipliers():
    """Get the current league multipliers and their names."""
    try:
        multipliers = get_league_multipliers()
        result = []
        # Return list of { id, name, multiplier }
        for t_id, name in TOURNAMENT_NAMES.items():
            result.append({
                "id": t_id,
                "name": name,
                "multiplier": multipliers.get(t_id, 0.5)
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/multipliers")
def update_multipliers(new_multipliers: Dict[str, float]):
    """Update league multipliers."""
    try:
        with open(MULTIPLIERS_PATH, "w", encoding="utf-8") as f:
            json.dump(new_multipliers, f, indent=2)
        return {"message": "Multipliers updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/recalculate")
def recalculate_roles(background_tasks: BackgroundTasks):
    """Trigger a background re-evaluation of all players with the current config."""
    def _run_recalc():
        try:
            # Need to reload the config in evaluator module before running
            from scraper import evaluator
            with open(ROLES_CONFIG_PATH, "r", encoding="utf-8") as f:
                evaluator.ROLES_CONFIG = json.load(f)
                
            conn = get_connection()
            def log_fn(level, msg):
                logger.info(msg)
                
            eval_count = evaluator.evaluate_all_players(conn, log_fn)
            logger.info(f"Recalculation complete. Evaluated {eval_count} players.")
        except Exception as e:
            logger.error(f"Error during recalculation: {e}")

    background_tasks.add_task(_run_recalc)
    return {"message": "Recalculation started in the background."}
