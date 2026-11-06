"""
api/bim.py — BIM 4D Digital Twin Endpoint
Serves 3D volumetric coordinates.
"""
from fastapi import APIRouter
import random

router = APIRouter()

@router.get("/bim/coordinates")
def get_3d_coordinates():
    # Simulate converting 2D homography into a 3D building model (Autodesk Forge / Three.js format)
    # Returns an array of workers mapped to 3D space
    workers_3d = []
    for i in range(1, 6):
        workers_3d.append({
            "id": f"W-{100+i}",
            "position": [
                random.uniform(-10, 10), # X (Width)
                random.uniform(0, 2),    # Y (Height/Elevation - e.g. scaffolding)
                random.uniform(-10, 10)  # Z (Depth)
            ],
            "status": "SAFE" if random.random() > 0.2 else "WARNING"
        })
    return {"workers": workers_3d, "site_bounds": [-15, 15, -15, 15]}
