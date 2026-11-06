"""
fall.py — Robust Fall Detection Engine with Sitting/Desk Filter.

Detects rapid vertical collapse or horizontal lying pose:
  1. Prevents false alarms when sitting normally in front of webcam/desk.
  2. Requires horizontal aspect ratio (width/height >= 2.0) or rapid downward collapse.
"""

from collections import deque
from dataclasses import dataclass, field
from typing import Optional

FALL_FRAMES    = 8       # Consecutive frames required to confirm fall
HISTORY_LEN    = 15      # Frames of motion history
WIDE_RATIO     = 2.1     # width/height >= 2.1 for true lying-down pose


@dataclass
class PersonTracker:
    track_id: str
    bbox_history: deque = field(default_factory=lambda: deque(maxlen=HISTORY_LEN))
    fall_frame_count: int = 0
    fall_alerted: bool = False

    def add_bbox(self, bbox: list[int]):
        self.bbox_history.append(bbox)

    @property
    def latest_bbox(self) -> Optional[list[int]]:
        return self.bbox_history[-1] if self.bbox_history else None

    @property
    def aspect_ratio(self) -> float:
        if not self.latest_bbox:
            return 0.0
        x1, y1, x2, y2 = self.latest_bbox
        w = max(1, x2 - x1)
        h = max(1, y2 - y1)
        return w / h

    @property
    def has_rapid_drop(self) -> bool:
        """Checks if height dropped by >45% from standing position."""
        if len(self.bbox_history) < 6:
            return False
        old_h = max(1, self.bbox_history[0][3] - self.bbox_history[0][1])
        cur_h = max(1, self.bbox_history[-1][3] - self.bbox_history[-1][1])
        return (cur_h / old_h) < 0.55


class FallDetector:
    def __init__(self, fall_frames: int = FALL_FRAMES, wide_ratio: float = WIDE_RATIO):
        self.fall_frames = fall_frames
        self.wide_ratio  = wide_ratio
        self._trackers: dict[str, PersonTracker] = {}

    def update(self, person_detections: list[dict], camera_id: str = "CAM-01") -> list[dict]:
        fall_events = []

        for det in person_detections:
            if det["label"] != "person":
                continue

            track_id = self._assign_track_id(det)
            tracker  = self._trackers[track_id]
            tracker.add_bbox(det["bbox"])

            # True fall: completely horizontal (ratio >= 2.1) OR rapid vertical collapse
            is_fallen = (tracker.aspect_ratio >= self.wide_ratio) or tracker.has_rapid_drop

            if is_fallen:
                tracker.fall_frame_count += 1
            else:
                tracker.fall_frame_count = max(0, tracker.fall_frame_count - 1)
                tracker.fall_alerted = False

            if tracker.fall_frame_count >= self.fall_frames and not tracker.fall_alerted:
                tracker.fall_alerted = True
                fall_events.append({
                    "violation": "POSSIBLE_FALL",
                    "track_id": track_id,
                    "person_bbox": det["bbox"],
                    "person_center": det["center"],
                    "confidence": 0.85,
                    "camera_id": camera_id,
                    "aspect_ratio": round(tracker.aspect_ratio, 2),
                })

        self._prune_stale_trackers()
        return fall_events

    def _assign_track_id(self, det: dict) -> str:
        MATCH_DIST = 100
        cx, cy = det["center"]
        best_id, best_dist = None, float("inf")

        for tid, tracker in self._trackers.items():
            if tracker.latest_bbox is None:
                continue
            bx1, by1, bx2, by2 = tracker.latest_bbox
            bcx, bcy = (bx1 + bx2) // 2, (by1 + by2) // 2
            dist = ((cx - bcx) ** 2 + (cy - bcy) ** 2) ** 0.5
            if dist < best_dist and dist < MATCH_DIST:
                best_dist = dist
                best_id = tid

        if best_id is None:
            best_id = f"T{len(self._trackers) + 1:03d}"
            self._trackers[best_id] = PersonTracker(track_id=best_id)

        return best_id

    def _prune_stale_trackers(self):
        if len(self._trackers) > 40:
            ids = list(self._trackers.keys())
            for tid in ids[: len(ids) // 2]:
                del self._trackers[tid]
