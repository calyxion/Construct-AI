import React from 'react';
import { HardHat, Activity, Wifi, UploadCloud, ShieldAlert, Sparkles } from 'lucide-react';

export default function Navbar({ activeScenario, onScenarioChange, wsStatus, onUploadClick }) {
  return (
    <header className="glass-panel border-b border-slate-800/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 shadow-2xl backdrop-blur-xl">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3.5">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative bg-slate-950 border border-amber-500/40 p-2.5 rounded-xl flex items-center justify-center text-amber-400 shadow-xl">
            <HardHat className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-black tracking-wider text-slate-100 uppercase">
              CONSTRUCT<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 font-extrabold">AI</span>
            </h1>
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AI SOTA ACTIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Next-Gen Computer Vision & Workforce Safety Intelligence</p>
        </div>
      </div>

      {/* Center & Right Actions */}
      <div className="flex items-center space-x-3">
        {/* Upload Media Button */}
        <button
          onClick={onUploadClick}
          className="group relative inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 cursor-pointer active:scale-95"
        >
          <UploadCloud className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          <span>Upload Media & Test</span>
        </button>

        {/* Demo Scenario Switcher */}
        <div className="flex items-center space-x-2.5 bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl shadow-inner">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Scenario:</span>
          <select
            value={activeScenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer transition-all"
          >
            <option value="scenario_1">🟢 Scenario 1: SAFE (Full PPE Compliance)</option>
            <option value="scenario_2">⚠️ Scenario 2: NO HELMET Violation</option>
            <option value="scenario_3">🚨 Scenario 3: RESTRICTED ZONE Breach</option>
            <option value="scenario_4">🚨 Scenario 4: CRITICAL WORKER FALL</option>
          </select>
        </div>

        {/* Telemetry Status Badges */}
        <div className="hidden lg:flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
            <Wifi className={`w-3.5 h-3.5 ${wsStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>WS: <strong className={wsStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>{wsStatus?.toUpperCase() || 'ONLINE'}</strong></span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>YOLO11 + ByteTrack</span>
          </div>
        </div>
      </div>
    </header>
  );
}
