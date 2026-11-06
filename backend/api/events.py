"""
api/events.py â€” /api/events REST endpoint + /ws/events WebSocket.
"""

from __future__ import annotations
import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..database.models import Event, EventType, Severity, EventStatus, Worker, Camera, Zone
from ..websocket.events import manager
from ..services.risk_scoring import calculate_zone_risk

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class EventIn(BaseModel):
    event_id:      Optional[str] = None
    event_type:    str
    severity:      Optional[str] = None
    confidence:    float = Field(..., ge=0, le=1)
    camera_id:     str = "CAM-01"
    worker_id:     Optional[str] = None
    zone_id:       Optional[str] = "UNKNOWN"
    snapshot_path: Optional[str] = None
    status:        Optional[str] = "OPEN"
    timestamp:     Optional[str] = None
    aspect_ratio:  Optional[float] = None

    class Config:
        extra = "allow"


class EventOut(BaseModel):
    id:            str
    event_type:    str
    severity:      str
    confidence:    float
    camera_id:     Optional[str]
    worker_id:     Optional[str]
    zone_id:       Optional[str]
    snapshot_path: Optional[str]
    status:        str
    timestamp:     Optional[str]

    class Config:
        from_attributes = True


class EventStatusUpdate(BaseModel):
    status: str  # OPEN | ACKNOWLEDGED | RESOLVED


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/events", status_code=201)
async def create_event(payload: EventIn, db: Session = Depends(get_db)):
    """Receive a safety event from the AI module, persist it, and broadcast via WS."""

    # Ensure worker / camera / zone exist (create if missing)
    _ensure_worker(db, payload.worker_id)
    _ensure_camera(db, payload.camera_id)
    _ensure_zone(db, payload.zone_id)

    event_id = payload.event_id or _new_uuid()
    severity  = payload.severity or _severity_for(payload.event_type)

    ts = None
    if payload.timestamp:
        try:
            ts = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
        except ValueError:
            ts = datetime.now(timezone.utc)
    else:
        ts = datetime.now(timezone.utc)

    event = Event(
        id            = event_id,
        event_type    = payload.event_type,
        severity      = severity,
        confidence    = payload.confidence,
        camera_id     = payload.camera_id or None,
        worker_id     = payload.worker_id or None,
        zone_id       = payload.zone_id or None,
        snapshot_path = payload.snapshot_path,
        status        = payload.status or "OPEN",
        timestamp     = ts,
        extra_data    = {},
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Broadcast via WebSocket
    ws_payload = {
        "type": "NEW_EVENT",
        "event": _event_to_dict(event),
    }
    await manager.broadcast(ws_payload)

    # Recalculate risk for the zone asynchronously
    if payload.zone_id and payload.zone_id != "UNKNOWN":
        try:
            risk = calculate_zone_risk(db, payload.zone_id)
            await manager.broadcast({"type": "RISK_UPDATE", "risk": risk})
        except Exception:
            pass

    return _event_to_dict(event)


@router.get("/events", response_model=list[EventOut])
def list_events(
    event_type: Optional[str] = Query(None),
    severity:   Optional[str] = Query(None),
    zone_id:    Optional[str] = Query(None),
    status:     Optional[str] = Query(None),
    limit:      int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    """Return events with optional filters."""
    q = db.query(Event).order_by(Event.timestamp.desc())
    if event_type:
        q = q.filter(Event.event_type == event_type.upper())
    if severity:
        q = q.filter(Event.severity == severity.upper())
    if zone_id:
        q = q.filter(Event.zone_id == zone_id)
    if status:
        q = q.filter(Event.status == status.upper())
    events = q.limit(limit).all()
    return [_event_to_dict(e) for e in events]


@router.get("/events/{event_id}")
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_to_dict(event)


@router.patch("/events/{event_id}/status")
async def update_event_status(
    event_id: str,
    body: EventStatusUpdate,
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = body.status.upper()
    db.commit()
    db.refresh(event)
    await manager.broadcast({"type": "EVENT_UPDATED", "event": _event_to_dict(event)})
    return _event_to_dict(event)


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@router.get("/events/export/csv")
def export_events_csv(
    status: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Export all events as a downloadable CSV file."""
    import csv, io
    from fastapi.responses import StreamingResponse

    q = db.query(Event).order_by(Event.timestamp.desc())
    if status:
        q = q.filter(Event.status == status.upper())
    if zone_id:
        q = q.filter(Event.zone_id == zone_id)
    events = q.limit(5000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Event Type", "Severity", "Status", "Worker ID", "Zone", "Camera", "Confidence", "Timestamp"])
    for e in events:
        writer.writerow([
            e.id,
            e.event_type.value if hasattr(e.event_type, "value") else e.event_type,
            e.severity.value if hasattr(e.severity, "value") else e.severity,
            e.status.value if hasattr(e.status, "value") else e.status,
            e.worker_id or "",
            e.zone_id or "",
            e.camera_id or "",
            f"{e.confidence:.2f}",
            e.timestamp.isoformat() if e.timestamp else "",
        ])

    output.seek(0)
    filename = f"constructai_incidents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


class BulkStatusUpdate(BaseModel):
    event_ids: list[str]
    status: str


@router.patch("/events/bulk/status")
async def bulk_update_event_status(body: BulkStatusUpdate, db: Session = Depends(get_db)):
    """Bulk update status on multiple events (e.g. bulk resolve)."""
    updated = []
    for eid in body.event_ids:
        event = db.query(Event).filter(Event.id == eid).first()
        if event:
            event.status = body.status.upper()
            updated.append(eid)
    db.commit()
    await manager.broadcast({"type": "BULK_UPDATE", "updated_ids": updated, "new_status": body.status.upper()})
    return {"updated": len(updated), "ids": updated}

@router.websocket("/ws/events")
async def websocket_events(ws: WebSocket):
    # Accept from any origin (local prototype)
    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive; clients may send pings
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Send ping to keep alive
                try:
                    await ws.send_text('{"type":"ping"}')
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(ws)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _event_to_dict(event: Event) -> dict:
    return {
        "id":            event.id,
        "event_type":    event.event_type.value if hasattr(event.event_type, "value") else event.event_type,
        "severity":      event.severity.value   if hasattr(event.severity,   "value") else event.severity,
        "confidence":    event.confidence,
        "camera_id":     event.camera_id,
        "worker_id":     event.worker_id,
        "zone_id":       event.zone_id,
        "snapshot_path": event.snapshot_path,
        "status":        event.status.value if hasattr(event.status, "value") else event.status,
        "timestamp":     event.timestamp.isoformat() if event.timestamp else None,
    }


_SEVERITY_MAP = {
    "NO_HELMET":            "HIGH",
    "NO_VEST":              "MEDIUM",
    "RESTRICTED_ENTRY":     "CRITICAL",
    "POSSIBLE_FALL":        "CRITICAL",
    "MACHINERY_PROXIMITY":  "HIGH",
}

def _severity_for(event_type: str) -> str:
    return _SEVERITY_MAP.get(event_type.upper(), "MEDIUM")


def _new_uuid() -> str:
    import uuid
    return str(uuid.uuid4())


def _ensure_worker(db: Session, worker_id: Optional[str]):
    if not worker_id:
        return
    if not db.query(Worker).filter(Worker.id == worker_id).first():
        db.add(Worker(id=worker_id, name=f"Worker {worker_id}", status="ACTIVE"))
        db.commit()


def _ensure_camera(db: Session, camera_id: Optional[str]):
    if not camera_id:
        return
    if not db.query(Camera).filter(Camera.id == camera_id).first():
        db.add(Camera(id=camera_id, name=f"Camera {camera_id}", status="ONLINE"))
        db.commit()


def _ensure_zone(db: Session, zone_id: Optional[str]):
    if not zone_id or zone_id == "UNKNOWN":
        return
    if not db.query(Zone).filter(Zone.id == zone_id).first():
        db.add(Zone(id=zone_id, name=zone_id))
        db.commit()

