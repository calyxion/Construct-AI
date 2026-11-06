"""
vlm_explainer.py — Vision Language Model (VLM) Incident Explainer.

Phase 2 Module: Generates rich, human-readable natural language descriptions
of safety incidents from frame snapshots using:
  1. Moondream2 (local, CPU/GPU) via HuggingFace Transformers
  2. Rule-based fallback (always available)

The VLM explains WHAT it sees in the frame, WHY it is dangerous,
and WHAT action should be taken — for judges, reports, and operators.
"""

from __future__ import annotations
import base64, io, time
from typing import Optional
import numpy as np

# ---------------------------------------------------------------------------
# VLM Loader (Moondream2)
# ---------------------------------------------------------------------------

_vlm_model = None
_vlm_tokenizer = None
_vlm_loaded = False

def _load_moondream():
    """Lazy-load Moondream2 on first use. Falls back silently if unavailable."""
    global _vlm_model, _vlm_tokenizer, _vlm_loaded
    if _vlm_loaded:
        return _vlm_model is not None
    _vlm_loaded = True
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        print("[VLM] Loading Moondream2 vision-language model...")
        _vlm_tokenizer = AutoTokenizer.from_pretrained(
            "vikhyatk/moondream2", trust_remote_code=True, revision="2025-01-09"
        )
        _vlm_model = AutoModelForCausalLM.from_pretrained(
            "vikhyatk/moondream2", trust_remote_code=True, revision="2025-01-09"
        )
        print("[VLM] Moondream2 loaded successfully.")
        return True
    except Exception as e:
        print(f"[VLM] Moondream2 unavailable ({e}). Using rule-based explainer.")
        _vlm_model = None
        return False


# ---------------------------------------------------------------------------
# VLM Prompt Templates per Event Type
# ---------------------------------------------------------------------------

VLM_PROMPTS = {
    "NO_HELMET":
        "Describe the safety violation you see. Focus on whether the person is wearing a hardhat or helmet. "
        "What is the immediate danger? What corrective action must be taken right now?",

    "NO_VEST":
        "Describe the safety violation involving personal protective equipment (PPE). Is the person wearing a "
        "high-visibility safety vest? What hazard does this create on a construction site?",

    "RESTRICTED_ENTRY":
        "Describe the scene showing an unauthorized person entering a restricted or danger zone. "
        "What visible hazards are present? What emergency response is required?",

    "POSSIBLE_FALL":
        "Analyze this construction site image for evidence of a worker fall or fall risk. "
        "Describe the worker's posture, position, and any immediate medical emergency indicators.",

    "MACHINERY_PROXIMITY":
        "Describe the proximity hazard between a worker and heavy construction machinery. "
        "What is the struck-by risk and what safety intervention should occur?",

    "ERGONOMIC_RISK":
        "Describe the worker's posture and any ergonomic hazards. Is there evidence of hazardous lifting, "
        "spine strain, or an unsafe body position that could cause musculoskeletal injury?",
}

DEFAULT_VLM_PROMPT = (
    "You are a construction site safety AI. Describe the safety situation in this image in 2-3 sentences. "
    "Identify any PPE violations, hazardous postures, or dangerous proximity to equipment. "
    "State what immediate corrective action is required."
)


# ---------------------------------------------------------------------------
# Rule-Based Explainer (Fallback — always works without VLM)
# ---------------------------------------------------------------------------

RULE_EXPLANATIONS = {
    "NO_HELMET": {
        "title": "Hardhat / Helmet Violation Detected",
        "scene": "Worker detected on active construction site without an approved EN 397 hardhat.",
        "danger": "Exposed head is at critical risk of falling object strike, which is the #1 cause of construction fatalities. Without a hardhat, even a small dropped tool from scaffold height can cause severe traumatic brain injury or death.",
        "action": "Immediately dispatch safety supervisor to the detected location. Issue verbal and acoustic warning. Worker must cease all activities and retrieve hardhat before re-entering the work zone.",
        "severity": "HIGH",
        "regulatory": "Violates OSHA 29 CFR 1926.100(a) — Head Protection, and HSE CDM 2015 Regulation 13.",
    },
    "NO_VEST": {
        "title": "High-Visibility Vest Absence Detected",
        "scene": "Worker present in active site zone without a Class 2 or Class 3 high-visibility safety vest.",
        "danger": "Worker is invisible to heavy machinery operators, crane banks, and site vehicles — particularly at dusk, dawn, and under construction lighting. Risk of struck-by incident is 3.5x higher without Hi-Vis PPE.",
        "action": "Direct worker to the PPE dispensary immediately. No further work permitted in the active zone until a high-visibility vest is donned and confirmed by camera re-scan.",
        "severity": "MEDIUM",
        "regulatory": "Violates ANSI/ISEA 107-2020 High-Visibility Safety Apparel Standard.",
    },
    "RESTRICTED_ENTRY": {
        "title": "CRITICAL — Restricted Zone Unauthorized Entry",
        "scene": "Worker or unauthorized personnel detected breaching the perimeter of a geofenced restricted danger zone (e.g. Crane Swing Radius, Excavation Trench, or Electrical Hazard Area).",
        "danger": "This is a life-threatening situation. Active crane operations, overhead loads, or unstable ground within this zone creates an immediate struck-by, crush, or engulfment hazard. The risk of fatality is extreme.",
        "action": "EMERGENCY PROTOCOL: Trigger acoustic siren immediately. Broadcast site-wide PA announcement. Halt all crane and machinery operations. Safety officer must physically escort personnel out of the restricted zone before resuming any operations.",
        "severity": "CRITICAL",
        "regulatory": "Violates OSHA 1926.502 (Fall Protection) and 1926.600 (Equipment). May trigger OSHA Willful Citation.",
    },
    "POSSIBLE_FALL": {
        "title": "CRITICAL — Worker Fall Event Detected",
        "scene": "Computer vision motion analysis has detected a rapid change in worker posture or position consistent with a fall from height or ground-level collapse. Worker may be incapacitated.",
        "danger": "Falls from height are the #1 cause of construction fatalities globally. Even a 1.8m fall can cause fatal head trauma. Worker may be unconscious, severely injured, or require immediate medical intervention.",
        "action": "IMMEDIATE MEDICAL DISPATCH REQUIRED. Alert on-site first responder and paramedic team. Secure the area from other workers. Do NOT move the worker unless in immediate further danger. Activate emergency services (911) if worker is unresponsive.",
        "severity": "CRITICAL",
        "regulatory": "Triggers mandatory OSHA 300 Log recordable incident. Requires immediate supervisor notification and incident report.",
    },
    "MACHINERY_PROXIMITY": {
        "title": "Machinery Proximity — Struck-By Hazard",
        "scene": "Worker detected within the exclusion zone of active heavy construction machinery (excavator, crane, concrete pump, or lift).",
        "danger": "Heavy machinery operating without clear worker separation creates a high struck-by fatality risk. Operators have severely limited visibility on left, rear, and overhead blind spots. Even low-speed machinery contact causes crush injuries or death.",
        "action": "Signal machine operator to halt operations immediately using the site stop protocol. Establish minimum 6-metre exclusion zone with physical barriers. Worker must not re-enter until machinery is fully secured.",
        "severity": "HIGH",
        "regulatory": "Violates OSHA 1926.600 Equipment Safety and CPWR Struck-By Hazard Alert guidelines.",
    },
    "ERGONOMIC_RISK": {
        "title": "Ergonomic Posture Hazard Detected",
        "scene": "YOLO11-Pose 17-keypoint biomechanics analysis has detected a worker in a posture indicating elevated musculoskeletal risk — potentially a hazardous spine bend angle (>45°), deep squat, or sustained overhead task.",
        "danger": "Repetitive hazardous postures cause cumulative lumbar disc damage, rotator cuff tears, and long-term permanent disability. On a construction site, sudden back injury can also cause a worker to lose balance and fall.",
        "action": "Notify site safety officer to assess worker's task and intervene with ergonomic tool alternatives, mechanical assist devices, or mandatory rest rotation.",
        "severity": "MEDIUM",
        "regulatory": "OSHA Ergonomics eTool — Construction Industry; ISO 11226 Ergonomics of Working Postures.",
    },
}


def generate_rule_based_explanation(
    event_type: str,
    worker_id: Optional[str] = None,
    zone: Optional[str] = None,
    confidence: float = 0.9,
    pose_data: Optional[dict] = None,
    timestamp: Optional[str] = None,
) -> dict:
    """Generate a detailed, structured safety explanation using rules (always fast, always available)."""
    template = RULE_EXPLANATIONS.get(event_type, RULE_EXPLANATIONS["NO_HELMET"])
    ts = timestamp or time.strftime("%Y-%m-%d %H:%M:%S")
    wid = worker_id or "UNIDENTIFIED"
    z = zone or "Active Site Area"
    conf_pct = f"{confidence * 100:.0f}%"

    # Build natural language narrative
    narrative = (
        f"At {ts}, construction site safety AI ({conf_pct} confidence) detected a {template['title']} "
        f"involving worker {wid} in {z}. "
        f"{template['scene']} "
        f"{template['danger']}"
    )

    if pose_data and pose_data.get("lumbar_angle", 0) > 10:
        narrative += (
            f" Biomechanical pose analysis recorded a spine inclination angle of "
            f"{pose_data['lumbar_angle']:.1f}° "
            f"({'CRITICAL' if pose_data['lumbar_angle'] > 45 else 'WARNING'} threshold)."
        )

    return {
        "method":      "rule_based",
        "event_type":  event_type,
        "title":       template["title"],
        "narrative":   narrative,
        "scene":       template["scene"],
        "danger":      template["danger"],
        "action":      template["action"],
        "severity":    template["severity"],
        "regulatory":  template["regulatory"],
        "worker_id":   wid,
        "zone":        z,
        "confidence":  confidence,
        "timestamp":   ts,
    }


# ---------------------------------------------------------------------------
# Moondream2 VLM Explanation
# ---------------------------------------------------------------------------

def _frame_to_pil(frame: np.ndarray):
    """Convert OpenCV BGR frame to PIL Image."""
    from PIL import Image
    return Image.fromarray(frame[:, :, ::-1])  # BGR → RGB


def generate_vlm_explanation(
    frame: np.ndarray,
    event_type: str,
    worker_id: Optional[str] = None,
    zone: Optional[str] = None,
    confidence: float = 0.9,
    pose_data: Optional[dict] = None,
    timestamp: Optional[str] = None,
) -> dict:
    """
    Generate an AI-powered VLM explanation for a safety incident.
    Falls back to rule-based if Moondream2 is unavailable.
    """
    # Always include the rule-based version
    rule_result = generate_rule_based_explanation(event_type, worker_id, zone, confidence, pose_data, timestamp)

    # Try VLM
    if _load_moondream():
        try:
            from PIL import Image
            pil_img = _frame_to_pil(frame) if isinstance(frame, np.ndarray) else frame
            prompt = VLM_PROMPTS.get(event_type, DEFAULT_VLM_PROMPT)

            t0 = time.time()
            # Moondream2 encode and query
            enc = _vlm_model.encode_image(pil_img)
            vlm_answer = _vlm_model.query(enc, prompt)["answer"]
            elapsed = time.time() - t0

            rule_result["method"]       = "moondream2_vlm"
            rule_result["vlm_narrative"] = vlm_answer.strip()
            rule_result["vlm_latency_ms"] = round(elapsed * 1000, 1)
            rule_result["model"]          = "vikhyatk/moondream2"
            print(f"[VLM] Moondream2 inference in {elapsed*1000:.0f}ms: {vlm_answer[:80]}...")

        except Exception as e:
            rule_result["vlm_error"] = str(e)
            print(f"[VLM] Moondream2 inference failed: {e}")

    return rule_result


# ---------------------------------------------------------------------------
# Frame-to-Base64 for API transport
# ---------------------------------------------------------------------------

def frame_to_base64(frame: np.ndarray, quality: int = 60) -> str:
    """Encode an OpenCV frame as base64 JPEG for JSON API transport."""
    import cv2
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf.tobytes()).decode("utf-8")
