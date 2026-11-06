"""
homography.py — Multi-Camera 3D Homography Floor Mapping.

Phase 2 Module: Calibrate homography matrices H for each camera to project
worker pixel coordinates (u, v) onto a 2D site blueprint coordinate system.

Enables:
  - Real-time worker location visualization on 2D floor plans
  - Multi-camera triangulation for 3D positioning
  - Proximity heat density maps on site blueprints
  - Zone boundary verification vs blueprint coordinates
"""

from __future__ import annotations
import json, os
import numpy as np
from typing import Optional

# ---------------------------------------------------------------------------
# Default camera calibration data (pre-set for demo site layout)
# Pixel source points: known pixel locations of site corner markers
# Blueprint destination points: corresponding blueprint coordinates in meters
# ---------------------------------------------------------------------------

# Site: Sector 4B (40m × 30m construction site)
# Blueprint coordinate system: origin (0,0) = bottom-left corner of site
# Units: meters

DEFAULT_CALIBRATIONS = {
    "CAM-01": {
        "name": "Main Assembly — Sector 4B",
        "resolution": (1280, 720),
        "src_points": [   # Pixel corners of known markers in camera frame
            [85,  85],    # Corner A — Zone A North-West
            [1195, 90],   # Corner B — Zone A North-East
            [1200, 635],  # Corner C — Zone A South-East
            [90,  640],   # Corner D — Zone A South-West
        ],
        "dst_points": [   # Corresponding real-world blueprint coords (meters)
            [0.0,  30.0], # A — (0, 30m)  NW corner
            [40.0, 30.0], # B — (40m, 30m) NE corner
            [40.0, 0.0],  # C — (40m, 0)   SE corner
            [0.0,  0.0],  # D — (0, 0)     SW corner
        ],
        "zone_coverage": ["ZONE-A"],
        "height_meters": 3.0,   # Camera mounting height
        "fov_degrees":   90.0,
    },
    "CAM-02": {
        "name": "Crane Swing Perimeter",
        "resolution": (1280, 720),
        "src_points": [
            [100, 100], [900, 100], [900, 620], [100, 620]
        ],
        "dst_points": [
            [18.0, 28.0], [36.0, 28.0], [36.0, 12.0], [18.0, 12.0]
        ],
        "zone_coverage": ["ZONE-B", "ZONE-CRANE"],
        "height_meters": 5.0,
        "fov_degrees":   75.0,
    },
    "CAM-03": {
        "name": "Scaffold Elevation Platform",
        "resolution": (1280, 720),
        "src_points": [
            [150, 80], [1130, 80], [1130, 640], [150, 640]
        ],
        "dst_points": [
            [0.0, 15.0], [18.0, 15.0], [18.0, 0.0], [0.0, 0.0]
        ],
        "zone_coverage": ["ZONE-C"],
        "height_meters": 8.0,
        "fov_degrees":   80.0,
    },
}

# Site blueprint dimensions and zone polygons (in meters)
SITE_BLUEPRINT = {
    "width_m":  40.0,
    "height_m": 30.0,
    "zones": {
        "ZONE-A": {
            "name": "General Assembly",
            "polygon_m": [[0, 0], [18, 0], [18, 30], [0, 30]],
            "color": "#10b981",
            "risk": "SAFE",
        },
        "ZONE-B": {
            "name": "Crane Swing Radius",
            "polygon_m": [[18, 10], [36, 10], [36, 28], [18, 28]],
            "color": "#ef4444",
            "risk": "CRITICAL",
        },
        "ZONE-C": {
            "name": "Scaffold Platform",
            "polygon_m": [[0, 0], [18, 0], [18, 15], [0, 15]],
            "color": "#f59e0b",
            "risk": "HIGH",
        },
    },
}


# ---------------------------------------------------------------------------
# Homography Matrix Computation
# ---------------------------------------------------------------------------

class CameraHomography:
    """Compute and cache homography matrix H for a single camera."""

    def __init__(self, camera_id: str, calibration: Optional[dict] = None):
        self.camera_id   = camera_id
        self.calibration = calibration or DEFAULT_CALIBRATIONS.get(camera_id, {})
        self._H: Optional[np.ndarray] = None
        self._H_inv: Optional[np.ndarray] = None

    def compute(self) -> bool:
        """Compute homography matrix from calibration point pairs."""
        import cv2
        src = self.calibration.get("src_points")
        dst = self.calibration.get("dst_points")
        if not src or not dst or len(src) < 4:
            print(f"[HOMOGRAPHY] {self.camera_id}: insufficient calibration points")
            return False

        src_arr = np.array(src, dtype=np.float32)
        dst_arr = np.array(dst, dtype=np.float32)
        H, mask = cv2.findHomography(src_arr, dst_arr, cv2.RANSAC, 5.0)
        if H is None:
            print(f"[HOMOGRAPHY] {self.camera_id}: findHomography failed")
            return False

        self._H     = H
        self._H_inv = np.linalg.inv(H)
        reprojection_errors = self._compute_reprojection_error(src_arr, dst_arr)
        print(f"[HOMOGRAPHY] {self.camera_id}: H computed. Mean reprojection error: {reprojection_errors:.4f}m")
        return True

    def _compute_reprojection_error(self, src: np.ndarray, dst: np.ndarray) -> float:
        """Compute mean reprojection error in blueprint space."""
        projected = self.pixel_to_blueprint_batch(src.tolist())
        errors = [np.linalg.norm(np.array(p) - np.array(d)) for p, d in zip(projected, dst.tolist())]
        return float(np.mean(errors))

    def pixel_to_blueprint(self, px: float, py: float) -> Optional[tuple]:
        """Project a single pixel (px, py) to blueprint coordinates (x_m, y_m)."""
        if self._H is None:
            self.compute()
        if self._H is None:
            return None
        pt = np.array([[[px, py]]], dtype=np.float32)
        import cv2
        result = cv2.perspectiveTransform(pt, self._H)
        x_m, y_m = float(result[0][0][0]), float(result[0][0][1])
        return (round(x_m, 3), round(y_m, 3))

    def pixel_to_blueprint_batch(self, points: list) -> list:
        """Project multiple pixel points to blueprint coordinates."""
        return [self.pixel_to_blueprint(p[0], p[1]) for p in points]

    def blueprint_to_pixel(self, x_m: float, y_m: float) -> Optional[tuple]:
        """Inverse map: blueprint coordinate to pixel."""
        if self._H_inv is None:
            self.compute()
        if self._H_inv is None:
            return None
        pt = np.array([[[x_m, y_m]]], dtype=np.float32)
        import cv2
        result = cv2.perspectiveTransform(pt, self._H_inv)
        return (int(result[0][0][0]), int(result[0][0][1]))


# ---------------------------------------------------------------------------
# Multi-Camera Floor Map State
# ---------------------------------------------------------------------------

class FloorMapEngine:
    """Maintain real-time worker positions on the site blueprint from multiple cameras."""

    def __init__(self):
        self._cameras: dict[str, CameraHomography] = {}
        self._worker_positions: dict[str, dict] = {}   # worker_id → {x_m, y_m, camera_id, confidence, ts}
        self._heat_points: list[tuple] = []            # (x_m, y_m) history for heatmap

        # Initialize all cameras
        for cam_id, calib in DEFAULT_CALIBRATIONS.items():
            cam = CameraHomography(cam_id, calib)
            cam.compute()
            self._cameras[cam_id] = cam

    def update_worker(
        self,
        camera_id: str,
        worker_id: str,
        bbox_center_px: tuple,
        confidence: float,
        timestamp: Optional[str] = None,
    ) -> Optional[dict]:
        """Update a worker's blueprint position from camera pixel coordinates."""
        cam = self._cameras.get(camera_id)
        if cam is None:
            return None

        px, py = bbox_center_px
        blueprint_pos = cam.pixel_to_blueprint(px, py)
        if blueprint_pos is None:
            return None

        x_m, y_m = blueprint_pos
        import time
        ts = timestamp or time.strftime("%H:%M:%S")

        record = {
            "worker_id":   worker_id,
            "x_m":         x_m,
            "y_m":         y_m,
            "camera_id":   camera_id,
            "confidence":  confidence,
            "timestamp":   ts,
        }
        self._worker_positions[worker_id] = record
        self._heat_points.append((x_m, y_m))

        # Trim heat history
        if len(self._heat_points) > 2000:
            self._heat_points = self._heat_points[-2000:]

        return record

    def get_all_positions(self) -> list:
        """Get current blueprint positions of all tracked workers."""
        return list(self._worker_positions.values())

    def get_zone_occupancy_map(self) -> dict:
        """Return zone → worker count based on blueprint positions."""
        occupancy = {z: 0 for z in SITE_BLUEPRINT["zones"]}
        from shapely.geometry import Point, Polygon
        for w in self._worker_positions.values():
            pt = Point(w["x_m"], w["y_m"])
            for zone_id, zone_data in SITE_BLUEPRINT["zones"].items():
                zone_poly = Polygon(zone_data["polygon_m"])
                if zone_poly.contains(pt):
                    occupancy[zone_id] = occupancy.get(zone_id, 0) + 1
        return occupancy

    def get_heat_density_grid(self, grid_w: int = 40, grid_h: int = 30) -> list:
        """Return a 2D density grid for heatmap visualization (normalized 0-1)."""
        grid = [[0.0] * grid_w for _ in range(grid_h)]
        site_w = SITE_BLUEPRINT["width_m"]
        site_h = SITE_BLUEPRINT["height_m"]
        for x_m, y_m in self._heat_points:
            gx = int(min(x_m / site_w * grid_w, grid_w - 1))
            gy = int(min(y_m / site_h * grid_h, grid_h - 1))
            grid[gy][gx] += 1
        # Normalize
        max_val = max(max(row) for row in grid) or 1.0
        return [[cell / max_val for cell in row] for row in grid]

    def get_blueprint_info(self) -> dict:
        """Return full site blueprint data for frontend rendering."""
        return {
            "site": SITE_BLUEPRINT,
            "cameras": {
                cam_id: {
                    "name": calib["name"],
                    "src_points": calib["src_points"],
                    "dst_points": calib["dst_points"],
                    "zone_coverage": calib["zone_coverage"],
                }
                for cam_id, calib in DEFAULT_CALIBRATIONS.items()
            },
            "worker_positions": self.get_all_positions(),
            "zone_occupancy": self.get_zone_occupancy_map(),
        }


# Singleton engine
_floor_map_engine: Optional[FloorMapEngine] = None

def get_floor_map_engine() -> FloorMapEngine:
    global _floor_map_engine
    if _floor_map_engine is None:
        _floor_map_engine = FloorMapEngine()
    return _floor_map_engine
