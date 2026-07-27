import sqlite3
import os

db_path = os.path.join("database", "sofascore_stats.db")
print("Connecting to DB:", db_path)
conn = sqlite3.connect(db_path, timeout=10)
conn.execute("PRAGMA journal_mode=WAL;")
try:
    conn.execute("ALTER TABLE players ADD COLUMN height INTEGER;")
    print("Added height")
except Exception as e:
    print("Height error:", e)

try:
    conn.execute("ALTER TABLE players ADD COLUMN foot TEXT;")
    print("Added foot")
except Exception as e:
    print("Foot error:", e)
conn.commit()
conn.close()
