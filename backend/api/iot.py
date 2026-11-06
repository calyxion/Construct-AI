"""
api/iot.py — Hardware Interlocks Endpoints.
Phase 3 API
"""
from fastapi import APIRouter
import sys, os

router = APIRouter()
_ai_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai"))
if _ai_dir not in sys.path: sys.path.insert(0, _ai_dir)

@router.get("/iot/status")
def get_iot_status():
    from iot_interlocks import get_iot_controller
    return get_iot_controller().get_status()

@router.post("/iot/siren/trigger")
def trigger_siren():
    from iot_interlocks import get_iot_controller
    return {"success": get_iot_controller().trigger_siren()}

@router.post("/iot/siren/reset")
def reset_siren():
    from iot_interlocks import get_iot_controller
    return {"success": get_iot_controller().reset_siren()}

@router.post("/iot/crane/estop/{crane_id}")
def trigger_estop(crane_id: str):
    from iot_interlocks import get_iot_controller
    return {"success": get_iot_controller().trigger_crane_estop(crane_id)}

@router.post("/iot/crane/reset/{crane_id}")
def reset_estop(crane_id: str):
    from iot_interlocks import get_iot_controller
    return {"success": get_iot_controller().reset_crane_estop(crane_id)}
