"""
api/camera.py — Camera Health & Status Endpoints.
"""
from fastapi import APIRouter
import numpy as np
import cv2
import sys, os

router = APIRouter()
_ai_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai"))
if _ai_dir not in sys.path: sys.path.insert(0, _ai_dir)

@router.get("/camera/status")
def get_camera_status():
    from lens_check import check_lens_status
    
    # Simulate grabbing the latest frame from the CCTV stream
    # For demonstration, we create a synthetic 'clean' frame with edges
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    # Add random noise/edges so it's not totally blank (which would trigger dirty)
    cv2.putText(frame, "CCTV LIVE FEED", (100, 100), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
    cv2.rectangle(frame, (200, 200), (400, 400), (0, 255, 0), 5)
    
    # Add a random chance to simulate a dirty lens for demo purposes
    # In production, this would pass the actual live RTSP frame.
    if np.random.random() > 0.8:
        # Simulate mud (blur everything)
        frame = cv2.GaussianBlur(frame, (99, 99), 0)

    status = check_lens_status(frame)
    return status
