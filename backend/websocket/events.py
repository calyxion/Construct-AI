"""
websocket/events.py — WebSocket connection manager and event broadcaster.
"""

from __future__ import annotations
import asyncio
import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: Any):
        """Send JSON data to all connected clients. Removes stale connections."""
        payload = json.dumps(data, default=str)
        disconnected = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    @property
    def connection_count(self) -> int:
        return len(self.active)


# Singleton — imported by both api/events.py and app/main.py
manager = ConnectionManager()
