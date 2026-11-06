# CONSTRUCTAI: Product & Technical Architecture Roadmap

An enterprise-grade, 4-phase engineering roadmap for scaling **CONSTRUCTAI** from a high-performance edge prototype into an autonomous, multi-site construction safety and workforce intelligence platform.

---

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    CONSTRUCTAI STRATEGIC ROADMAP                        │
  └───────────────────────────────────┬─────────────────────────────────────┘
                                      │
       PHASE 1 (COMPLETED)            ▼              PHASE 2 (MONTHS 1-3)
 ┌───────────────────────────┐                 ┌───────────────────────────┐
 │ Core SOTA AI & Geofence   │                 │ Multimodal VLM & Edge     │
 │ • YOLO11 + ByteTrack MOT  │  ────────────►  │ • VLM Incident Explainer  │
 │ • Proximity Field Geo     │                 │ • 17-Pt 3D Pose Analysis  │
 │ • Workforce Hub & 30 FPS  │                 │ • TensorRT Jetson Orin    │
 └───────────────────────────┘                 └───────────────────────────┘
                                                             │
                                                             ▼
       PHASE 4 (MONTHS 8-12)          ▲              PHASE 3 (MONTHS 4-7)
 ┌───────────────────────────┐        │        ┌───────────────────────────┐
 │ BIM 4D Twin & Enterprise  │        │        │ Autonomous IoT & Drones   │
 │ • BIM Digital Twin Sync   │  ──────┴──────  │ • Drone Autonomous Patrol │
 │ • Automated SAP Payroll   │                 │ • Acoustic Crane Relays   │
 │ • Cross-Site Federated AI │                 │ • Predictive ML Heatmaps  │
 └───────────────────────────┘                 └───────────────────────────┘
```

---

## Phase 1: Core SOTA Vision & Real-Time Telemetry *(Completed / Production Ready)*

> **Objective**: Deliver a zero-latency, high-accuracy computer vision safety and workforce monitoring system operating on edge hardware.

- [x] **YOLO11 Neural Backbone**: Ultralytics YOLO11 (`yolo11n.pt`) with C3k2 & Pointwise Spatial Attention (PSA) for worker and PPE detection.
- [x] **ByteTrack Multi-Object Tracking (MOT)**: 8D Kalman filter state estimation preserving unique `track_id` identities across occlusions.
- [x] **Signed Distance Boundary Proximity**: Continuous 2D computational geometry (Shapely) triggering 1.5m buffer warnings before a physical geofence breach.
- [x] **Negative-Class Mutual Suppression**: Bayesian veto logic preventing false-positive hardhat detections on hair, forehead, and glasses.
- [x] **Asynchronous 4-Thread Edge Architecture**: Decoupled frame ingestion maintaining **30+ FPS live video** on standard edge CPUs.
- [x] **Workforce Intelligence Hub**: Real-time worker directory, zone capacity density gauges, biometric shift tracking, and 1-click personnel registration.
- [x] **Interactive Command Dashboard**: Cybernetic glassmorphic UI with animated SVG circular risk gauge, live CCTV HUD, and media upload inspection.

---

## Phase 2: Multimodal VLM, 3D Pose & Edge Acceleration *(Months 1–3)*

> **Objective**: Transition from simple bounding box alerts to rich, human-readable safety intelligence and sub-10ms edge execution.

1. **Vision-Language Model (VLM) Incident Explainer**:
   - Integrate a quantized local VLM (*Moondream2 / LLaVA-NeXT-Mini*) to automatically generate human-readable safety incident reports:
     > *"Worker W-103 detected entering Crane Swing Radius without Class-2 High-Vis Vest at 14:32:10. Proximity buffer breached by 0.8m. Acoustic siren engaged."*
2. **17-Keypoint 3D Ergonomics & Fall Biomechanics**:
   - Deploy **YOLO11-Pose** to monitor hazardous worker postures, heavy lifting spine angles (lumbar strain $>45^\circ$), and sudden slip-and-fall trajectories.
3. **Multi-Camera 3D Homography Floor Mapping**:
   - Calibrate homography matrices $H$ to project camera pixels $(u, v)$ directly onto 2D site blueprints and 3D floor plans.
4. **TensorRT / ONNX Runtime FP16 Compilation**:
   - Optimize models for **NVIDIA Jetson Orin Nano / AGX Orin**, achieving $<8\text{ms}$ inference latency per camera feed.

---

## Phase 3: Autonomous Drone Patrols & IoT Industrial Interlocks *(Months 4–7)*

> **Objective**: Extend monitoring to blind spots and automate physical site safety mechanisms.

1. **Autonomous Tethered / Patrol Drone Integration**:
   - Connect RTSP feeds from DJI Enterprise / Skydio drones to inspect high-altitude scaffolding, tower cranes, and perimeter fences without human risk.
2. **Hardware IoT Safety Interlocks**:
   - **Automated Acoustic Siren Relays**: Trigger local directional speaker warnings (*"Warning: Restricted Zone Entry"*) within 200ms of a geofence breach.
   - **Crane Emergency Stop (E-Stop) Integration**: Direct Modbus/PLC signal to crane control cabins to prevent struck-by collisions.
3. **Predictive Safety Analytics Engine**:
   - Time-series machine learning (LightGBM/XGBoost) forecasting high-risk zones and accident probabilities based on worker fatigue, weather data, and trade congestion.

---

## Phase 4: BIM 4D Digital Twin & Enterprise Ecosystem *(Months 8–12)*

> **Objective**: Enterprise integration with Building Information Modeling (BIM), automated ERP payroll, and multi-site decentralized scaling.

1. **BIM 4D Digital Twin Integration**:
   - Live synchronization with Autodesk Revit / Navisworks / IFC models to visualize real-time worker locations inside a 3D digital twin of the construction project.
2. **Automated SAP / Procore ERP Timesheet Sync**:
   - Auto-calculate audited work hours and shift attendance from camera dwell time, synchronizing directly with corporate payroll systems.
3. **Decentralized Federated Learning**:
   - Train and fine-tune safety models across multiple regional construction sites without transmitting raw CCTV video back to central servers, preserving full commercial privacy.
4. **Government & OSHA Compliance Certification Engine**:
   - 1-Click export of cryptographically signed compliance audit trails for regulatory compliance bodies (OSHA, HSE, ISO 45001).

---

## Technical Stack Evolution

| Layer | Phase 1 (Current) | Phase 2 (Months 1–3) | Phase 3 (Months 4–7) | Phase 4 (Months 8–12) |
| :--- | :--- | :--- | :--- | :--- |
| **Vision Backbone** | YOLO11n + ByteTrack | YOLO11-Pose + Moondream VLM | Drone Aerial Models | Custom Edge ViT |
| **Edge Hardware** | Multi-Core CPU | NVIDIA Jetson Orin Nano | Jetson AGX + PLC Relays | On-Prem Edge Clusters |
| **Backend & DB** | FastAPI + SQLite / PG | FastAPI + Redis Caching | Distributed Celery + RabbitMQ | Microservices + Kafka |
| **Frontend & UI** | React 18 + Vite + Tailwind | React Flow Blueprint Canvas | Three.js 3D Viewport | 4D BIM Autodesk Forge |
| **Enterprise** | Local JSONL / REST | PDF / CSV Exporter | Modbus Industrial PLC | SAP / Procore API Sync |
