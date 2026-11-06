"""
api/floormap.py — Homography Floor Map Endpoints.

Phase 2 API: Worker position projection, heat density map,
zone occupancy, and blueprint data for frontend canvas rendering.
"""

from __future__ import annotations
import sys, os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

_ai_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ai")
if _ai_dir not in sys.path:
    sys.path.insert(0, os.path.abspath(_ai_dir))


class WorkerPositionUpdate(BaseModel):
    camera_id:       str
    worker_id:       str
    bbox_center_px:  list   # [x, y]
    confidence:      float = 0.9
    timestamp:       Optional[str] = None


@router.get("/floormap/blueprint")
def get_blueprint():
    """Return the full site blueprint data for frontend canvas rendering."""
    from homography import get_floor_map_engine, SITE_BLUEPRINT, DEFAULT_CALIBRATIONS
    engine = get_floor_map_engine()
    return {
        "site": SITE_BLUEPRINT,
        "cameras": {
            cam_id: {
                "name":           calib["name"],
                "src_points":     calib["src_points"],
                "dst_points":     calib["dst_points"],
                "zone_coverage":  calib["zone_coverage"],
                "height_meters":  calib["height_meters"],
                "fov_degrees":    calib["fov_degrees"],
            }
            for cam_id, calib in DEFAULT_CALIBRATIONS.items()
        },
    }


@router.get("/floormap/positions")
def get_worker_positions():
    """Get current projected worker positions on the blueprint."""
    from homography import get_floor_map_engine
    engine = get_floor_map_engine()
    return {
        "workers": engine.get_all_positions(),
        "zone_occupancy": engine.get_zone_occupancy_map(),
    }


@router.post("/floormap/update")
def update_worker_position(payload: WorkerPositionUpdate):
    """Update a worker's blueprint position from camera pixel coordinates."""
    from homography import get_floor_map_engine
    engine = get_floor_map_engine()
    result = engine.update_worker(
        camera_id      = payload.camera_id,
        worker_id      = payload.worker_id,
        bbox_center_px = tuple(payload.bbox_center_px),
        confidence     = payload.confidence,
        timestamp      = payload.timestamp,
    )
    if result is None:
        raise HTTPException(status_code=400, detail="Could not project position (calibration data missing)")
    return result


@router.post("/floormap/update-batch")
def update_workers_batch(workers: list[WorkerPositionUpdate]):
    """Batch update multiple workers in one API call."""
    from homography import get_floor_map_engine
    engine = get_floor_map_engine()
    results = []
    for w in workers:
        r = engine.update_worker(w.camera_id, w.worker_id, tuple(w.bbox_center_px), w.confidence, w.timestamp)
        if r:
            results.append(r)
    return {"updated": len(results), "positions": results}


@router.get("/floormap/heatmap")
def get_heatmap(grid_w: int = 40, grid_h: int = 30):
    """Return a 2D density grid for heatmap visualization."""
    from homography import get_floor_map_engine
    engine = get_floor_map_engine()
    grid = engine.get_heat_density_grid(grid_w, grid_h)
    return {
        "grid_w": grid_w,
        "grid_h": grid_h,
        "density": grid,
        "site_width_m":  40.0,
        "site_height_m": 30.0,
    }


@router.post("/floormap/project-pixel")
def project_pixel(camera_id: str, px: float, py: float):
    """Project a single pixel coordinate to blueprint meters."""
    from homography import CameraHomography, DEFAULT_CALIBRATIONS
    if camera_id not in DEFAULT_CALIBRATIONS:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not in calibration database")
    cam = CameraHomography(camera_id)
    cam.compute()
    result = cam.pixel_to_blueprint(px, py)
    if result is None:
        raise HTTPException(status_code=500, detail="Projection failed")
    return {"camera_id": camera_id, "pixel": [px, py], "blueprint_m": list(result)}


@router.get("/floormap/calibration/{camera_id}")
def get_camera_calibration(camera_id: str):
    """Return calibration data for a specific camera."""
    from homography import DEFAULT_CALIBRATIONS
    if camera_id not in DEFAULT_CALIBRATIONS:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    return DEFAULT_CALIBRATIONS[camera_id]
