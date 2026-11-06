"""
api/stream.py — Live MJPEG video stream endpoint.

The AI module POSTs annotated JPEG frames to POST /api/frame/{camera_id}.
The frontend displays the live stream via:  <img src="/api/stream/CAM-01">
"""

import asyncio
import time
from typing import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, Response

router = APIRouter()


# ---------------------------------------------------------------------------
# In-memory frame buffer — stores the latest JPEG per camera
# ---------------------------------------------------------------------------

class FrameBuffer:
    def __init__(self):
        self._frames: dict[str, bytes] = {}
        self._timestamps: dict[str, float] = {}

    def put(self, camera_id: str, jpeg_bytes: bytes):
        self._frames[camera_id] = jpeg_bytes
        self._timestamps[camera_id] = time.time()

    def get(self, camera_id: str) -> bytes | None:
        return self._frames.get(camera_id)

    def age(self, camera_id: str) -> float:
        ts = self._timestamps.get(camera_id)
        return (time.time() - ts) if ts else 9999.0


frame_buffer = FrameBuffer()


# ---------------------------------------------------------------------------
# AI module pushes annotated frames here
# ---------------------------------------------------------------------------

@router.post("/frame/{camera_id}", status_code=204)
async def receive_frame(camera_id: str, request: Request):
    """
    Receive a JPEG frame from the AI module.

    POST /api/frame/CAM-01
    Content-Type: image/jpeg
    Body: raw JPEG bytes
    """
    body = await request.body()
    if body:
        frame_buffer.put(camera_id, body)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Placeholder frame when AI module is not running
# ---------------------------------------------------------------------------

def _make_placeholder(camera_id: str) -> bytes:
    """Generate a 'Waiting…' placeholder JPEG."""
    try:
        import numpy as np
        import cv2
        img = np.zeros((360, 480, 3), dtype=np.uint8)
        # Dark gradient background
        for y in range(360):
            img[y, :] = [max(0, 10 - y // 20)] * 3

        cv2.putText(img, "AI Video Analysis", (80, 140),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 212, 103), 2, cv2.LINE_AA)
        cv2.putText(img, f"Camera: {camera_id}", (140, 185),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 150, 200), 1, cv2.LINE_AA)
        cv2.putText(img, "Waiting for AI module...", (95, 230),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 150, 150), 1, cv2.LINE_AA)
        cv2.putText(img, "python ai/main.py", (130, 265),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 180, 90), 1, cv2.LINE_AA)
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes()
    except Exception:
        # Absolute fallback — tiny valid JPEG
        return bytes([
            0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,
            0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,
            0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,
            0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,0x00,0x01,0x01,0x01,0x11,
            0x00,0xFF,0xC4,0x00,0x14,0x00,0x01,0x00,0x00,0x00,0x00,0x00,
            0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xFF,0xC4,
            0x00,0x14,0x10,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
            0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xFF,0xDA,0x00,0x08,0x01,
            0x01,0x00,0x00,0x3F,0x00,0x7F,0xFF,0xD9
        ])


# ---------------------------------------------------------------------------
# MJPEG stream generator
# ---------------------------------------------------------------------------

BOUNDARY = "mjpegframe"

async def _mjpeg_generator(camera_id: str) -> AsyncGenerator[bytes, None]:
    FPS = 20
    interval = 1.0 / FPS
    last = 0.0

    while True:
        # Rate-limit to target FPS
        now = time.time()
        sleep = interval - (now - last)
        if sleep > 0:
            await asyncio.sleep(sleep)

        frame = frame_buffer.get(camera_id)

        # If AI module hasn't sent frames for > 3 seconds, show placeholder
        if frame is None or frame_buffer.age(camera_id) > 3.0:
            frame = _make_placeholder(camera_id)

        header = (
            f"--{BOUNDARY}\r\n"
            f"Content-Type: image/jpeg\r\n"
            f"Content-Length: {len(frame)}\r\n\r\n"
        ).encode()

        yield header + frame + b"\r\n"
        last = time.time()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/stream/{camera_id}")
async def mjpeg_stream(camera_id: str = "CAM-01"):
    """Live MJPEG stream. Use as: <img src='/api/stream/CAM-01'>"""
    return StreamingResponse(
        _mjpeg_generator(camera_id),
        media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma":        "no-cache",
            "Expires":       "0",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/stream")
async def mjpeg_stream_default():
    return await mjpeg_stream("CAM-01")
