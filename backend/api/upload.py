"""
api/upload.py — Image and Video Upload & AI Safety Analysis Endpoint.
"""

import os
import sys
import base64
import uuid
import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, UploadFile, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..database.models import Event, Worker, Camera, Zone
from ..websocket.events import manager

# Add AI module directory to sys.path
ai_dir = Path(__file__).resolve().parent.parent.parent / "ai"
if str(ai_dir) not in sys.path:
    sys.path.insert(0, str(ai_dir))

try:
    from detection import load_model, run_inference, draw_detections, analyse_ppe_compliance
    from zones import ZoneRegistry, draw_zones
except ImportError as e:
    print(f"[Upload API] Warning importing AI module: {e}")
    load_model = None

router = APIRouter()

_detector_instance = None

def get_detector():
    global _detector_instance
    if _detector_instance is None and load_model is not None:
        try:
            _detector_instance = load_model()
        except Exception as e:
            print(f"[Upload API] Error loading model: {e}")
    return _detector_instance


@router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    camera_id: str = Form("UPLOAD-CAM"),
    zone_id: str = Form("ZONE-A"),
    record_events: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Receives an uploaded site photo, runs full YOLOv8 + PPE neural analysis,
    draws color-coded bounding boxes, and returns complete safety compliance data.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image file uploaded")

    # Decode image from buffer
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image format or corrupted file")

    h, w = img.shape[:2]

    detector = get_detector()
    if detector is None:
        raise HTTPException(status_code=500, detail="AI Detection Model not initialized")

    # Run AI inference
    detections = run_inference(detector, img, conf_threshold=0.30)
    violations = analyse_ppe_compliance(detections)

    # Check Shapely danger zones
    zone_registry = ZoneRegistry()
    zone_violations = []
    for d in detections:
        if d["label"] == "person":
            zv = zone_registry.check_restricted_entry(d["center"], camera_id=camera_id)
            if zv:
                zone_violations.append(zv)

    # Annotated image drawing
    annotated = draw_zones(img.copy(), zone_registry.all_zones())
    annotated = draw_detections(annotated, detections)

    # Convert annotated image to base64
    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    b64_image = f"data:image/jpeg;base64,{base64.b64encode(buf.tobytes()).decode('utf-8')}"

    # Save snapshot to disk
    snapshots_dir = Path(__file__).resolve().parent.parent.parent / "screenshots" / "snapshots"
    snapshots_dir.mkdir(parents=True, exist_ok=True)
    ts_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_filename = f"UPLOAD_{ts_str}_{uuid.uuid4().hex[:6]}.jpg"
    snapshot_path = snapshots_dir / snapshot_filename
    cv2.imwrite(str(snapshot_path), annotated)

    # Tally metrics
    workers_count = len([d for d in detections if d["label"] == "person"])
    helmets_count = len([d for d in detections if d["label"] == "helmet"])
    vests_count = len([d for d in detections if d["label"] == "safety-vest"])
    is_compliant = len(violations) == 0 and len(zone_violations) == 0

    # Safety Score calculation for this frame
    safety_score = 100
    if workers_count > 0:
        penalty = (len(violations) * 20) + (len(zone_violations) * 30)
        safety_score = max(0, 100 - penalty)

    # Record to DB and push via WebSocket if requested
    if record_events and (violations or zone_violations):
        for v in violations:
            evt_id = f"EVT-{uuid.uuid4().hex[:8]}"
            evt = Event(
                id=evt_id,
                event_type=v["violation"],
                severity="HIGH" if v["violation"] == "NO_HELMET" else "MEDIUM",
                confidence=v.get("confidence", 0.90),
                camera_id=camera_id,
                worker_id="UPLOADED-WORKER",
                zone_id=zone_id,
                snapshot_path=f"/snapshots/{snapshot_filename}",
                status="OPEN",
                timestamp=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(evt)
            try:
                db.commit()
                await manager.broadcast({
                    "type": "NEW_EVENT",
                    "event": {
                        "id": evt.id,
                        "event_type": evt.event_type,
                        "severity": evt.severity,
                        "confidence": evt.confidence,
                        "camera_id": evt.camera_id,
                        "worker_id": evt.worker_id,
                        "zone_id": evt.zone_id,
                        "snapshot_path": evt.snapshot_path,
                        "status": evt.status,
                        "timestamp": evt.timestamp.isoformat()
                    }
                })
            except Exception:
                db.rollback()

    return {
        "success": True,
        "filename": file.filename,
        "resolution": {"width": w, "height": h},
        "workers_count": workers_count,
        "helmets_count": helmets_count,
        "vests_count": vests_count,
        "is_compliant": is_compliant,
        "safety_score": safety_score,
        "detections": detections,
        "violations": violations,
        "zone_violations": zone_violations,
        "annotated_image": b64_image,
        "snapshot_url": f"/snapshots/{snapshot_filename}",
        "timestamp": datetime.datetime.now().isoformat()
    }


@router.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
):
    """Save an uploaded site video file for testing & playback."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty video file uploaded")

    videos_dir = Path(__file__).resolve().parent.parent.parent / "data" / "demo-videos"
    videos_dir.mkdir(parents=True, exist_ok=True)

    dest_path = videos_dir / file.filename
    with open(dest_path, "wb") as f:
        f.write(contents)

    return {
        "success": True,
        "filename": file.filename,
        "saved_path": str(dest_path),
        "size_bytes": len(contents),
        "message": f"Video {file.filename} uploaded successfully. Ready for AI inspection."
    }
