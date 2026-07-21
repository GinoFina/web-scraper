"""
SQLite connection manager for the FastAPI backend.
Provides a thread-safe connection and schema initialization.
"""

import sqlite3
import os
from pathlib import Path

# Database lives next to the backend package
_DB_DIR = Path(__file__).resolve().parent
DB_PATH = str(_DB_DIR / "sofascore_stats.db")
_SCHEMA_PATH = str(_DB_DIR / "schema.sql")

_connection: sqlite3.Connection | None = None


def _read_schema() -> str:
    with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return f.read()


def get_connection() -> sqlite3.Connection:
    """Return the singleton SQLite connection (creates DB + schema if needed)."""
    global _connection
    if _connection is not None:
        return _connection

    _connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    _connection.row_factory = sqlite3.Row
    _connection.execute("PRAGMA journal_mode=WAL")
    _connection.execute("PRAGMA foreign_keys=ON")

    # Initialize schema
    _connection.executescript(_read_schema())
    _connection.commit()

    return _connection


def close_connection() -> None:
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None
