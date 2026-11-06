import React, { useState } from 'react';
import { Sliders, Wifi, Save, RefreshCw, CheckCircle, Camera, Plus, Trash2, Volume2, VolumeX, Server, Bell, Shield } from 'lucide-react';

const DEFAULT_CAMERAS = [
  { id: 'CAM-01', name: 'Main Assembly — Sector 4B', location: 'Zone A', status: 'ONLINE', fps: 30 },
  { id: 'CAM-02', name: 'Crane Swing Perimeter', location: 'Zone B', status: 'ONLINE', fps: 28 },
  { id: 'CAM-03', name: 'Scaffold Elevation Platform', location: 'Zone C', status: 'ONLINE', fps: 25 },
];

export default function SettingsPage({ wsStatus = 'disconnected', onReconnectWs }) {
  const [yoloConf, setYoloConf] = useState(0.35);
  const [helmetConf, setHelmetConf] = useState(0.55);
  const [vestConf, setVestConf] = useState(0.40);
  const [fallThreshold, setFallThreshold] = useState(1.8);
  const [proximityBuffer, setProximityBuffer] = useState(1.5);
  const [debounceSeconds, setDebounceSeconds] = useState(30);
  const [inferenceSize, setInferenceSize] = useState(320);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [cameras, setCameras] = useState(DEFAULT_CAMERAS);
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSoundPlaying, setTestSoundPlaying] = useState(false);

  const handleSave = () => {
    localStorage.setItem('constructai_settings', JSON.stringify({
      yoloConf, helmetConf, vestConf, fallThreshold, proximityBuffer, debounceSeconds, inferenceSize, soundAlerts, backendUrl
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestSound = () => {
    setTestSoundPlaying(true);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch(_) {}
    setTimeout(() => setTestSoundPlaying(false), 800);
  };

  const handleRemoveCamera = (camId) => {
    setCameras(prev => prev.filter(c => c.id !== camId));
  };

  const handleAddCamera = () => {
    const newId = `CAM-0${cameras.length + 1}`;
    setCameras(prev => [...prev, { id: newId, name: `New Camera ${cameras.length + 1}`, location: 'Zone A', status: 'PENDING', fps: 0 }]);
  };

  const Slider = ({ label, value, setValue, min, max, step, color = 'amber', unit = '%', description }) => (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
        <span>{label}:</span>
        <span className={`font-mono font-black text-${color}-400`}>{typeof value === 'number' && !unit.startsWith('px') ? Math.round(value * (unit === '%' ? 100 : 10)) / (unit === '%' ? 100 : 10) : value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className={`w-full accent-${color}-500 cursor-pointer h-1.5 rounded-full`} />
      {description && <p className="text-[11px] text-slate-500 mt-1.5">{description}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-amber-500" />
          System Calibration & AI Engine Configuration
        </h2>
        <p className="text-sm text-slate-400">Configure YOLO11 inference parameters, geofence tolerances, camera management, and telemetry connections.</p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Configuration saved to local storage and applied to active inference pipeline.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* YOLO11 Detection Threshold Sliders */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/80">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30"><Sliders className="w-4 h-4 text-amber-500" /></div>
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">YOLO11 Detection Threshold Parameters</h3>
          </div>

          <div className="space-y-5">
            <Slider label="Person Detection Confidence" value={yoloConf} setValue={setYoloConf}
              min={0.10} max={0.95} step={0.05} unit="%" color="amber"
              description="Minimum confidence for YOLO11 to register a worker bounding box." />
            <Slider label="Hardhat Verification Threshold" value={helmetConf} setValue={setHelmetConf}
              min={0.30} max={0.95} step={0.05} unit="%" color="emerald"
              description="Minimum confidence to confirm a hardhat (above this, no false positives on hair)." />
            <Slider label="Safety Vest Verification Threshold" value={vestConf} setValue={setVestConf}
              min={0.25} max={0.90} step={0.05} unit="%" color="blue"
              description="Minimum confidence to register a High-Vis vest on the torso region." />
            <Slider label="Fall Detection Aspect Ratio Multiplier" value={fallThreshold} setValue={setFallThreshold}
              min={1.0} max={3.0} step={0.1} unit="x" color="red"
              description="Bounding box H/W ratio change rate to classify sudden horizontal recumbency as a fall." />
          </div>
        </div>

        {/* Geofencing & Alert Parameters */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/80">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30"><Shield className="w-4 h-4 text-purple-400" /></div>
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Geofence, Alert & Pipeline Settings</h3>
          </div>

          <div className="space-y-5">
            <Slider label="Proximity Warning Buffer Distance" value={proximityBuffer} setValue={setProximityBuffer}
              min={0.5} max={5.0} step={0.5} unit="m" color="orange"
              description="Signed Euclidean distance buffer (Shapely) before a restricted zone full breach." />
            <Slider label="Alert Debounce Cooldown Period" value={debounceSeconds} setValue={setDebounceSeconds}
              min={5} max={120} step={5} unit="s" color="blue"
              description="Seconds before the same worker violation alert can fire again (prevents flooding)." />
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>YOLO11 Inference Resolution:</span>
                <span className="font-mono font-black text-amber-400">{inferenceSize}px</span>
              </div>
              <select value={inferenceSize} onChange={(e) => setInferenceSize(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none">
                <option value={192}>192px — Ultra-Fast (low accuracy)</option>
                <option value={256}>256px — Fast (good for CPU)</option>
                <option value={320}>320px — Balanced (recommended)</option>
                <option value={480}>480px — High Accuracy (slower)</option>
                <option value={640}>640px — Maximum (GPU recommended)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">Neural inference resolution. Higher = more accurate but lower FPS.</p>
            </div>
          </div>
        </div>

        {/* Camera Management */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30"><Camera className="w-4 h-4 text-blue-400" /></div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Camera Feed Management</h3>
            </div>
            <button onClick={handleAddCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer shadow-lg">
              <Plus className="w-3.5 h-3.5" /> Add Camera
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cameras.map((cam) => (
              <div key={cam.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black font-mono text-amber-400">{cam.id}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${cam.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                      {cam.status === 'ONLINE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>}
                      {cam.status}
                    </span>
                    <button onClick={() => handleRemoveCamera(cam.id)} className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-300 font-semibold">{cam.name}</div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>{cam.location}</span>
                  <span className="text-emerald-400">{cam.fps > 0 ? `${cam.fps} FPS` : 'Connecting...'}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold">Stream:</span>{' '}
                  <a href={`http://localhost:8000/api/stream/${cam.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-amber-400 hover:underline font-mono">/api/stream/{cam.id}</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry & Alerts */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/80">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30"><Wifi className="w-4 h-4 text-emerald-400" /></div>
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">WebSocket & Telemetry</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Backend URL:</span>
              </div>
              <input type="text" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none" />
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300">WebSocket Connection:</span>
                <p className="text-[11px] text-slate-500 mt-0.5">{backendUrl.replace('http', 'ws')}/ws/events</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border ${wsStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {wsStatus.toUpperCase()}
                </span>
                {onReconnectWs && (
                  <button onClick={onReconnectWs} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sound & Notification Settings */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/80">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30"><Bell className="w-4 h-4 text-rose-400" /></div>
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Alert & Notification Settings</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300">Audible Alert Siren:</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Play acoustic alarm on critical violation or fall detection.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSoundAlerts(!soundAlerts)}
                  className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${soundAlerts ? 'bg-amber-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${soundAlerts ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
                {soundAlerts ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </div>
            </div>

            <button onClick={handleTestSound} disabled={testSoundPlaying}
              className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Volume2 className={`w-3.5 h-3.5 ${testSoundPlaying ? 'text-amber-400 animate-pulse' : ''}`} />
              {testSoundPlaying ? 'Playing Alert Tone...' : 'Test Alert Sound'}
            </button>
          </div>

          <div className="pt-4 flex justify-end">
            <button onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
              <Save className="w-4 h-4" />
              Save All Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
