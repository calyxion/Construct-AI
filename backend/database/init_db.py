"""
database/init_db.py — Database initialisation and session factory.
"""

import os
import json
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .models import Base, Worker, Camera, Zone, ZoneType

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./constructai.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: yield a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables and seed initial data if empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_cameras(db)
        _seed_workers(db)
        _seed_zones(db)
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def _seed_cameras(db: Session):
    existing = db.query(Camera).count()
    if existing > 0:
        return
    cameras = [
        Camera(id="CAM-01", name="Main Gate Camera",     location="Gate A", status="ONLINE"),
        Camera(id="CAM-02", name="Machinery Zone Camera", location="East Wing", status="ONLINE"),
        Camera(id="CAM-03", name="Scaffold Camera",       location="Level 3", status="ONLINE"),
    ]
    db.add_all(cameras)


def _seed_workers(db: Session):
    existing = db.query(Worker).count()
    if existing > 0:
        return
    workers = [Worker(id=f"W-{i:02d}", name=f"Worker {i}", status="ACTIVE") for i in range(1, 16)]
    db.add_all(workers)


def _seed_zones(db: Session):
    existing = db.query(Zone).count()
    if existing > 0:
        return
    zones = [
        Zone(
            id="ZONE-A",
            name="Main Work Area",
            zone_type=ZoneType.NORMAL,
            polygon=[[50,50],[590,50],[590,350],[50,350]],
            camera_id="CAM-01",
        ),
        Zone(
            id="ZONE-B",
            name="Restricted Machinery Zone",
            zone_type=ZoneType.RESTRICTED,
            polygon=[[300,200],[590,200],[590,430],[300,430]],
            camera_id="CAM-02",
        ),
        Zone(
            id="ZONE-C",
            name="Scaffold / High-Risk Area",
            zone_type=ZoneType.RESTRICTED,
            polygon=[[0,0],[200,0],[200,200],[0,200]],
            camera_id="CAM-03",
        ),
    ]
    db.add_all(zones)
