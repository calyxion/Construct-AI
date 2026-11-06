"""
database/models.py — SQLAlchemy ORM models for CONSTRUCTAI backend.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, Text, JSON,
    ForeignKey, Enum as SAEnum, func
)
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EventType(str, enum.Enum):
    NO_HELMET           = "NO_HELMET"
    NO_VEST             = "NO_VEST"
    RESTRICTED_ENTRY    = "RESTRICTED_ENTRY"
    POSSIBLE_FALL       = "POSSIBLE_FALL"
    MACHINERY_PROXIMITY = "MACHINERY_PROXIMITY"


class Severity(str, enum.Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class EventStatus(str, enum.Enum):
    OPEN         = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED     = "RESOLVED"


class ZoneType(str, enum.Enum):
    NORMAL     = "NORMAL"
    RESTRICTED = "RESTRICTED"
    MACHINERY  = "MACHINERY"


class RiskLevel(str, enum.Enum):
    SAFE     = "SAFE"
    MODERATE = "MODERATE"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------

class Worker(Base):
    __tablename__ = "workers"

    id     = Column(String, primary_key=True)          # e.g. "W-01"
    name   = Column(String, nullable=False, default="Unknown")
    status = Column(String, default="ACTIVE")          # ACTIVE | INACTIVE
    created_at = Column(DateTime, default=func.now())

    events = relationship("Event", back_populates="worker", lazy="dynamic")


class Camera(Base):
    __tablename__ = "cameras"

    id       = Column(String, primary_key=True)        # e.g. "CAM-01"
    name     = Column(String, nullable=False)
    location = Column(String, default="")
    status   = Column(String, default="ONLINE")        # ONLINE | OFFLINE

    events = relationship("Event", back_populates="camera", lazy="dynamic")


class Zone(Base):
    __tablename__ = "zones"

    id         = Column(String, primary_key=True)      # e.g. "ZONE-A"
    name       = Column(String, nullable=False)
    zone_type  = Column(SAEnum(ZoneType), default=ZoneType.NORMAL)
    polygon    = Column(JSON, default=list)            # [[x,y], ...]
    camera_id  = Column(String, ForeignKey("cameras.id"), nullable=True)

    events      = relationship("Event", back_populates="zone", lazy="dynamic")
    risk_scores = relationship("RiskScore", back_populates="zone", lazy="dynamic")


class Event(Base):
    __tablename__ = "events"

    id            = Column(String, primary_key=True)   # UUID4
    event_type    = Column(SAEnum(EventType), nullable=False)
    severity      = Column(SAEnum(Severity), nullable=False)
    confidence    = Column(Float, nullable=False)
    camera_id     = Column(String, ForeignKey("cameras.id"), nullable=True)
    worker_id     = Column(String, ForeignKey("workers.id"), nullable=True)
    zone_id       = Column(String, ForeignKey("zones.id"), nullable=True)
    snapshot_path = Column(String, nullable=True)
    status        = Column(SAEnum(EventStatus), default=EventStatus.OPEN)
    timestamp     = Column(DateTime, default=func.now())
    extra_data    = Column(JSON, default=dict)

    worker = relationship("Worker", back_populates="events")
    camera = relationship("Camera", back_populates="events")
    zone   = relationship("Zone", back_populates="events")


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    zone_id    = Column(String, ForeignKey("zones.id"), nullable=False)
    score      = Column(Float, nullable=False)          # 0–100
    level      = Column(SAEnum(RiskLevel), nullable=False)
    created_at = Column(DateTime, default=func.now())

    zone = relationship("Zone", back_populates="risk_scores")
