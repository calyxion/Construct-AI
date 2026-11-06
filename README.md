# 🏗️ CONSTRUCTAI — AI-Powered Construction Site Safety & Workforce Monitoring

> **Edge-First, Real-Time Autonomous Safety Enforcement Platform for Construction & Heavy Industry**

CONSTRUCTAI turns passive CCTV infrastructure into an active, autonomous safety enforcement engine. By combining multi-model edge AI inference (YOLO11n, ByteTrack, Pose Estimation), real-time WebSocket telemetry, hardware IoT interlock signals, and an enterprise 3D BIM digital twin dashboard, CONSTRUCTAI enforces safety protocols proactively without cloud latency or dependency.

---

## 🚨 The Challenge

Construction and heavy industrial environments consistently face high rates of fatal and non-fatal workplace injuries. Traditional safety management is **reactive**:
- Violations are audited manually after incidents have already occurred.
- Workers bypass personal protective equipment (PPE) in blind spots.
- Site management tracks output velocity while lacking real-time visibility into whether work is conducted safely.
- Incident documentation is prone to disputes and administrative delays.

---

## 💡 The Solution

CONSTRUCTAI establishes a closed-loop autonomous safety workflow:

1. **Detect** — Edge-deployed YOLO11n + ByteTrack pipelines detect workers, PPE status (hard hat, high-vis vest, face shield), and posture at high frame rates.
2. **Interlock** — Automated triggers send emergency stop signals and activate acoustic sirens via simulated Modbus TCP relay controllers when restricted exclusion zones are breached.
3. **Fine & Notify** — Automated compliance tickets generate regulatory fines with mock payment processing (Razorpay/Cashfree simulation) and contractor SMS alerts.
4. **Audit & Explain** — Every flagged safety event generates explainable AI incident tickets and is cryptographically hashed with SHA-256 for a tamper-evident audit log.

---

## ✨ Key Implemented Features

| Feature | Technical Implementation | Status |
| :--- | :--- | :--- |
| 🪖 **Multi-Class PPE Detection** | YOLO11n object detection with HSV color masking heuristics for hard hats, safety vests, and face shields (`ai/detection.py`) | Implemented |
| 🚫 **Dynamic Exclusion Zones** | Interactive polygon definition with real-time ray-casting point-in-polygon intrusion checks (`ai/zones.py`, `backend/api/zones.py`) | Implemented |
| 🏃 **Ergonomic & Fall Detection** | Aspect-ratio variance, bounding-box velocity, and keypoint orientation analysis (`ai/fall.py`, `ai/pose.py`) | Implemented |
| 🗺️ **Homography & Site Floor Map** | 2D perspective transformation matrix mapping camera pixels to site blueprint coordinates (`ai/homography.py`, `backend/api/floormap.py`) | Implemented |
| 🔊 **IoT Industrial Interlocks** | Simulated Modbus TCP relay controller endpoints triggering acoustic alarms and machinery emergency cutoffs (`ai/iot_interlocks.py`, `backend/api/iot.py`) | Implemented |
| 💳 **Closed-Loop Compliance** | Regulatory violation ticketing, manager approval workflows, payment gateway simulation, and contractor SMS alerts (`backend/api/payments.py`) | Implemented |
| 🏢 **4D BIM Digital Twin** | Interactive 3D WebGL site visualization powered by Three.js and `@react-three/fiber` displaying site structures, active equipment, and sensor nodes (`frontend/src/pages/BimDigitalTwinPage.jsx`) | Implemented |
| 🤖 **Explainable AI Incident Tickets** | Human-interpretable reasoning reports detailing worker context, violation specifics, and machinery proximity (`ai/vlm_explainer.py`, `backend/api/vlm.py`) | Implemented |
| 🧹 **Dirty / Occluded Lens Detection** | Laplacian variance focus measure alerting operators to obscured or fouled lenses (`ai/lens_check.py`, `backend/api/camera.py`) | Implemented |
| 🔒 **Cryptographic Audit Trail** | SHA-256 event chaining for immutable OSHA compliance audit trails (`backend/api/events.py`) | Implemented |
| 📊 **Safety-Adjusted Productivity** | KPI metrics fusing task completion milestones with live PPE compliance percentages (`backend/api/analytics.py`) | Implemented |

---

## 🛠️ Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │                    CCTV / USB Cameras                   │
   └────────────────────────────┬────────────────────────────┘
                                │ Live Video Frames
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                CONSTRUCTAI Edge AI Engine               │
   │  • Ultralytics YOLO11n / YOLOv8 Detection Pipeline      │
   │  • ByteTrack / BoT-SORT Multi-Object Tracking           │
   │  • HSV Color Heuristics & Exclusion Zone Ray-Casting     │
   │  • Laplacian Lens Diagnostics & Pose Fall Heuristics    │
   └────────────────────────────┬────────────────────────────┘
                                │ JSON Events / Telemetry
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  FastAPI Backend Server                 │
   │  • Async REST API & High-Throughput WebSockets          │
   │  • SQLite / SQLAlchemy Event Store                      │
   │  • SHA-256 Tamper-Proof Audit Logging                   │
   │  • Simulated IoT Modbus & Compliance Payment Endpoints   │
   └────────────────────────────┬────────────────────────────┘
                                │ WebSocket & REST Stream
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │             React 19 Enterprise Dashboard               │
   │  • Three.js + React Three Fiber 3D BIM Digital Twin     │
   │  • Real-time Live Monitoring & Canvas Floor Map         │
   │  • Compliance Management, Workers Roster & Analytics    │
   └─────────────────────────────────────────────────────────┘
```

- **Vision & AI:** Python 3.10+, Ultralytics YOLO, OpenCV (`cv2`), NumPy, ByteTrack / BoT-SORT
- **Backend API:** FastAPI, Uvicorn, SQLAlchemy, SQLite, Pydantic, WebSockets, Python `hashlib` (SHA-256)
- **Frontend Dashboard:** React 19, Vite 8, Tailwind CSS v4, Three.js, `@react-three/fiber`, `@react-three/drei`, Recharts, Lucide React, Axios

---

## 📂 Project Structure

```
Construct-AI/
├── .github/                        # CI workflows
│   └── workflows/
│       └── ci.yml                  # Lint, build & compilation workflow
├── .env.example                    # Example environment configuration
├── .gitignore                      # Git exclusion rules
├── LICENSE                         # MIT License
├── README.md                       # Comprehensive documentation
├── roadmap.md                      # Strategic development phases
├── start.bat                       # One-click system launcher
├── ai/                             # Edge AI computer vision engine
│   ├── detection.py                # YOLO inference & PPE color heuristics
│   ├── events.py                   # Canonical safety event schema
│   ├── fall.py                     # Pose ratio fall detection logic
│   ├── homography.py               # Camera-to-floor perspective mapping
│   ├── iot_interlocks.py           # Hardware relay & siren triggering
│   ├── lens_check.py               # Laplacian camera lens obstruction check
│   ├── main.py                     # Multi-threaded camera pipeline entry point
│   ├── onnx_export.py              # ONNX conversion utilities
│   ├── person_reid.py              # Feature vector embeddings for re-identification
│   ├── pose.py                     # Keypoint pose analysis
│   ├── requirements.txt            # AI engine dependencies
│   ├── test_image.py               # CLI tool for single image testing
│   ├── vlm_explainer.py            # Explainable AI incident generator
│   └── zones.py                    # Restricted zone geometry calculations
├── backend/                        # FastAPI REST & WebSocket server
│   ├── api/                        # API route controllers
│   │   ├── analytics.py            # Safety KPI metrics & executive summaries
│   │   ├── bim.py                  # BIM digital twin node & element endpoints
│   │   ├── camera.py               # Camera health & diagnostic routes
│   │   ├── enterprise.py           # Enterprise configuration and sites
│   │   ├── events.py               # Safety violation events & SHA-256 audit log
│   │   ├── floormap.py             # Blueprint floor map service
│   │   ├── health.py               # Healthcheck endpoint
│   │   ├── iot.py                  # IoT relay and emergency interlock routes
│   │   ├── metrics.py              # Real-time incident counters
│   │   ├── payments.py             # Violation fine billing & SMS simulation
│   │   ├── pose.py                 # Posture metrics endpoints
│   │   ├── stream.py               # MJPEG live stream streaming endpoint
│   │   ├── upload.py               # Offline image & video inspection upload
│   │   ├── vlm.py                  # VLM incident explanation endpoint
│   │   ├── workforce.py            # Worker directory & compliance records
│   │   └── zones.py                # Restricted exclusion zone management
│   ├── app/
│   │   └── main.py                 # FastAPI application entry point
│   ├── database/
│   │   ├── init_db.py              # Database initialization
│   │   └── models.py               # SQLAlchemy database schema
│   ├── services/
│   │   └── risk_scoring.py         # Real-time risk index calculation
│   ├── websocket/
│   │   └── events.py               # Live WebSocket event broadcast manager
│   └── requirements.txt            # Backend dependencies
├── data/
│   └── sample-events/              # Offline test datasets and seed events
└── frontend/                       # Production React 19 dashboard
    ├── package.json                # Frontend package configuration
    ├── vite.config.js              # Vite configuration
    ├── public/                     # Static icons and assets
    └── src/
        ├── App.jsx                 # Application shell & page routing
        ├── index.css               # Global styles (Tailwind v4)
        ├── components/             # Reusable UI widgets
        │   ├── AlertWidget.jsx     # Alert notification drawer
        │   ├── Navbar.jsx          # Top navigation bar
        │   ├── SafetyScoreCard.jsx # Site safety score gauge
        │   ├── Sidebar.jsx         # Collapsible sidebar navigation
        │   └── StatCard.jsx        # Stat summary cards
        ├── pages/                  # Dashboard page views (consistent *Page.jsx)
        │   ├── AiAlertsPage.jsx    # Real-time AI alert stream
        │   ├── AlertsPage.jsx      # Historical alert management
        │   ├── AnalyticsPage.jsx   # Incident trends and charts
        │   ├── BimDigitalTwinPage.jsx # 3D WebGL BIM Digital Twin
        │   ├── CompliancePaymentsPage.jsx # Fine assessment & payment portal
        │   ├── FloorMapPage.jsx    # 2D Canvas blueprint tracking
        │   ├── IoTInterlocksPage.jsx # Machine interlock & relay controls
        │   ├── LiveMonitoringPage.jsx # Multi-camera live view
        │   ├── PoseAnalysisPage.jsx # Ergonomic posture analysis
        │   ├── ReportsPage.jsx     # Compliance report generator
        │   ├── SettingsPage.jsx    # Threshold and configuration settings
        │   ├── UploadInspectionPage.jsx # Batch file inspection
        │   ├── VlmExplainerPage.jsx # Explainable AI incident tickets
        │   ├── WeeklyIntelligencePage.jsx # Executive intelligence dashboard
        │   ├── WorkersPage.jsx     # Worker directory and status
        │   └── ZonesPage.jsx       # Zone editor
        └── services/
            └── api.js              # API client integration
```

---

## 🚀 Getting Started

### Prerequisites

- **Python:** 3.10 or higher
- **Node.js:** 18 or higher (LTS recommended)
- **Video Input:** Integrated webcam, USB camera, or RTSP stream address

### 1. Installation

Clone the repository:
```bash
git clone https://github.com/calyxion/Construct-AI.git
cd Construct-AI
```

Install backend and AI dependencies:
```bash
pip install -r backend/requirements.txt
pip install -r ai/requirements.txt
```

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

### 2. Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Default configuration values:
- `BACKEND_HOST=0.0.0.0`
- `BACKEND_PORT=8000`
- `DATABASE_URL=sqlite:///./constructai.db`
- `CONFIDENCE_THRESHOLD=0.5`
- `CAMERA_INDEX=0`
- `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

### 3. Running the Services

#### Option A: One-Click Startup (Windows)
Double-click `start.bat` or run:
```cmd
start.bat
```
This coordinates launching the FastAPI backend, the AI vision camera engine, and the React frontend dashboard.

#### Option B: Manual Startup

1. **Start the FastAPI Backend:**
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start the AI Vision Engine:**
   ```bash
   cd ai
   python main.py --camera 0 --conf 0.25
   ```
   > To process a pre-recorded test video instead of a live camera: `python main.py --video path/to/video.mp4`

3. **Start the Frontend Dashboard:**
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Validation

### Frontend Production Build & Linting
Validate the frontend compilation and static code quality:
```bash
cd frontend
npm run lint
npm run build
```

### AI Pipeline Static Verification
Verify Python syntax and imports across all modules:
```bash
python -m py_compile ai/main.py ai/detection.py backend/app/main.py
```

### Single Image PPE Detection Test
Test the computer vision pipeline directly against any still photograph:
```bash
cd ai
python test_image.py --image path/to/sample.jpg --conf 0.35 --save ../screenshots/test_output.jpg
```

---

## 📦 Releases & Downloads

Pre-built production frontend web bundles and release packages are published on GitHub Releases:
👉 **[Latest Releases](https://github.com/calyxion/Construct-AI/releases)**

---

## ⚠️ Current Scope & Limitations

- **Payment & SMS Gateways:** The payment processing endpoints (`/api/compliance/fine/pay`) and SMS dispatch (`/api/compliance/fine/sms`) run in simulation mode for demonstration and integration testing without consuming live credit.
- **Hardware Relays:** IoT interlock endpoints simulate Modbus TCP coil states. Production deployment requires network-accessible industrial PLC hardware.
- **Inference Latency:** Frame rate is governed by edge compute availability. CPU-only inference delivers 15–30 FPS on lightweight models (YOLO11n); GPU acceleration (CUDA/TensorRT) is recommended for multi-camera streams.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m "feat: add amazing feature"`).
4. Push to your branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
