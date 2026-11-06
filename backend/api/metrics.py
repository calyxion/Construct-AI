"""
api/metrics.py — /api/metrics KPI snapshot endpoint.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..database.models import Event, Worker, EventType, EventStatus

router = APIRouter()

LOOKBACK_HOURS = 24


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    """
    Returns a KPI snapshot:
    {
        workers:         int,
        active_workers:  int,
        ppe_compliance:  float (0–100),
        active_alerts:   int,
        high_risk_zones: int,
        safety_score:    float (0–100),
        total_events_today: int,
        events_by_type:  dict,
        events_by_severity: dict,
    }
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HOURS)

    total_workers  = db.query(Worker).count()
    active_workers = db.query(Worker).filter(Worker.status == "ACTIVE").count()

    # Events in last 24h
    recent_events = (
        db.query(Event)
        .filter(Event.timestamp >= cutoff)
        .all()
    )

    total_events  = len(recent_events)
    active_alerts = sum(
        1 for e in recent_events
        if (e.status.value if hasattr(e.status, "value") else e.status) == "OPEN"
    )

    # PPE compliance: workers who had a PPE event / total active workers
    ppe_event_types = {"NO_HELMET", "NO_VEST"}
    ppe_violations = sum(
        1 for e in recent_events
        if (e.event_type.value if hasattr(e.event_type, "value") else e.event_type) in ppe_event_types
    )
    ppe_compliance = max(0.0, 100.0 - (ppe_violations / max(1, active_workers)) * 10)
    ppe_compliance = min(100.0, ppe_compliance)

    # Events by type
    events_by_type: dict[str, int] = {}
    events_by_severity: dict[str, int] = {}
    for e in recent_events:
        etype = e.event_type.value if hasattr(e.event_type, "value") else e.event_type
        esev  = e.severity.value   if hasattr(e.severity,   "value") else e.severity
        events_by_type[etype]     = events_by_type.get(etype, 0) + 1
        events_by_severity[esev] = events_by_severity.get(esev, 0) + 1

    # High-risk zones (count of zones with at least 1 CRITICAL/HIGH event)
    from ..database.models import RiskScore, RiskLevel
    high_risk_zones = (
        db.query(func.count(func.distinct(RiskScore.zone_id)))
        .filter(RiskScore.level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL]))
        .scalar() or 0
    )

    # Overall safety score (inverse of normalised violation count)
    safety_score = max(0.0, 100.0 - min(100.0, total_events * 2))

    return {
        "workers":              total_workers,
        "active_workers":       active_workers,
        "ppe_compliance":       round(ppe_compliance, 1),
        "active_alerts":        active_alerts,
        "high_risk_zones":      high_risk_zones,
        "safety_score":         round(safety_score, 1),
        "total_events_today":   total_events,
        "events_by_type":       events_by_type,
        "events_by_severity":   events_by_severity,
    }
