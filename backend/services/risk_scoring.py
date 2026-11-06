"""
services/risk_scoring.py — Zone risk score calculation engine.

Risk formula (normalised to 0–100):
  score = min(100,
      ppe_violations      × 10 +
      restricted_entries  × 25 +
      possible_falls      × 40 +
      machinery_proximity × 20 +
      density_factor
  )

Weights are configurable and presented as a prototype model.
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session
from sqlalchemy import func

if TYPE_CHECKING:
    pass

from ..database.models import Event, RiskScore, Zone, EventType, Severity, RiskLevel

# ---------------------------------------------------------------------------
# Weights
# ---------------------------------------------------------------------------
WEIGHTS = {
    "NO_HELMET":            10,
    "NO_VEST":               5,
    "RESTRICTED_ENTRY":     25,
    "POSSIBLE_FALL":        40,
    "MACHINERY_PROXIMITY":  20,
}

LOOKBACK_MINUTES = 30   # Score based on events in the last N minutes


def _risk_level(score: float) -> RiskLevel:
    if score <= 30:
        return RiskLevel.SAFE
    elif score <= 60:
        return RiskLevel.MODERATE
    elif score <= 80:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL


def calculate_zone_risk(db: Session, zone_id: str) -> dict:
    """
    Calculate the current risk score for a zone and persist it.
    Returns {"zone_id", "score", "level", "event_counts"}.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOOKBACK_MINUTES)

    events = (
        db.query(Event)
        .filter(
            Event.zone_id == zone_id,
            Event.timestamp >= cutoff,
            Event.status != "RESOLVED",
        )
        .all()
    )

    event_counts: dict[str, int] = {}
    raw_score = 0.0

    for event in events:
        etype = event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type)
        event_counts[etype] = event_counts.get(etype, 0) + 1
        raw_score += WEIGHTS.get(etype, 0) * event.confidence

    # Density factor: +0.5 per event beyond 5
    n = len(events)
    density_factor = max(0, n - 5) * 0.5
    score = min(100.0, raw_score + density_factor)

    level = _risk_level(score)

    # Persist
    rs = RiskScore(zone_id=zone_id, score=round(score, 2), level=level)
    db.add(rs)
    db.commit()
    db.refresh(rs)

    return {
        "zone_id":      zone_id,
        "score":        round(score, 2),
        "level":        level.value,
        "event_counts": event_counts,
        "updated_at":   rs.created_at.isoformat() if rs.created_at else None,
    }


def calculate_all_zones_risk(db: Session) -> list[dict]:
    """Recalculate risk for all zones."""
    zones = db.query(Zone).all()
    return [calculate_zone_risk(db, zone.id) for zone in zones]


def get_latest_zone_risk(db: Session, zone_id: str) -> dict | None:
    """Return the most recent persisted risk score for a zone."""
    rs = (
        db.query(RiskScore)
        .filter(RiskScore.zone_id == zone_id)
        .order_by(RiskScore.created_at.desc())
        .first()
    )
    if not rs:
        return None
    return {
        "zone_id":    zone_id,
        "score":      rs.score,
        "level":      rs.level.value if hasattr(rs.level, "value") else rs.level,
        "updated_at": rs.created_at.isoformat() if rs.created_at else None,
    }
