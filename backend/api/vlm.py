"""
api/vlm.py — VLM Incident Explainer Endpoint.

Phase 2 API: Accepts an event type + optional image, returns a rich
natural language safety incident explanation using Moondream2 VLM
or rule-based fallback.
"""

from __future__ import annotations
import base64, sys, os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import numpy as np

router = APIRouter()

# Ensure AI module is importable
_ai_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ai")
if _ai_dir not in sys.path:
    sys.path.insert(0, os.path.abspath(_ai_dir))


class VLMExplainRequest(BaseModel):
    event_type:    str                  # e.g. "NO_HELMET", "POSSIBLE_FALL"
    image_base64:  Optional[str] = None # base64-encoded frame snapshot
    worker_id:     Optional[str] = None
    zone:          Optional[str] = None
    confidence:    float = 0.9
    timestamp:     Optional[str] = None
    pose_data:     Optional[dict] = None  # from pose analysis if available


@router.post("/vlm/explain")
async def explain_incident(request: VLMExplainRequest):
    """
    Generate a rich natural language explanation for a safety incident.
    Uses Moondream2 VLM if image provided and model loaded, else rule-based.
    """
    from vlm_explainer import generate_vlm_explanation, generate_rule_based_explanation

    frame = None
    if request.image_base64:
        try:
            import cv2
            img_bytes = base64.b64decode(request.image_base64)
            arr = np.frombuffer(img_bytes, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception:
            frame = None

    try:
        if frame is not None:
            result = generate_vlm_explanation(
                frame       = frame,
                event_type  = request.event_type.upper(),
                worker_id   = request.worker_id,
                zone        = request.zone,
                confidence  = request.confidence,
                pose_data   = request.pose_data,
                timestamp   = request.timestamp,
            )
        else:
            result = generate_rule_based_explanation(
                event_type  = request.event_type.upper(),
                worker_id   = request.worker_id,
                zone        = request.zone,
                confidence  = request.confidence,
                pose_data   = request.pose_data,
                timestamp   = request.timestamp,
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VLM explanation error: {str(e)}")


@router.post("/vlm/explain-upload")
async def explain_incident_from_upload(
    event_type: str,
    worker_id: Optional[str] = None,
    zone: Optional[str] = None,
    file: UploadFile = File(None),
):
    """Upload image file + event type for VLM explanation."""
    from vlm_explainer import generate_vlm_explanation, generate_rule_based_explanation

    frame = None
    if file:
        import cv2
        contents = await file.read()
        arr = np.frombuffer(contents, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    try:
        if frame is not None:
            result = generate_vlm_explanation(frame, event_type.upper(), worker_id, zone)
        else:
            result = generate_rule_based_explanation(event_type.upper(), worker_id, zone)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vlm/explain-text/{event_type}")
def explain_event_type_text(event_type: str, worker_id: Optional[str] = None, zone: Optional[str] = None):
    """
    GET endpoint: Return full structured explanation for an event type.
    No image required — pure rule-based (instant response).
    """
    from vlm_explainer import generate_rule_based_explanation
    try:
        return generate_rule_based_explanation(
            event_type = event_type.upper(),
            worker_id  = worker_id,
            zone       = zone,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/vlm/model-status")
def get_vlm_model_status():
    """Check if Moondream2 VLM is loaded and available."""
    from vlm_explainer import _vlm_loaded, _vlm_model
    return {
        "vlm_loaded":  _vlm_loaded,
        "vlm_available": _vlm_model is not None,
        "model":       "vikhyatk/moondream2" if _vlm_model else None,
        "fallback":    "rule_based_explainer",
        "supported_events": [
            "NO_HELMET", "NO_VEST", "RESTRICTED_ENTRY",
            "POSSIBLE_FALL", "MACHINERY_PROXIMITY", "ERGONOMIC_RISK"
        ],
    }
