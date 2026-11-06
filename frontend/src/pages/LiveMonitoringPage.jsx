import React, { useState } from 'react';
import { Video, ShieldAlert, Users, Activity, RefreshCw, Maximize2, Radio, Camera } from 'lucide-react';
import AlertWidget from '../components/AlertWidget';

export default function LiveMonitoring({ workers = [], alerts = [], riskStatus, activeScenario }) {
  const [selectedCamera, setSelectedCamera] = useState('CAM-01');
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Camera Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <Video className="w-6 h-6 text-amber-500" />
            Live CCTV Safety Feed & HUD
          </h2>
          <p className="text-sm text-slate-400">
            Real-time computer vision inference stream with polygon hazard geofencing & PPE overlays.
          </p>
        </div>

        {/* Camera Selector */}
        <div className="flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-xl">
          {['CAM-01 (Sector 4B)', 'CAM-02 (Crane Yard)', 'CAM-03 (Scaffold)'].map((camLabel, idx) => {
            const camId = `CAM-0${idx + 1}`;
            const isSelected = selectedCamera === camId;
            return (
              <button
                key={camId}
                onClick={() => {
                  setSelectedCamera(camId);
                  handleRefreshStream();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {camId}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Video Stream + Right Panel Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Video Area (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div className="flex items-center space-x-2.5 text-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-xs font-black uppercase tracking-wider">
                  CCTV Source: <strong className="text-amber-400 font-mono">{selectedCamera}</strong> • SECTOR 4B
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
                <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  FPS: <strong className="text-emerald-400">30.0</strong>
                </span>
                <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  Latency: <strong className="text-amber-400">28ms</strong>
                </span>
                <button
                  onClick={handleRefreshStream}
                  className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-950 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                  title="Refresh video stream"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Video Screen with Bezel */}
            <div className="mt-4 relative bg-slate-950 rounded-2xl aspect-video border-2 border-slate-800/80 overflow-hidden shadow-2xl flex items-center justify-center group">
              {!streamError ? (
                <img
                  key={streamKey}
                  src={`/api/stream/${selectedCamera}`}
                  alt="Live Camera Feed"
                  onError={() => setStreamError(true)}
                  className="w-full h-full object-cover"
                />
              ) : null}

              {/* HUD Frame Elements */}
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                {/* Top HUD Line */}
                <div className="flex items-center justify-between">
                  <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 text-slate-200 px-3 py-1 rounded-xl text-[11px] font-mono font-bold shadow-lg flex items-center space-x-2">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>CONSTRUCTAI SOTA • {selectedCamera}</span>
                  </div>

                  <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-0.5 rounded-full font-mono font-bold animate-pulse flex items-center gap-1.5 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    REC • 1080P HD
                  </span>
                </div>

                {/* Center Offline State */}
                {streamError && (
                  <div className="text-center p-8 my-auto bg-slate-950/90 rounded-2xl border border-slate-800 max-w-md mx-auto pointer-events-auto">
                    <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-500 shadow-lg">
                      <Camera className="w-7 h-7 animate-pulse" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">Camera Waiting for Ingestion</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Launch <code className="text-amber-400 font-mono">python main.py</code> or double-click <code className="text-amber-400 font-mono">start.bat</code> to connect live CCTV frames.
                    </p>
                  </div>
                )}

                {/* Bottom Left Watermark */}
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                    ByteTrack MOT • Kalman Active
                  </span>
                </div>
              </div>
            </div>

            {/* Video Controls Footer */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-300">Neural Classes:</span>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">PERSON</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">HARDHAT</span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">SAFETY VEST</span>
                <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">CRANE PERIMETER</span>
              </div>
              <div className="font-mono text-slate-500 text-[11px]">Pipeline: YOLO11 + Shapely</div>
            </div>
          </div>

          <AlertWidget alerts={alerts} />
        </div>

        {/* Right Panel Telemetry */}
        <div className="space-y-6">
          {/* Real-time Safety Risk Score Badge */}
          <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Live Site Risk Level</h3>
              <span className={`text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full border ${
                riskStatus?.risk_level === 'SAFE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                riskStatus?.risk_level === 'CRITICAL' ? 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse' :
                'text-amber-400 bg-amber-500/10 border-amber-500/30'
              }`}>
                {riskStatus?.risk_level ?? 'MODERATE'}
              </span>
            </div>

            <div className="text-center py-2">
              <div className="text-5xl font-black text-slate-100 font-mono tracking-tight">
                {riskStatus?.overall_score ?? 84}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Site Safety Rating / 100 PTS</p>
            </div>
          </div>

          {/* Active Workers Monitored Panel */}
          <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2 text-slate-200">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Active Personnel ({workers.length || 4})</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                LIVE
              </span>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {(workers.length > 0 ? workers : [
                { worker_id: 'W-101', name: 'Marcus Vance', helmet_present: true, current_zone: 'Zone A - Assembly' },
                { worker_id: 'W-102', name: 'Elena Rostova', helmet_present: true, current_zone: 'Zone B - Fabrication' },
                { worker_id: 'W-103', name: 'David Chen', helmet_present: true, current_zone: 'Zone A - Assembly' },
                { worker_id: 'W-104', name: 'Sarah Jenkins', helmet_present: true, current_zone: 'Zone C - Scaffolding' },
              ]).map((w, idx) => (
                <div key={w.worker_id || idx} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-amber-400 text-[10px]">
                      {w.worker_id?.slice(-3) || 'W'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-100 block">{w.name || `Worker ${w.worker_id}`}</span>
                      <p className="text-[10px] text-slate-400 font-mono">{w.current_zone}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                    w.helmet_present !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                  }`}>
                    {w.helmet_present !== false ? 'HELMET: OK' : 'NO HELMET'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
