"""
DF Agency Scouting App — FastAPI Backend Entry Point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import get_connection, close_connection
from api.players import router as players_router
from api.analytics import router as analytics_router
from api.sync import router as sync_router
from api.reports import router as reports_router
from api.filters import router as filters_router
from api.config import router as config_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database
    get_connection()
    yield
    # Shutdown: close database
    close_connection()


app = FastAPI(
    title="DF Agency Scouting API",
    description="Backend for the DF Agency football scouting desktop application",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(players_router)
app.include_router(analytics_router)
app.include_router(sync_router)
app.include_router(reports_router)
app.include_router(filters_router)
app.include_router(config_router)


import sys
import os
import threading
import time
import webbrowser
import uvicorn
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

if hasattr(sys, "_MEIPASS"):
    base_path = Path(sys._MEIPASS)
else:
    base_path = Path(__file__).resolve().parent.parent

frontend_dist = base_path / "frontend" / "dist"

if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If it's an API route that wasn't matched, return 404 naturally
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
            
        path = frontend_dist / full_path
        if path.is_file():
            return FileResponse(path)
            
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "app": "DF Agency Scouting API",
            "version": "2.0.0",
            "docs": "/docs",
            "warning": "Frontend dist folder not found."
        }

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)
