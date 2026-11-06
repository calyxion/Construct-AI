"""
app/main.py â€” FastAPI application entry point for CONSTRUCTAI backend.

Run with:
    cd constructai
    python -m uvicorn backend.app.main:app --reload --port 8000
"""

import os
import sys
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

# Ensure parent and backend paths are in sys.path for direct execution
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
constructai_dir = backend_dir.parent
for p in [str(backend_dir), str(constructai_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from ..database.init_db import init_db, SessionLocal
    from ..api.events  import router as events_router
    from ..api.metrics import router as metrics_router
    from ..api.zones   import router as zones_router
    from ..api.health  import router as health_router
    from ..api.stream  import router as stream_router
    from ..api.upload  import router as upload_router
    from ..api.workforce import router as workforce_router
    from ..api.pose      import router as pose_router
    from ..api.vlm       import router as vlm_router
    from ..api.floormap  import router as floormap_router
    from ..api.iot       import router as iot_router
    from ..api.camera    import router as camera_router
    from ..api.bim       import router as bim_router
    from ..api.enterprise import router as enterprise_router
    from ..api.payments  import router as payments_router
    from ..api.analytics import router as analytics_router
    from ..services.risk_scoring import calculate_all_zones_risk
    from ..websocket.events import manager as _ws_manager
except (ImportError, ValueError):
    from backend.database.init_db import init_db, SessionLocal
    from backend.api.events  import router as events_router
    from backend.api.metrics import router as metrics_router
    from backend.api.zones   import router as zones_router
    from backend.api.health  import router as health_router
    from backend.api.stream  import router as stream_router
    from backend.api.upload  import router as upload_router
    from backend.api.workforce import router as workforce_router
    from backend.api.pose      import router as pose_router
    from backend.api.vlm       import router as vlm_router
    from backend.api.floormap  import router as floormap_router
    from backend.api.iot       import router as iot_router
    from backend.api.camera    import router as camera_router
    from backend.api.bim       import router as bim_router
    from backend.api.enterprise import router as enterprise_router
    from backend.api.payments  import router as payments_router
    from backend.api.analytics import router as analytics_router
    from backend.services.risk_scoring import calculate_all_zones_risk
    from backend.websocket.events import manager as _ws_manager


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise DB on startup; recalculate risk scores periodically."""
    init_db()
    task = asyncio.create_task(_risk_recalc_loop())
    yield
    task.cancel()


async def _risk_recalc_loop(interval: int = 30):
    """Recalculate risk for all zones every N seconds."""
    while True:
        await asyncio.sleep(interval)
        try:
            db = SessionLocal()
            calculate_all_zones_risk(db)
            db.close()
        except Exception as e:
            print(f"[risk_recalc] Error: {e}")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CONSTRUCTAI API",
    description="AI-Powered Construction Site Safety & Workforce Monitoring",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(events_router,    prefix="/api", tags=["events"])
app.include_router(metrics_router,   prefix="/api", tags=["metrics"])
app.include_router(zones_router,     prefix="/api", tags=["zones"])
app.include_router(health_router,    prefix="/api", tags=["health"])
app.include_router(stream_router,    prefix="/api", tags=["stream"])
app.include_router(upload_router,    prefix="/api", tags=["upload"])
app.include_router(workforce_router, prefix="/api/workforce", tags=["workforce"])

# Phase 2: Multimodal VLM, Pose & Floor Map
app.include_router(pose_router,     prefix="/api", tags=["pose"])
app.include_router(vlm_router,      prefix="/api", tags=["vlm"])
app.include_router(floormap_router, prefix="/api", tags=["floormap"])

# Phase 3: IoT Interlocks
app.include_router(iot_router,      prefix="/api", tags=["iot"])

# Edge Utilities
app.include_router(camera_router,   prefix="/api", tags=["camera"])

# Phase 4: Enterprise BIM & ERP
app.include_router(bim_router,      prefix="/api", tags=["bim"])
app.include_router(enterprise_router, prefix="/api", tags=["enterprise"])
app.include_router(payments_router,   prefix="/api", tags=["payments"])
app.include_router(analytics_router,  prefix="/api", tags=["analytics"])

# WebSocket at root level (matching frontend ws://host/ws/events)
@app.websocket("/ws/events")
async def ws_events(ws: WebSocket):
    await _ws_manager.connect(ws)
    try:
        while True:
            try:
                await asyncio.wait_for(ws.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                try:
                    await ws.send_text('{"type":"ping"}')
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _ws_manager.disconnect(ws)

# Serve snapshot images as static files
snapshots_dir = Path(os.getenv("SNAPSHOT_DIR", str(constructai_dir / "screenshots" / "snapshots")))
snapshots_dir.mkdir(parents=True, exist_ok=True)
app.mount("/snapshots", StaticFiles(directory=str(snapshots_dir)), name="snapshots")


@app.get("/")
def root():
    return {
        "service": "CONSTRUCTAI Backend",
        "version": "2.0.0",
        "docs":    "/docs",
        "health":  "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)






