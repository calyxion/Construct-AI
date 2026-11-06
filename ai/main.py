"""
main.py â€” Ultra High-Performance Asynchronous Multi-Threaded AI Vision Pipeline.

Architecture:
  - Thread 1 (Capture & Display): 30â€“60 FPS native webcam capture, OpenCV rendering & MJPEG streaming.
  - Thread 2 (AI Inference Worker): Asynchronous non-blocking neural inference worker updating state.
  - Thread 3 (Event Dispatcher): Background REST event posting with 0ms cost in main loop.
  - Thread 4 (Frame Broadcaster): Non-blocking MJPEG byte chunk streamer.
"""

import argparse
import os
import sys
import time
import json
import datetime
import threading
import queue
from pathlib import Path

import cv2
import numpy as np
import requests

# Local modules
sys.path.insert(0, str(Path(__file__).parent))
from detection import load_model, run_inference, draw_detections, analyse_ppe_compliance
from zones import ZoneRegistry, draw_zones
from fall import FallDetector
from events import (
    ppe_violation_to_event,
    zone_violation_to_event,
    fall_to_event,
    EventDebouncer,
)

BACKEND_URL    = os.getenv("BACKEND_URL", "http://localhost:8000")
CAMERA_ID      = os.getenv("CAMERA_ID", "CAM-01")
SNAPSHOT_DIR   = Path(os.getenv("SNAPSHOT_DIR", "../screenshots/snapshots"))

# Queues
event_queue = queue.Queue(maxsize=100)
frame_stream_queue = queue.Queue(maxsize=2)
latest_frame_queue = queue.Queue(maxsize=1)

# Shared Thread-Safe AI State
shared_lock = threading.Lock()
shared_detections = []
shared_violations = []


def _event_worker():
    """Background thread that sends events to backend without blocking main loop."""
    session = requests.Session()
    while True:
        item = event_queue.get()
        if item is None:
            break
        event, snapshot_frame = item
        try:
            if snapshot_frame is not None:
                event["snapshot_path"] = save_snapshot(snapshot_frame, event["event_type"])
            resp = session.post(
                f"{BACKEND_URL}/api/events",
                json=event,
                timeout=1.5,
            )
            if resp.status_code in (200, 201):
                print(f"[EVENT] {event['event_type']} | {event['severity']} | {event['camera_id']} | Rec: {event.get('recommendation', '')[:50]}")
        except Exception:
            _log_event_locally(event)
        finally:
            event_queue.task_done()


def _frame_stream_worker():
    """Background thread that pushes MJPEG frames to backend at high speed."""
    session = requests.Session()
    while True:
        item = frame_stream_queue.get()
        if item is None:
            break
        camera_id, frame_bgr = item
        try:
            ret, buf = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 60])
            if ret:
                session.post(
                    f"{BACKEND_URL}/api/frame/{camera_id}",
                    data=buf.tobytes(),
                    headers={"Content-Type": "image/jpeg"},
                    timeout=0.4,
                )
        except Exception:
            pass
        finally:
            frame_stream_queue.task_done()


def _inference_worker(detector, conf, imgsz, zone_registry, debouncer, fall_detector):
    """Dedicated background inference thread keeping the main video loop at 30+ FPS."""
    global shared_detections, shared_violations
    while True:
        frame = latest_frame_queue.get()
        if frame is None:
            break
        try:
            dets = run_inference(detector, frame, conf_threshold=conf, imgsz=imgsz)
            viols = analyse_ppe_compliance(dets)

            with shared_lock:
                shared_detections = dets
                shared_violations = viols

            # Emit Events
            for viol in viols:
                person_center = viol["person_center"]
                zone = zone_registry.find_zone_for_point(person_center)
                zone_id = zone.zone_id if zone else "UNKNOWN"
                event = ppe_violation_to_event(viol, camera_id=CAMERA_ID, zone_id=zone_id)
                if debouncer.should_emit(event):
                    push_event_async(event, snapshot=frame)

            persons = [d for d in dets if d["label"] == "person"]
            for person in persons:
                zone_viol = zone_registry.check_restricted_entry(
                    person["center"], camera_id=CAMERA_ID
                )
                if zone_viol:
                    event = zone_violation_to_event(
                        zone_viol, camera_id=CAMERA_ID, confidence=person["confidence"]
                    )
                    if debouncer.should_emit(event):
                        push_event_async(event, snapshot=frame)

            fall_events = fall_detector.update(dets, camera_id=CAMERA_ID)
            for fall in fall_events:
                person_center = fall["person_center"]
                zone = zone_registry.find_zone_for_point(person_center)
                zone_id = zone.zone_id if zone else "UNKNOWN"
                event = fall_to_event(fall, camera_id=CAMERA_ID, zone_id=zone_id)
                if debouncer.should_emit(event):
                    push_event_async(event, snapshot=frame)

        except Exception as e:
            print(f"[Inference Thread Err] {e}")
        finally:
            latest_frame_queue.task_done()


def push_event_async(event: dict, snapshot: np.ndarray | None = None):
    try:
        snap_copy = snapshot.copy() if snapshot is not None else None
        event_queue.put_nowait((event, snap_copy))
    except queue.Full:
        pass


def push_frame_async(frame: np.ndarray, camera_id: str = CAMERA_ID):
    try:
        if frame_stream_queue.full():
            try:
                frame_stream_queue.get_nowait()
            except queue.Empty:
                pass
        frame_stream_queue.put_nowait((camera_id, frame.copy()))
    except queue.Full:
        pass


def save_snapshot(frame: np.ndarray, event_type: str) -> str:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    path = SNAPSHOT_DIR / f"{event_type}_{ts}.jpg"
    cv2.imwrite(str(path), frame)
    return str(path)


def _log_event_locally(event: dict):
    try:
        log_path = Path("../data/sample-events/offline_events.jsonl")
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "a") as f:
            f.write(json.dumps(event) + "\n")
    except Exception:
        pass


def draw_hud(frame: np.ndarray, worker_count: int, fps: float):
    h, w = frame.shape[:2]
    cv2.rectangle(frame, (0, 0), (w, 30), (10, 14, 26), -1)
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    cv2.putText(frame, f"CONSTRUCTAI SOTA  |  {ts}  |  Workers: {worker_count}  |  FPS: {fps:.1f}",
                (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 212, 103), 1, cv2.LINE_AA)
    return frame


def main(args):
    print("=== CONSTRUCTAI v2.0  — YOLO11 SOTA Multi-Threaded Vision Engine ===")
    print(f"Backend    : {BACKEND_URL}")
    print(f"Camera     : {'webcam ' + str(args.camera) if not args.video else args.video}")
    print("Engine     : YOLO11n + ByteTrack + PPE Ensemble | 4-Thread Async Pipeline (30+ FPS)")

    # Load Model
    detector = load_model(args.model)
    zone_registry = ZoneRegistry()
    fall_detector = FallDetector()
    debouncer = EventDebouncer(debounce_seconds=getattr(args, 'debounce', 30))

    # Start Background Workers
    threading.Thread(target=_event_worker, daemon=True).start()
    threading.Thread(target=_frame_stream_worker, daemon=True).start()
    threading.Thread(
        target=_inference_worker, 
        args=(detector, args.conf, args.imgsz, zone_registry, debouncer, fall_detector), 
        daemon=True
    ).start()

    source = args.video if args.video else args.camera
    cap = cv2.VideoCapture(source)

    if not args.video:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print(f"[ERROR] Cannot open video source: {source}")
        sys.exit(1)

    print("âœ“ High-speed video capture active!")

    frame_count = 0
    fps_smooth = 30.0
    t_prev = time.time()
    last_console_print = time.time()
    headless = getattr(args, 'headless', False)

    while True:
        ret, frame = cap.read()
        if not ret:
            if args.video:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            time.sleep(0.01)
            continue

        frame_count += 1

        # Feed latest frame to async AI worker thread (drop previous if AI is busy)
        if latest_frame_queue.empty():
            try:
                latest_frame_queue.put_nowait(frame.copy())
            except queue.Full:
                pass

        # Retrieve current AI detections (non-blocking)
        with shared_lock:
            current_detections = list(shared_detections)

        # Draw overlays at full native frame rate (30+ FPS)
        draw_zones(frame, zone_registry.all_zones())
        draw_detections(frame, current_detections)

        # Smooth FPS calculation
        t_now = time.time()
        dt = t_now - t_prev
        t_prev = t_now
        inst_fps = 1.0 / max(dt, 0.001)
        fps_smooth = 0.92 * fps_smooth + 0.08 * inst_fps

        workers_detected = len([d for d in current_detections if d.get("label") == "person"])
        draw_hud(frame, workers_detected, fps_smooth)

        # Stream frame to web backend (every 2 frames)
        if frame_count % 2 == 0:
            push_frame_async(frame, camera_id=CAMERA_ID)

        # Heartbeat log
        if t_now - last_console_print >= 5.0:
            print(f"  â–¶ Active Stream | FPS: {fps_smooth:.1f} | Workers: {workers_detected}")
            last_console_print = t_now

        if not headless:
            cv2.imshow("CONSTRUCTAI â€” High-Speed Live Feed", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q") or key == 27:
                break

    cap.release()
    if not headless:
        cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CONSTRUCTAI AI Module")
    parser.add_argument("--video",       type=str,   default=None, help="Path to video file (default: webcam)")
    parser.add_argument("--camera",      type=int,   default=1,    help="Webcam index (default: 1)")
    parser.add_argument("--model",       type=str,   default=None, help="Path to YOLO model .pt file")
    parser.add_argument("--conf",        type=float, default=0.25, help="Detection confidence threshold (default: 0.25)")
    parser.add_argument("--debounce",    type=int,   default=30,   help="Seconds to wait before repeating same alert (default: 30)")
    parser.add_argument("--imgsz",       type=int,   default=320,  help="YOLO inference size (default: 320 for maximum FPS)")
    parser.add_argument("--skip-frames", type=int,   default=1,    help="Run inference every N frames (default: 1)")
    parser.add_argument("--headless",    action="store_true",      help="Run without display window")
    args = parser.parse_args()
    main(args)



