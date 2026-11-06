"""
api/zones.py — /api/zones endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..database.models import Zone
from ..services.risk_scoring import calculate_zone_risk, get_latest_zone_risk, calculate_all_zones_risk

router = APIRouter()


@router.get("/zones")
def list_zones(db: Session = Depends(get_db)):
    """List all zones with their latest risk scores."""
    zones = db.query(Zone).all()
    results = []
    for zone in zones:
        risk = get_latest_zone_risk(db, zone.id)
        results.append({
            "id":        zone.id,
            "name":      zone.name,
            "zone_type": zone.zone_type.value if hasattr(zone.zone_type, "value") else zone.zone_type,
            "polygon":   zone.polygon,
            "camera_id": zone.camera_id,
            "risk":      risk,
        })
    return results


@router.get("/zones/{zone_id}")
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    risk = get_latest_zone_risk(db, zone.id)
    return {
        "id":        zone.id,
        "name":      zone.name,
        "zone_type": zone.zone_type.value if hasattr(zone.zone_type, "value") else zone.zone_type,
        "polygon":   zone.polygon,
        "camera_id": zone.camera_id,
        "risk":      risk,
    }


@router.get("/zones/{zone_id}/risk")
def get_zone_risk(zone_id: str, recalculate: bool = False, db: Session = Depends(get_db)):
    """Get risk score for a zone. Pass ?recalculate=true to force recalculation."""
    if recalculate:
        return calculate_zone_risk(db, zone_id)
    risk = get_latest_zone_risk(db, zone_id)
    if not risk:
        return calculate_zone_risk(db, zone_id)
    return risk


@router.post("/zones/recalculate")
def recalculate_all(db: Session = Depends(get_db)):
    """Force-recalculate risk scores for all zones."""
    return calculate_all_zones_risk(db)
