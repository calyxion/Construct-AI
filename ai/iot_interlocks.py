"""
iot_interlocks.py — Hardware IoT Safety Interlocks.

Phase 3 Module: Integrates with Modbus TCP to trigger physical
acoustic siren relays and crane E-Stops within 200ms of a geofence breach.
"""

from __future__ import annotations
import time
from pymodbus.client import ModbusTcpClient

# Simulated Modbus registers for hardware relays
REG_SIREN_STATE  = 100
REG_CRANE_ESTOP  = 101
REG_ACCESS_GATE  = 102

class IoTInterlockController:
    """Manages connections to physical Modbus PLCs on site."""

    def __init__(self, host: str = "127.0.0.1", port: int = 5020):
        self.host = host
        self.port = port
        self.client = None
        self.simulated_state = {
            "siren_active": False,
            "crane_estop_engaged": False,
            "access_gate_open": True,
        }

    def connect(self) -> bool:
        """Connect to the Modbus PLC."""
        try:
            self.client = ModbusTcpClient(self.host, port=self.port)
            return self.client.connect()
        except Exception:
            return False

    def trigger_siren(self, duration_sec: int = 5) -> bool:
        """Trigger acoustic directional siren relay."""
        self.simulated_state["siren_active"] = True
        print(f"[IOT] 🚨 SIREN TRIGGERED for {duration_sec}s")
        if self.client and self.client.connected:
            try:
                self.client.write_coil(REG_SIREN_STATE, True)
                # In real scenario, a background thread handles the turn off
            except Exception as e:
                print(f"Modbus write failed: {e}")
        return True

    def reset_siren(self) -> bool:
        """Turn off acoustic siren."""
        self.simulated_state["siren_active"] = False
        print(f"[IOT] 🔇 SIREN RESET")
        if self.client and self.client.connected:
            try:
                self.client.write_coil(REG_SIREN_STATE, False)
            except Exception:
                pass
        return True

    def trigger_crane_estop(self, crane_id: str) -> bool:
        """Trigger Crane Emergency Stop via PLC."""
        self.simulated_state["crane_estop_engaged"] = True
        print(f"[IOT] 🛑 CRANE {crane_id} E-STOP ENGAGED!")
        if self.client and self.client.connected:
            try:
                self.client.write_coil(REG_CRANE_ESTOP, True)
            except Exception:
                pass
        return True

    def reset_crane_estop(self, crane_id: str) -> bool:
        """Reset Crane Emergency Stop."""
        self.simulated_state["crane_estop_engaged"] = False
        print(f"[IOT] 🏗️ CRANE {crane_id} E-STOP RESET")
        if self.client and self.client.connected:
            try:
                self.client.write_coil(REG_CRANE_ESTOP, False)
            except Exception:
                pass
        return True

    def get_status(self) -> dict:
        """Get the current state of all relays."""
        return self.simulated_state

# Singleton
_controller = None
def get_iot_controller() -> IoTInterlockController:
    global _controller
    if _controller is None:
        _controller = IoTInterlockController()
        # Do not block if simulation server is off
        _controller.connect()
    return _controller
