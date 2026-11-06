"""
lens_check.py — Dirty Camera & Lens Obscuration Detection.
Uses Laplacian variance to detect severe blur/mud/dust on the CCTV lens.
"""
import cv2
import numpy as np

def check_lens_status(frame: np.ndarray, threshold: float = 100.0) -> dict:
    """
    Analyzes a frame to determine if the lens is dirty or obscured.
    
    Args:
        frame: BGR numpy array representing the camera frame.
        threshold: The variance threshold below which a frame is considered blurry/dirty.
        
    Returns:
        dict containing the dirty status and sharpness metric.
    """
    if frame is None or frame.size == 0:
        return {"is_dirty": False, "sharpness": 0.0, "error": "Invalid frame"}

    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Compute the Laplacian of the image and then return the focus measure,
    # which is simply the variance of the Laplacian
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # If sharpness is lower than threshold, it means edges are lost (blur/mud)
    is_dirty = bool(sharpness < threshold)
    
    return {
        "is_dirty": is_dirty,
        "sharpness": round(sharpness, 2),
        "threshold": threshold
    }
