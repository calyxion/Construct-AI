"""
zones.py — Advanced Computational Geometry & Proximity Safety Zones.
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np

try:
    from shapely.geometry import Point, Polygon as ShapelyPolygon
    _SHAPELY = True
except ImportError:
    _SHAPELY = False


@dataclass
class Zone:
    zone_id: str
    name: str
    zone_type: str          # "RESTRICTED" | "MACHINERY" | "NORMAL"
    polygon: list[list[int]]  # [[x, y], ...]
    camera_id: str = "CAM-01"
    color: tuple = (0, 30, 230)   # BGR colour for drawing
    warning_buffer_px: float = 40.0 # ~1.5m hazard proximity buffer

    def contains_point(self, point: list[int]) -> bool:
        """Return True if point [x, y] is inside this zone's polygon."""
        px, py = point
        if _SHAPELY:
            return ShapelyPolygon(self.polygon).contains(Point(px, py))
        import cv2
        pts = np.array(self.polygon, dtype=np.int32)
        result = cv2.pointPolygonTest(pts, (float(px), float(py)), False)
        return result >= 0

    def distance_to_boundary(self, point: list[int]) -> float:
        """Calculate signed Euclidean distance to polygon perimeter (+ve inside, -ve outside)."""
        px, py = point
        import cv2
        pts = np.array(self.polygon, dtype=np.int32)
        dist = cv2.pointPolygonTest(pts, (float(px), float(py)), True)
        return float(dist)


# SOTA Default Geofence Perimeter
DEFAULT_ZONES: list[Zone] = [
    Zone(
        zone_id="ZONE-CRANE",
        name="CRANE SWING PERIMETER [RESTRICTED]",
        zone_type="RESTRICTED",
        polygon=[[380, 240], [635, 240], [635, 475], [380, 475]],
        color=(0, 30, 230),
    ),
]


class ZoneRegistry:
    def __init__(self, zones: Optional[list[Zone]] = None):
        self._zones: dict[str, Zone] = {}
        for z in (zones or DEFAULT_ZONES):
            self._zones[z.zone_id] = z

    def get_zone(self, zone_id: str) -> Optional[Zone]:
        return self._zones.get(zone_id)

    def all_zones(self) -> list[Zone]:
        return list(self._zones.values())

    def find_zone_for_point(self, point: list[int], camera_id: str = "CAM-01") -> Optional[Zone]:
        matching = [
            z for z in self._zones.values()
            if z.camera_id == camera_id and z.contains_point(point)
        ]
        priority = {"RESTRICTED": 0, "MACHINERY": 1, "NORMAL": 2}
        if not matching:
            return None
        return min(matching, key=lambda z: priority.get(z.zone_type, 99))

    def check_restricted_entry(
        self, person_center: list[int], camera_id: str = "CAM-01"
    ) -> Optional[dict]:
        """Two-stage evaluation: Full Zone Breach (Inside) or Proximity Warning (Buffer)."""
        for zone in self._zones.values():
            if zone.camera_id != camera_id or zone.zone_type != "RESTRICTED":
                continue

            dist = zone.distance_to_boundary(person_center)
            if dist >= 0:  # Inside zone
                return {
                    "violation": "RESTRICTED_ENTRY",
                    "zone_id": zone.zone_id,
                    "zone_name": zone.name,
                    "person_center": person_center,
                    "severity": "CRITICAL",
                    "distance": 0.0
                }
            elif abs(dist) <= zone.warning_buffer_px:  # Approaching hazard boundary
                return {
                    "violation": "ZONE_PROXIMITY_WARNING",
                    "zone_id": zone.zone_id,
                    "zone_name": zone.name,
                    "person_center": person_center,
                    "severity": "HIGH",
                    "distance": round(abs(dist), 1)
                }

        return None


def draw_zones(frame: np.ndarray, zones: list[Zone], alpha: float = 0.10) -> np.ndarray:
    """Overlay subtle, non-intrusive industrial polygon boundary on the frame."""
    import cv2
    overlay = frame.copy()
    for zone in zones:
        pts = np.array(zone.polygon, dtype=np.int32)
        cv2.fillPoly(overlay, [pts], zone.color)
        cv2.polylines(frame, [pts], isClosed=True, color=zone.color, thickness=2)
        
        lx, ly = zone.polygon[0]
        label = f"[RESTRICTED] {zone.name}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)
        cv2.rectangle(frame, (lx, ly), (lx + tw + 8, ly + th + 6), (15, 20, 30), -1)
        cv2.putText(frame, label, (lx + 4, ly + th + 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, zone.color, 1, cv2.LINE_AA)

    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
    return frame
