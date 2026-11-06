"""
events.py â€” Canonical safety event schema and normalisation.

All detections from detection.py, zones.py, and fall.py are normalised
into a single SafetyEvent dict before being POSTed to the backend.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# Severity mapping
# ---------------------------------------------------------------------------

SEVERITY_MAP = {
    "NO_HELMET":            "HIGH",
    "NO_VEST":              "MEDIUM",
    "RESTRICTED_ENTRY":     "CRITICAL",
    "POSSIBLE_FALL":        "CRITICAL",
    "MACHINERY_PROXIMITY":  "HIGH",
}

VALID_EVENT_TYPES = set(SEVERITY_MAP.keys())

# ---------------------------------------------------------------------------
# Recommendation text for each event type (for UI & AI response display)
# ---------------------------------------------------------------------------

RECOMMENDATION_MAP = {
    "NO_HELMET":           "Immediately direct the worker to retrieve their EN 397 hardhat before continuing work.",
    "NO_VEST":             "Worker must don a Class 2 Hi-Vis vest before re-entering the active work zone.",
    "RESTRICTED_ENTRY":    "Dispatch safety officer to escort unauthorized personnel from the restricted zone immediately.",
    "POSSIBLE_FALL":       "URGENT: Alert first responder to check on worker. Activate emergency protocol if unresponsive.",
    "MACHINERY_PROXIMITY": "Halt machine operation and guide worker to safe distance before resuming.",
}



# ---------------------------------------------------------------------------
# Canonical event schema
# ---------------------------------------------------------------------------

def build_event(
    event_type: str,
    confidence: float,
    camera_id: str,
    zone_id: Optional[str] = None,
    worker_id: Optional[str] = None,
    snapshot_path: Optional[str] = None,
    extra: Optional[dict] = None,
) -> dict:
    """
    Build and return a canonical safety event dict.

    {
        "event_id":     str (UUID4),
        "event_type":   str,
        "severity":     "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "confidence":   float (0â€“1),
        "camera_id":    str,
        "worker_id":    str | None,
        "zone_id":      str | None,
        "snapshot_path": str | None,
        "status":       "OPEN",
        "timestamp":    ISO-8601 str,
    }
    """
    event_type = event_type.upper()
    if event_type not in VALID_EVENT_TYPES:
        raise ValueError(f"Unknown event_type: {event_type!r}. Valid: {VALID_EVENT_TYPES}")

    return {
        "event_id":      str(uuid.uuid4()),
        "event_type":    event_type,
        "severity":      SEVERITY_MAP[event_type],
        "confidence":    round(float(confidence), 4),
        "camera_id":     camera_id,
        "worker_id":     worker_id or _assign_worker_id(),
        "zone_id":       zone_id or "UNKNOWN",
        "snapshot_path": snapshot_path,
        "status":        "OPEN",
        "timestamp":     datetime.now(timezone.utc).isoformat(),
        "recommendation":RECOMMENDATION_MAP.get(event_type, "Follow site safety protocol."),
        **(extra or {}),
    }


# ---------------------------------------------------------------------------
# Normalise from detection outputs to events
# ---------------------------------------------------------------------------

def ppe_violation_to_event(
    violation: dict,
    camera_id: str,
    zone_id: Optional[str] = None,
) -> dict:
    """Convert a PPE violation dict from detection.py into a SafetyEvent."""
    return build_event(
        event_type=violation["violation"],  # "NO_HELMET" or "NO_VEST"
        confidence=violation["confidence"],
        camera_id=camera_id,
        zone_id=zone_id,
    )


def zone_violation_to_event(
    zone_violation: dict,
    camera_id: str,
    confidence: float = 0.9,
) -> dict:
    """Convert a zone violation dict from zones.py into a SafetyEvent."""
    return build_event(
        event_type="RESTRICTED_ENTRY",
        confidence=confidence,
        camera_id=camera_id,
        zone_id=zone_violation.get("zone_id"),
    )


def fall_to_event(
    fall: dict,
    camera_id: str,
    zone_id: Optional[str] = None,
) -> dict:
    """Convert a fall detection dict from fall.py into a SafetyEvent."""
    return build_event(
        event_type="POSSIBLE_FALL",
        confidence=fall["confidence"],
        camera_id=camera_id,
        zone_id=zone_id,
        extra={"aspect_ratio": fall.get("aspect_ratio")},
    )


# ---------------------------------------------------------------------------
# Debounce: suppress duplicate events
# ---------------------------------------------------------------------------

class EventDebouncer:
    """
    Prevent duplicate alerts for the same camera + event_type within debounce_seconds.
    Suppresses alert spam while maintaining real-time safety responsiveness.
    """

    def __init__(self, debounce_seconds: int = 30):
        self.debounce_seconds = debounce_seconds
        # key: (camera_id, event_type) â†’ last emit timestamp
        self._last_seen: dict[tuple, datetime] = {}

    def should_emit(self, event: dict) -> bool:
        # Key on camera and event_type so slight zone jitter doesn't re-trigger
        key = (event["camera_id"], event["event_type"])
        now = datetime.now(timezone.utc)
        last = self._last_seen.get(key)
        if last is None or (now - last).total_seconds() >= self.debounce_seconds:
            self._last_seen[key] = now
            return True
        return False


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _assign_worker_id() -> str:
    """Returns a stable default worker ID."""
    return "W-01"

