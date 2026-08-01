# Sofascore Scouting App

Desktop application for a sports scouting agency. Extracts statistical data from the Sofascore API, evaluates player profiles using a custom DAX-like scoring engine, and visualizes data with scatter plots and radar charts.

## Prerequisites

- Python 3.11+
- Node.js 18+

## Quick Start

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # (Windows)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*The SQLite database (`sofascore_stats.db`) will be automatically created in `backend/database/` on first run.*

### 2. Frontend (React / Vite)

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Access the app at `http://localhost:5173`.*

## Features

- **Sync Pipeline**: Asynchronous scraping of entire leagues bypassing Cloudflare via TLS fingerprinting.
- **Data Enrichment**: Automatically fetches missing player metadata and advanced running stats.
- **Scouting Evaluator**: Computes global and league-relative scores for players based on specific tactical roles.
- **Interactive Dashboards**: ECharts-powered scatter plots and positional radar charts.
- **Heatmaps**: Live heatmap extraction per player directly from Sofascore.

## Architecture

See [ARCHITECTURE.txt](./ARCHITECTURE.txt) for a detailed technical overview.
See [schema.dbml](./schema.dbml) for the database structure.
