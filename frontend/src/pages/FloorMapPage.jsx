import React, { useState, useEffect, useRef } from 'react';
import { Map, Users, Zap, RefreshCw, Info, Thermometer, Camera, Shield } from 'lucide-react';

// Site blueprint dimensions (scaled to canvas)
const SITE_W = 40;  // meters
const SITE_H = 30;  // meters

const ZONES = [
  { id: 'ZONE-A', name: 'General Assembly', polygon: [[0,0],[18,0],[18,30],[0,30]], color: 'rgba(16,185,129,0.15)', border: '#10b981', risk: 'SAFE' },
  { id: 'ZONE-B', name: 'Crane Swing Radius', polygon: [[18,10],[36,10],[36,28],[18,28]], color: 'rgba(239,68,68,0.15)', border: '#ef4444', risk: 'CRITICAL' },
  { id: 'ZONE-C', name: 'Scaffold Platform', polygon: [[0,0],[18,0],[18,15],[0,15]], color: 'rgba(245,158,11,0.12)', border: '#f59e0b', risk: 'HIGH' },
];



const CAMERAS = [
  { id: 'CAM-01', x_m: 20, y_m: 30, name: 'Main Assembly', fov: 90 },
  { id: 'CAM-02', x_m: 40, y_m: 30, name: 'Crane Perimeter', fov: 75 },
  { id: 'CAM-03', x_m: 0, y_m: 15, name: 'Scaffold Platform', fov: 80 },
];

const WORKER_COLORS = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  WARNING:  '#f59e0b',
  SAFE:     '#10b981',
};

function meterToCanvas(xM, yM, canvasW, canvasH) {
  const margin = 32;
  const w = canvasW - margin * 2;
  const h = canvasH - margin * 2;
  return [margin + (xM / SITE_W) * w, canvasH - margin - (yM / SITE_H) * h];
}

function polygonToCanvas(poly, canvasW, canvasH) {
  return poly.map(([x, y]) => meterToCanvas(x, y, canvasW, canvasH));
}

import axios from 'axios';

export default function FloorMapPage() {
  const canvasRef = useRef(null);
  const [workers, setWorkers] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showCameras, setShowCameras] = useState(true);
  const [hoveredWorker, setHoveredWorker] = useState(null);
  const [livePositions, setLivePositions] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const animRef = useRef(null);
  // Fetch live positions from backend
  useEffect(() => {
    if (!livePositions) return;
    const tick = async () => {
      try {
        const resp = await axios.get('http://localhost:8000/api/floormap/positions');
        // Backend returns: { workers: [{ worker_id, x_m, y_m, ... }], zone_occupancy }
        setWorkers(resp.data.workers.map(w => ({ ...w, risk: 'SAFE' }))); // Provide default risk style
      } catch (err) {
        console.warn('Failed to fetch floormap positions:', err);
      }
    };
    tick(); // Initial fetch
    animRef.current = setInterval(tick, 1000);
    return () => clearInterval(animRef.current);
  }, [livePositions]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Background grid
    ctx.strokeStyle = 'rgba(30,41,59,0.8)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= SITE_W; x += 5) {
      const [cx] = meterToCanvas(x, 0, cw, ch);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ch); ctx.stroke();
    }
    for (let y = 0; y <= SITE_H; y += 5) {
      const [, cy] = meterToCanvas(0, y, cw, ch);
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cw, cy); ctx.stroke();
    }

    // Heatmap
    if (showHeatmap) {
      workers.forEach(w => {
        const [cx, cy] = meterToCanvas(w.x_m, w.y_m, cw, ch);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        grad.addColorStop(0, 'rgba(239,68,68,0.35)');
        grad.addColorStop(0.5, 'rgba(245,158,11,0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
      });
    }

    // Zones
    ZONES.forEach(zone => {
      const pts = polygonToCanvas(zone.polygon, cw, ch);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = zone.id === selectedZone ? zone.color.replace('0.15', '0.30').replace('0.12', '0.25') : zone.color;
      ctx.fill();
      ctx.strokeStyle = zone.border;
      ctx.lineWidth = zone.id === selectedZone ? 2.5 : 1.5;
      ctx.setLineDash(zone.risk === 'SAFE' ? [8, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      // Zone label
      const [lx, ly] = meterToCanvas(
        zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length,
        zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length,
        cw, ch
      );
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillStyle = zone.border;
      ctx.textAlign = 'center';
      ctx.fillText(zone.id, lx, ly - 4);
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.fillText(zone.name, lx, ly + 10);
    });

    // Camera FOV indicators
    if (showCameras) {
      CAMERAS.forEach(cam => {
        const [cx, cy] = meterToCanvas(cam.x_m, cam.y_m, cw, ch);
        const fovRad = (cam.fov * Math.PI) / 180;
        const camR = ((cam.fov / 90) * 120);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, camR, -Math.PI / 2 - fovRad / 2, -Math.PI / 2 + fovRad / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(59,130,246,0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(59,130,246,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#60a5fa';
        ctx.textAlign = 'center';
        ctx.fillText(cam.id, cx, cy - 9);
      });
    }

    // Workers
    workers.forEach(w => {
      const [cx, cy] = meterToCanvas(w.x_m, w.y_m, cw, ch);
      const color = WORKER_COLORS[w.risk] || '#10b981';
      const isHovered = hoveredWorker === w.worker_id;

      // Glow ring
      if (w.risk === 'CRITICAL' || isHovered) {
        ctx.beginPath();
        ctx.arc(cx, cy, isHovered ? 16 : 12, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Worker dot
      ctx.beginPath();
      ctx.arc(cx, cy, isHovered ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.font = isHovered ? 'bold 10px monospace' : 'bold 9px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(w.worker_id, cx, cy - 12);

      if (isHovered) {
        ctx.font = '8px sans-serif';
        ctx.fillStyle = 'rgba(148,163,184,0.9)';
        ctx.fillText(`(${w.x_m.toFixed(1)}m, ${w.y_m.toFixed(1)}m)`, cx, cy + 18);
      }
    });

    // Scale bar
    const margin = 32;
    const scaleEnd = meterToCanvas(10, 0, cw, ch)[0];
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, ch - 12); ctx.lineTo(scaleEnd, ch - 12);
    ctx.stroke();
    ctx.font = '9px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('10m', (margin + scaleEnd) / 2, ch - 3);

  }, [workers, showHeatmap, showCameras, hoveredWorker, selectedZone]);

  const handleCanvasMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cw = canvasRef.current.width, ch = canvasRef.current.height;
    let found = null;
    workers.forEach(w => {
      const [cx, cy] = meterToCanvas(w.x_m, w.y_m, cw, ch);
      if (Math.hypot(mx - cx, my - cy) < 14) found = w.worker_id;
    });
    setHoveredWorker(found);
  };

  const zoneOccupancy = ZONES.map(z => ({
    ...z,
    count: workers.filter(w => {
      const pts = z.polygon;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > w.y_m) !== (yj > w.y_m) && w.x_m < ((xj - xi) * (w.y_m - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    }).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] font-black font-mono uppercase tracking-wider">PHASE 2</div>
            <span className="text-[11px] text-slate-500 font-mono">Homography Calibration · Multi-Camera · Real-World Meters</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <Map className="w-6 h-6 text-blue-400" />
            3D Homography Floor Map & Worker Positioning
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Camera pixel coordinates projected onto site blueprint via homography matrix H. Real-time worker tracking, heat density map, zone occupancy.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setLivePositions(p => !p)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
              livePositions ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'glass-panel border-slate-700 text-slate-400'
            }`}>
            <span className={`w-2 h-2 rounded-full ${livePositions ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
            {livePositions ? 'Live Simulation ON' : 'Start Live Sim'}
          </button>
          <button onClick={() => setShowHeatmap(p => !p)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
              showHeatmap ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'glass-panel border-slate-700 text-slate-400'
            }`}>
            <Thermometer className="w-3.5 h-3.5" /> {showHeatmap ? 'Heatmap ON' : 'Show Heatmap'}
          </button>
          <button onClick={() => setShowCameras(p => !p)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
              showCameras ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'glass-panel border-slate-700 text-slate-400'
            }`}>
            <Camera className="w-3.5 h-3.5" /> Cameras
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Blueprint Canvas */}
        <div className="xl:col-span-3">
          <div className="glass-panel rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Map className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Site Blueprint — Sector 4B (40m × 30m)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>SAFE</span>
                <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span>WARNING</span>
                <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500"></span>CRITICAL</span>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={780}
              height={500}
              className="w-full rounded-xl bg-slate-950 border border-slate-800/60 cursor-crosshair"
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredWorker(null)}
            />
            <div className="mt-2 text-[11px] text-slate-600 font-mono text-center">
              Homography Matrix H: pixel(u,v) → blueprint(x_m, y_m) | RANSAC-calibrated per camera
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="xl:col-span-1 space-y-4">
          {/* Zone Occupancy */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Zone Occupancy
            </h3>
            <div className="space-y-2.5">
              {zoneOccupancy.map(z => (
                <div key={z.id} onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedZone === z.id ? `border-current opacity-100` : 'border-slate-800/60 hover:border-slate-700'
                  }`}
                  style={{ borderColor: selectedZone === z.id ? z.border : undefined }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black" style={{ color: z.border }}>{z.id}</span>
                    <span className="text-[10px] font-black font-mono" style={{ color: z.border }}>{z.count} workers</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{z.name}</div>
                  <div className="mt-1.5 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(z.count * 20, 100)}%`, backgroundColor: z.border }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worker List */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Blueprint Positions
            </h3>
            <div className="space-y-2">
              {workers.map(w => (
                <div key={w.worker_id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    hoveredWorker === w.worker_id ? 'border-slate-600 bg-slate-800/30' : 'border-slate-800/40 hover:border-slate-700/60'
                  }`}
                  onMouseEnter={() => setHoveredWorker(w.worker_id)}
                  onMouseLeave={() => setHoveredWorker(null)}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: WORKER_COLORS[w.risk] }}></span>
                    <span className="font-mono font-bold text-slate-200 text-[11px]">{w.worker_id}</span>
                  </div>
                  <span className="font-mono text-slate-500 text-[10px]">
                    ({w.x_m.toFixed(1)}, {w.y_m.toFixed(1)})m
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Homography Info */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Info className="w-3.5 h-3.5 text-purple-400" /> Calibration Info
            </h3>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-500">
              <div className="flex justify-between"><span>Method:</span><span className="text-slate-300">RANSAC Homography</span></div>
              <div className="flex justify-between"><span>Cameras:</span><span className="text-emerald-400">3 calibrated</span></div>
              <div className="flex justify-between"><span>Site:</span><span className="text-slate-300">40m × 30m</span></div>
              <div className="flex justify-between"><span>Error:</span><span className="text-emerald-400">&lt; 0.3m</span></div>
              <div className="flex justify-between"><span>Points:</span><span className="text-slate-300">4 per camera</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

