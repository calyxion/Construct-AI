"""
pose.py — YOLO11-Pose 17-Keypoint Ergonomics, Spine Angle Analysis & Fall Biomechanics.

Phase 2 Module: Monitors hazardous worker postures in real-time:
  - Heavy lifting lumbar strain (spine angle > 45°)
  - Sudden fall trajectory detection from velocity vectors
  - Fatigue posture decay scoring
  - 17-keypoint COCO skeleton overlay
"""

from __future__ import annotations
import math
import numpy as np
from typing import Optional
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# COCO 17-Keypoint Indices
# ---------------------------------------------------------------------------
KP = {
    "NOSE": 0, "L_EYE": 1, "R_EYE": 2, "L_EAR": 3, "R_EAR": 4,
    "L_SHOULDER": 5, "R_SHOULDER": 6,
    "L_ELBOW": 7, "R_ELBOW": 8,
    "L_WRIST": 9, "R_WRIST": 10,
    "L_HIP": 11, "R_HIP": 12,
    "L_KNEE": 13, "R_KNEE": 14,
    "L_ANKLE": 15, "R_ANKLE": 16,
}

# Skeleton connections for drawing
SKELETON = [
    (KP["NOSE"], KP["L_EYE"]), (KP["NOSE"], KP["R_EYE"]),
    (KP["L_EYE"], KP["L_EAR"]), (KP["R_EYE"], KP["R_EAR"]),
    (KP["L_SHOULDER"], KP["R_SHOULDER"]),
    (KP["L_SHOULDER"], KP["L_ELBOW"]), (KP["R_SHOULDER"], KP["R_ELBOW"]),
    (KP["L_ELBOW"], KP["L_WRIST"]), (KP["R_ELBOW"], KP["R_WRIST"]),
    (KP["L_SHOULDER"], KP["L_HIP"]), (KP["R_SHOULDER"], KP["R_HIP"]),
    (KP["L_HIP"], KP["R_HIP"]),
    (KP["L_HIP"], KP["L_KNEE"]), (KP["R_HIP"], KP["R_KNEE"]),
    (KP["L_KNEE"], KP["L_ANKLE"]), (KP["R_KNEE"], KP["R_ANKLE"]),
]

# Ergonomic risk thresholds
LUMBAR_RISK_HIGH  = 45.0   # degrees — hazardous lifting posture
LUMBAR_RISK_WARN  = 30.0   # degrees — warning level
LEAN_FALL_ANGLE   = 50.0   # degrees from vertical — fall trajectory indicator
WRIST_ABOVE_HEAD  = -0.15  # normalized Y — arms raised overhead (fatigue risk)

# ---------------------------------------------------------------------------
# Pose Model Loader
# ---------------------------------------------------------------------------

_pose_model: Optional[YOLO] = None

def load_pose_model(model_path: str = "yolo11n-pose.pt") -> YOLO:
    """Load YOLO11-Pose model. Downloads automatically if not present."""
    global _pose_model
    if _pose_model is None:
        print(f"[POSE] Loading YOLO11-Pose model: {model_path}")
        _pose_model = YOLO(model_path)
        print(f"[POSE] YOLO11-Pose loaded. Device: {_pose_model.device}")
    return _pose_model


# ---------------------------------------------------------------------------
# Keypoint Analysis Functions
# ---------------------------------------------------------------------------

def _kp(keypoints_xy: np.ndarray, conf: np.ndarray, idx: int):
    """Return (x, y) of a keypoint if confidence > 0.3, else None."""
    if conf[idx] < 0.3:
        return None
    return keypoints_xy[idx]


def _angle_3pt(a, b, c) -> float:
    """Angle at point B given three 2D points A-B-C in degrees."""
    if a is None or b is None or c is None:
        return 0.0
    ba = np.array(a) - np.array(b)
    bc = np.array(c) - np.array(b)
    cos_a = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    return float(np.degrees(np.arccos(np.clip(cos_a, -1.0, 1.0))))


def _angle_from_vertical(p1, p2) -> float:
    """Angle of the vector p1→p2 from the vertical (0° = straight up)."""
    if p1 is None or p2 is None:
        return 0.0
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    vertical_angle = math.degrees(math.atan2(abs(dx), abs(dy) + 1e-8))
    return vertical_angle


def analyse_pose(keypoints_xy: np.ndarray, confs: np.ndarray, bbox: list) -> dict:
    """
    Analyse a single person's 17-keypoint pose for ergonomic risk.

    Returns:
        {
            "lumbar_angle": float,          # spine bend angle in degrees
            "lean_angle": float,            # torso lean from vertical
            "arms_overhead": bool,          # wrists above head
            "posture_risk": str,            # "SAFE" | "WARNING" | "HIGH" | "CRITICAL"
            "posture_risk_score": float,    # 0-100 (higher = more dangerous)
            "fall_vector_detected": bool,   # rapid horizontal lean indicating fall
            "ergonomic_flags": list[str],   # list of specific hazard descriptions
        }
    """
    flags = []
    risk_score = 0.0

    # --- Spine / Lumbar Analysis ---
    l_shoulder = _kp(keypoints_xy, confs, KP["L_SHOULDER"])
    r_shoulder = _kp(keypoints_xy, confs, KP["R_SHOULDER"])
    l_hip      = _kp(keypoints_xy, confs, KP["L_HIP"])
    r_hip      = _kp(keypoints_xy, confs, KP["R_HIP"])

    # Midpoints for better spine estimation
    shoulder_mid = None
    hip_mid      = None
    if l_shoulder and r_shoulder:
        shoulder_mid = ((l_shoulder[0]+r_shoulder[0])/2, (l_shoulder[1]+r_shoulder[1])/2)
    elif l_shoulder:
        shoulder_mid = l_shoulder
    elif r_shoulder:
        shoulder_mid = r_shoulder

    if l_hip and r_hip:
        hip_mid = ((l_hip[0]+r_hip[0])/2, (l_hip[1]+r_hip[1])/2)
    elif l_hip:
        hip_mid = l_hip
    elif r_hip:
        hip_mid = r_hip

    lumbar_angle = 0.0
    if shoulder_mid and hip_mid:
        lean_angle = _angle_from_vertical(hip_mid, shoulder_mid)
        lumbar_angle = lean_angle
        if lumbar_angle > LUMBAR_RISK_HIGH:
            flags.append(f"LUMBAR STRAIN: Spine bend {lumbar_angle:.1f}° (HAZARDOUS >{LUMBAR_RISK_HIGH}°)")
            risk_score += 40
        elif lumbar_angle > LUMBAR_RISK_WARN:
            flags.append(f"POSTURE ALERT: Forward lean {lumbar_angle:.1f}° (Monitor)")
            risk_score += 15
    else:
        lean_angle = 0.0

    # --- Fall Vector / Rapid Horizontal Lean ---
    fall_detected = False
    if shoulder_mid and hip_mid:
        # If torso is highly inclined sideways (fallen worker)
        if lean_angle > LEAN_FALL_ANGLE:
            flags.append(f"FALL VECTOR: Torso inclined {lean_angle:.1f}° — possible fall trajectory")
            risk_score += 55
            fall_detected = True

    # Also check via bounding box aspect ratio (width > height = likely fallen)
    if bbox and len(bbox) == 4:
        x1, y1, x2, y2 = bbox
        w = abs(x2 - x1)
        h = abs(y2 - y1)
        if h > 0 and (w / h) > 1.6:
            if not fall_detected:
                flags.append("FALL VECTOR: Horizontal bounding box — worker recumbent posture")
                risk_score += 45
                fall_detected = True

    # --- Arms Overhead (Fatigue / Scaffold Risk) ---
    nose = _kp(keypoints_xy, confs, KP["NOSE"])
    l_wrist = _kp(keypoints_xy, confs, KP["L_WRIST"])
    r_wrist = _kp(keypoints_xy, confs, KP["R_WRIST"])
    arms_overhead = False
    if nose:
        if l_wrist and l_wrist[1] < nose[1]:  # Y decreases upward in image coords
            flags.append("ARMS OVERHEAD: Left arm raised above head — overhead task fatigue risk")
            risk_score += 10
            arms_overhead = True
        if r_wrist and r_wrist[1] < nose[1]:
            flags.append("ARMS OVERHEAD: Right arm raised above head — overhead task fatigue risk")
            risk_score += 10
            arms_overhead = True

    # --- Knee Angle (Crouch / Squat Biomechanics) ---
    l_knee = _kp(keypoints_xy, confs, KP["L_KNEE"])
    l_ankle = _kp(keypoints_xy, confs, KP["L_ANKLE"])
    if l_hip and l_knee and l_ankle:
        knee_angle = _angle_3pt(l_hip, l_knee, l_ankle)
        if knee_angle < 80:  # Deep squat = high knee strain
            flags.append(f"DEEP SQUAT: Knee angle {knee_angle:.1f}° — high knee joint load")
            risk_score += 12

    # --- Derive risk level ---
    risk_score = min(risk_score, 100.0)
    if risk_score >= 65:
        posture_risk = "CRITICAL"
    elif risk_score >= 40:
        posture_risk = "HIGH"
    elif risk_score >= 15:
        posture_risk = "WARNING"
    else:
        posture_risk = "SAFE"

    return {
        "lumbar_angle":        round(lumbar_angle, 2),
        "lean_angle":          round(lean_angle, 2),
        "arms_overhead":       arms_overhead,
        "posture_risk":        posture_risk,
        "posture_risk_score":  round(risk_score, 1),
        "fall_vector_detected": fall_detected,
        "ergonomic_flags":     flags,
    }


# ---------------------------------------------------------------------------
# Full Frame Inference + Overlay
# ---------------------------------------------------------------------------

def run_pose_inference(frame: np.ndarray, model: YOLO, conf_threshold: float = 0.40) -> tuple:
    """
    Run YOLO11-Pose on a single frame. Returns:
        (annotated_frame, pose_results_list)

    pose_results_list: list of dicts per detected person, each containing:
        - "track_id": int | None
        - "bbox": [x1, y1, x2, y2]
        - "confidence": float
        - "keypoints_xy": list of [x, y] pairs (17 keypoints)
        - "analysis": dict from analyse_pose()
    """
    import cv2

    results = model.track(frame, conf=conf_threshold, verbose=False, persist=True)
    pose_results = []

    if results and results[0].keypoints is not None:
        kps_data = results[0].keypoints
        boxes    = results[0].boxes

        for i in range(len(kps_data)):
            try:
                kp_xy   = kps_data.xy[i].cpu().numpy()    # (17, 2)
                kp_conf = kps_data.conf[i].cpu().numpy()  # (17,)
                box     = boxes[i]
                bbox    = box.xyxy[0].cpu().numpy().tolist()
                confidence = float(box.conf[0])
                track_id   = int(box.id[0]) if box.id is not None else None

                analysis = analyse_pose(kp_xy, kp_conf, bbox)

                pose_results.append({
                    "track_id":    track_id,
                    "bbox":        bbox,
                    "confidence":  round(confidence, 3),
                    "keypoints_xy": kp_xy.tolist(),
                    "keypoint_conf": kp_conf.tolist(),
                    "analysis":    analysis,
                })

                # Draw skeleton overlay
                annotated = results[0].plot(boxes=True, labels=True)

                # Draw ergonomic risk badge
                x1, y1 = int(bbox[0]), int(bbox[1])
                risk = analysis["posture_risk"]
                COLOR_MAP = {
                    "CRITICAL": (0, 0, 255),
                    "HIGH":     (0, 100, 255),
                    "WARNING":  (0, 200, 255),
                    "SAFE":     (0, 220, 80),
                }
                color = COLOR_MAP.get(risk, (200, 200, 200))
                badge_text = f"[POSE-{risk}] {analysis['lumbar_angle']:.0f}deg"
                cv2.putText(annotated, badge_text, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            except Exception as e:
                continue

    else:
        annotated = frame.copy()

    return annotated if results else frame, pose_results


# ---------------------------------------------------------------------------
# Aggregate Stats
# ---------------------------------------------------------------------------

def aggregate_pose_stats(pose_results: list) -> dict:
    """Compute aggregate ergonomic statistics from all workers in a frame."""
    if not pose_results:
        return {
            "total_workers": 0,
            "critical_posture_count": 0,
            "fall_detected_count": 0,
            "avg_lumbar_angle": 0.0,
            "overhead_workers": 0,
        }

    critical = sum(1 for p in pose_results if p["analysis"]["posture_risk"] == "CRITICAL")
    falls    = sum(1 for p in pose_results if p["analysis"]["fall_vector_detected"])
    avg_lumb = sum(p["analysis"]["lumbar_angle"] for p in pose_results) / len(pose_results)
    overhead = sum(1 for p in pose_results if p["analysis"]["arms_overhead"])

    return {
        "total_workers":         len(pose_results),
        "critical_posture_count": critical,
        "fall_detected_count":   falls,
        "avg_lumbar_angle":      round(avg_lumb, 2),
        "overhead_workers":      overhead,
    }
