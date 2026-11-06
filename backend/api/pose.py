"""
api/pose.py — YOLO11-Pose Ergonomics Analysis Endpoint.

Phase 2 API: Accepts image upload or camera frame snapshot,
runs YOLO11-Pose 17-keypoint inference, returns ergonomic risk analysis.
"""

from __future__ import annotations
import io, base64
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np

router = APIRouter()

# Lazy load pose model
_pose_model = None

def _get_pose_model():
    global _pose_model
    if _pose_model is None:
        import sys, os
        ai_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ai")
        if ai_dir not in sys.path:
            sys.path.insert(0, os.path.abspath(ai_dir))
        from pose import load_pose_model
        _pose_model = load_pose_model("yolo11n-pose.pt")
    return _pose_model


class PoseAnalysisRequest(BaseModel):
    image_base64: str           # base64-encoded JPEG/PNG
    camera_id: Optional[str] = "CAM-01"
    worker_id: Optional[str] = None
    zone_id:   Optional[str] = None


@router.post("/pose/analyse")
async def analyse_pose_from_image(request: PoseAnalysisRequest):
    """
    Run YOLO11-Pose analysis on a base64 image.
    Returns per-worker ergonomic risk analysis with 17-keypoint data.
    """
    import cv2, sys, os
    ai_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ai")
    if ai_dir not in sys.path:
        sys.path.insert(0, os.path.abspath(ai_dir))
    from pose import run_pose_inference, aggregate_pose_stats

    try:
        img_bytes = base64.b64decode(request.image_base64)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode error: {e}")

    try:
        model = _get_pose_model()
        annotated_frame, pose_results = run_pose_inference(frame, model)
        stats = aggregate_pose_stats(pose_results)

        # Encode annotated frame
        _, buf = cv2.imencode(".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        annotated_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

        # Determine overall posture risk
        risk_levels = {"SAFE": 0, "WARNING": 1, "HIGH": 2, "CRITICAL": 3}
        overall_risk = "SAFE"
        for pr in pose_results:
            if risk_levels.get(pr["analysis"]["posture_risk"], 0) > risk_levels.get(overall_risk, 0):
                overall_risk = pr["analysis"]["posture_risk"]

        return {
            "camera_id":        request.camera_id,
            "zone_id":          request.zone_id,
            "total_workers":    len(pose_results),
            "overall_risk":     overall_risk,
            "stats":            stats,
            "workers":          [
                {
                    "track_id":   p.get("track_id"),
                    "bbox":       p["bbox"],
                    "confidence": p["confidence"],
                    "analysis":   p["analysis"],
                }
                for p in pose_results
            ],
            "annotated_image_base64": annotated_b64,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pose inference error: {str(e)}")


@router.post("/pose/analyse-upload")
async def analyse_pose_from_upload(file: UploadFile = File(...)):
    """
    Upload an image file directly for pose analysis.
    """
    import cv2, sys, os
    ai_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ai")
    if ai_dir not in sys.path:
        sys.path.insert(0, os.path.abspath(ai_dir))
    from pose import run_pose_inference, aggregate_pose_stats

    contents = await file.read()
    arr = np.frombuffer(contents, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Cannot decode uploaded image")

    try:
        model = _get_pose_model()
        annotated_frame, pose_results = run_pose_inference(frame, model)
        stats = aggregate_pose_stats(pose_results)

        _, buf = cv2.imencode(".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        annotated_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

        return {
            "filename":       file.filename,
            "total_workers":  len(pose_results),
            "stats":          stats,
            "workers":        pose_results,
            "annotated_image_base64": annotated_b64,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pose inference error: {str(e)}")


@router.get("/pose/model-info")
def get_pose_model_info():
    """Return info about the loaded YOLO11-Pose model."""
    return {
        "model": "YOLO11n-Pose",
        "keypoints": 17,
        "skeleton": "COCO 17-keypoint",
        "capabilities": [
            "Spine / lumbar angle measurement",
            "Fall vector biomechanics detection",
            "Arms overhead fatigue risk",
            "Knee angle squat analysis",
            "Worker count and track ID",
        ],
        "risk_levels": ["SAFE", "WARNING", "HIGH", "CRITICAL"],
        "thresholds": {
            "lumbar_strain_degrees": 45,
            "fall_lean_angle_degrees": 50,
            "deep_squat_degrees": 80,
        }
    }
