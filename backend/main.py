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


@app.get("/")
def root():
    return {
        "app": "DF Agency Scouting API",
        "version": "2.0.0",
        "docs": "/docs",
    }
