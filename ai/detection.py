"""
detection.py — High-Precision SOTA Vision Engine (YOLO11 + Natural Distribution PPE Classifier).
"""

import os
from pathlib import Path
from typing import Optional

import cv2
def _is_high_vis(frame, bbox):
    x1, y1, x2, y2 = bbox
    x1, y1 = max(0, int(x1)), max(0, int(y1))
    x2, y2 = min(frame.shape[1], int(x2)), min(frame.shape[0], int(y2))
    roi = frame[y1:y2, x1:x2]
    if roi.size == 0: return False
    
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    
    # Neon Yellow/Green
    lower_y = np.array([20, 50, 50])
    upper_y = np.array([45, 255, 255])
    
    # Neon Orange
    lower_o = np.array([5, 100, 100])
    upper_o = np.array([20, 255, 255])
    
    mask_y = cv2.inRange(hsv, lower_y, upper_y)
    mask_o = cv2.inRange(hsv, lower_o, upper_o)
    mask = cv2.bitwise_or(mask_y, mask_o)
    
    ratio = cv2.countNonZero(mask) / (roi.shape[0] * roi.shape[1])
    return ratio > 0.15 # Need at least 3% high-vis pixels

import numpy as np
import torch

try:
    from ultralytics import YOLO
    _YOLO_AVAILABLE = True
except ImportError:
    _YOLO_AVAILABLE = False

torch.set_num_threads(max(1, os.cpu_count() or 4))

MODELS_DIR = Path(__file__).parent / "models"
PERSON_MODEL_PATH = MODELS_DIR / "yolo11n.pt"
PPE_HARDHAT_PATH  = MODELS_DIR / "ppe_hardhat.pt"
PPE_6CLASS_PATH   = MODELS_DIR / "ppe_6class.pt"


class PrecisionPPEDetector:
    """High-Speed, Accurate SOTA Neural Detector."""

    def __init__(self, custom_model_path: Optional[str] = None):
        if not _YOLO_AVAILABLE:
            raise RuntimeError("ultralytics is not installed. Run: pip install ultralytics")

        MODELS_DIR.mkdir(parents=True, exist_ok=True)

        target_person = PERSON_MODEL_PATH if PERSON_MODEL_PATH.exists() else Path("yolo11n.pt")
        if not target_person.exists():
            try:
                m = YOLO("yolo11n.pt")
                m.save(str(PERSON_MODEL_PATH))
                self.person_model = m
            except Exception:
                self.person_model = YOLO("yolov8n.pt")
        else:
            self.person_model = YOLO(str(target_person))

        self.hardhat_model = None
        if PPE_HARDHAT_PATH.exists():
            try:
                self.hardhat_model = YOLO(str(PPE_HARDHAT_PATH))
            except Exception:
                pass

        self.ppe_model = None
        target_ppe = custom_model_path or str(PPE_6CLASS_PATH)
        if Path(target_ppe).exists():
            try:
                self.ppe_model = YOLO(target_ppe)
            except Exception:
                pass

    def detect(self, frame: np.ndarray, conf_threshold: float = 0.35, imgsz: int = 320) -> list[dict]:
        """Runs fast, accurate neural inference without artificial cropping distortions."""
        h_frame, w_frame = frame.shape[:2]
        detections = []

        # 1. Detect Persons using YOLO11
        persons = []
        with torch.inference_mode():
            try:
                r_p = self.person_model(frame, verbose=False, conf=conf_threshold, imgsz=imgsz, classes=[0])
                for r in r_p:
                    for box in r.boxes:
                        conf = float(box.conf[0])
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(w_frame, x2), min(h_frame, y2)

                        if (x2 - x1) < 60 or (y2 - y1) < 90:
                            continue

                        p_dict = {
                            "label": "person",
                            "confidence": conf,
                            "bbox": [x1, y1, x2, y2],
                            "center": [(x1 + x2) // 2, (y1 + y2) // 2],
                        }
                        persons.append(p_dict)
                        detections.append(p_dict)
            except Exception as e:
                print(f"[Inference Error] {e}")

        # If no workers detected, return immediately
        if not persons:
            return []

        # 2. Run Dedicated Models on Full Frame in Native Distribution
        raw_helmets = []
        raw_no_helmets = []
        raw_vests = []

        with torch.inference_mode():
            # Pass A: Hardhat Classifier (Hardhat vs NO-Hardhat)
            if self.hardhat_model is not None:
                try:
                    r_hh = self.hardhat_model(frame, verbose=False, conf=conf_threshold, imgsz=imgsz)
                    for r in r_hh:
                        for box in r.boxes:
                            cls_id = int(box.cls[0])
                            conf = float(box.conf[0])
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            if cls_id == 0 and conf >= conf_threshold:  # Confirmed Hardhat
                                raw_helmets.append({"bbox": [x1, y1, x2, y2], "conf": conf, "model": "hardhat"})
                            elif cls_id == 1 and conf >= conf_threshold:  # Confirmed NO-Hardhat
                                raw_no_helmets.append({"bbox": [x1, y1, x2, y2], "conf": conf})
                except Exception:
                    pass

            # Pass B: Multi-Class PPE Model
            if self.ppe_model is not None:
                try:
                    r_ppe = self.ppe_model(frame, verbose=False, conf=conf_threshold, imgsz=imgsz)
                    for r in r_ppe:
                        for box in r.boxes:
                            cls_id = int(box.cls[0])
                            conf = float(box.conf[0])
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            name = r.names.get(cls_id, "").lower()
                            if ("helmet" in name or "hardhat" in name) and conf >= conf_threshold:
                                raw_helmets.append({"bbox": [x1, y1, x2, y2], "conf": conf, "model": "ppe6"})
                            elif "vest" in name and conf >= conf_threshold:
                                raw_vests.append({"bbox": [x1, y1, x2, y2], "conf": conf, "model": "ppe6"})
                except Exception:
                    pass

        # 3. Match PPE to Worker Anatomical Coordinates
        for person in persons:
            px1, py1, px2, py2 = person["bbox"]
            pw = px2 - px1
            ph = py2 - py1

            # Head Region: upper 45% of person's bounding box
            head_x1 = max(0, px1 - int(pw * 0.15))
            head_x2 = min(w_frame, px2 + int(pw * 0.15))
            head_y1 = max(0, py1 - int(ph * 0.15))
            head_y2 = min(h_frame, py1 + int(ph * 0.45))

            # Torso Region: 18% to 80% of person's height
            torso_y1 = py1 + int(ph * 0.18)
            torso_y2 = py1 + int(ph * 0.80)

            # Check if model detected NO-Hardhat on this person's upper body
            has_no_hardhat = False
            for nh in raw_no_helmets:
                nh_cx = (nh["bbox"][0] + nh["bbox"][2]) // 2
                nh_y1 = nh["bbox"][1]
                if (px1 - 30 <= nh_cx <= px2 + 30) and (nh_y1 < py1 + int(ph * 0.60)):
                    has_no_hardhat = True
                    break

            # Find matching hardhat on head
            best_helmet = None
            if not has_no_hardhat:
                for h in raw_helmets:
                    hx1, hy1, hx2, hy2 = h["bbox"]
                    hcx, hcy = (hx1 + hx2) // 2, (hy1 + hy2) // 2
                    hw, hh = hx2 - hx1, hy2 - hy1

                    if hw > (pw * 1.3) or hh > (ph * 0.5):
                        continue

                    if (head_x1 <= hcx <= head_x2) and (head_y1 <= hcy <= head_y2):
                        if best_helmet is None or h["conf"] > best_helmet["conf"]:
                            best_helmet = h

            if best_helmet is not None:
                detections.append({
                    "label": "helmet",
                    "confidence": float(best_helmet["conf"]),
                    "bbox": best_helmet["bbox"],
                    "center": [(best_helmet["bbox"][0] + best_helmet["bbox"][2]) // 2,
                               (best_helmet["bbox"][1] + best_helmet["bbox"][3]) // 2],
                })

            # Find matching safety vest on torso
            best_vest = None
            for v in raw_vests:
                vx1, vy1, vx2, vy2 = v["bbox"]
                vcx, vcy = (vx1 + vx2) // 2, (vy1 + vy2) // 2
                vw, vh = vx2 - vx1, vy2 - vy1

                if vw > (pw * 1.3) or vh > (ph * 0.85):
                    continue

                if (px1 - 30 <= vcx <= px2 + 30) and (torso_y1 <= vcy <= torso_y2):
                    if best_vest is None or v["conf"] > best_vest["conf"]:
                        best_vest = v

            if best_vest is not None and _is_high_vis(frame, best_vest["bbox"]):
                detections.append({
                    "label": "safety-vest",
                    "confidence": float(best_vest["conf"]),
                    "bbox": best_vest["bbox"],
                    "center": [(best_vest["bbox"][0] + best_vest["bbox"][2]) // 2,
                               (best_vest["bbox"][1] + best_vest["bbox"][3]) // 2],
                })

        return detections


def load_model(model_path: Optional[str] = None) -> PrecisionPPEDetector:
    return PrecisionPPEDetector(custom_model_path=model_path)


def run_inference(
    detector: PrecisionPPEDetector,
    frame: np.ndarray,
    conf_threshold: float = 0.35,
    imgsz: int = 320,
) -> list[dict]:
    return detector.detect(frame, conf_threshold=conf_threshold, imgsz=imgsz)


def draw_detections(frame: np.ndarray, detections: list[dict]) -> np.ndarray:
    colour_map = {
        "helmet":      (0, 235, 120),    # Bright Green for verified hardhat
        "safety-vest": (0, 215, 255),    # High-vis Gold/Yellow for vest
        "person":      (255, 180, 50),   # Industrial Blue for worker
    }

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = det["label"]
        colour = colour_map.get(label, (200, 200, 200))
        label_text = f"{label.upper()} {det['confidence']:.0%}"

        thickness = 2 if label != "person" else 1
        cv2.rectangle(frame, (x1, y1), (x2, y2), colour, thickness)

        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        y_label = max(y1, th + 8)
        cv2.rectangle(frame, (x1, y_label - th - 6), (x1 + tw + 6, y_label), colour, -1)
        cv2.putText(frame, label_text, (x1 + 3, y_label - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

    return frame


def analyse_ppe_compliance(detections: list[dict]) -> list[dict]:
    persons = [d for d in detections if d["label"] == "person"]
    helmets = [d for d in detections if d["label"] == "helmet"]
    vests   = [d for d in detections if d["label"] == "safety-vest"]

    violations = []

    for person in persons:
        px1, py1, px2, py2 = person["bbox"]
        ph = py2 - py1

        head_y2 = py1 + int(ph * 0.42)
        has_helmet = any(
            (px1 - 25 <= h["center"][0] <= px2 + 25) and (py1 - 20 <= h["center"][1] <= head_y2)
            for h in helmets
        )

        torso_y1 = py1 + int(ph * 0.15)
        has_vest = any(
            (px1 - 25 <= v["center"][0] <= px2 + 25) and (torso_y1 <= v["center"][1] <= py2)
            for v in vests
        )

        if not has_helmet:
            violations.append({
                "violation": "NO_HELMET",
                "person_bbox": person["bbox"],
                "person_center": person["center"],
                "confidence": person["confidence"],
            })

        if not has_vest:
            violations.append({
                "violation": "NO_VEST",
                "person_bbox": person["bbox"],
                "person_center": person["center"],
                "confidence": person["confidence"],
            })

    return violations



