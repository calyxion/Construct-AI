import React, { useState } from 'react';
import { Brain, Sparkles, RefreshCw, Shield, AlertTriangle, BookOpen, Gavel, ChevronDown, ChevronUp, Zap, Upload, X } from 'lucide-react';
import axios from 'axios';

const EVENT_TYPES = [
  { value: 'NO_HELMET',           label: '🪖 No Helmet',               severity: 'HIGH',     color: 'amber' },
  { value: 'NO_VEST',             label: '🦺 No Safety Vest',           severity: 'MEDIUM',   color: 'yellow' },
  { value: 'RESTRICTED_ENTRY',    label: '🚧 Restricted Zone Entry',    severity: 'CRITICAL', color: 'red' },
  { value: 'POSSIBLE_FALL',       label: '⬇️ Possible Worker Fall',     severity: 'CRITICAL', color: 'red' },
  { value: 'MACHINERY_PROXIMITY', label: '⚙️ Machinery Proximity',      severity: 'HIGH',     color: 'orange' },
  { value: 'ERGONOMIC_RISK',      label: '🦴 Ergonomic Posture Risk',   severity: 'MEDIUM',   color: 'purple' },
];

const SEV_STYLES = {
  CRITICAL: { cls: 'bg-red-950/30 border-red-500/50 text-red-400', badge: 'bg-red-500 text-white' },
  HIGH:     { cls: 'bg-amber-950/20 border-amber-500/40 text-amber-400', badge: 'bg-amber-500 text-slate-950' },
  MEDIUM:   { cls: 'bg-yellow-950/10 border-yellow-500/30 text-yellow-400', badge: 'bg-yellow-500 text-slate-950' },
};



export default function VlmExplainerPage() {
  const [eventType, setEventType] = useState('NO_HELMET');
  const [workerId, setWorkerId] = useState('W-103');
  const [zone, setZone] = useState('Zone B - Crane Area');
  const [confidence, setConfidence] = useState(0.94);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [usedDemo, setUsedDemo] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const payload = { event_type: eventType, worker_id: workerId, zone, confidence };
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const b64 = ev.target.result.split(',')[1];
          payload.image_base64 = b64;
          const resp = await axios.post('http://localhost:8000/api/vlm/explain', payload, { timeout: 30000 });
          setResult(resp.data);
          setUsedDemo(false);
          setIsLoading(false);
        };
        reader.readAsDataURL(selectedFile);
        return;
      }
      const resp = await axios.get(`http://localhost:8000/api/vlm/explain-text/${eventType}?worker_id=${workerId}&zone=${encodeURIComponent(zone)}`, { timeout: 10000 });
      setResult(resp.data);
      setUsedDemo(false);
    } catch (err) {
      console.error(err);
      alert('Error generating VLM report: ' + (err.response?.data?.detail || err.message));
    }
    setIsLoading(false);
  };

  const selectedEvent = EVENT_TYPES.find(e => e.value === eventType);
  const sevStyle = SEV_STYLES[result?.severity] || SEV_STYLES.MEDIUM;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-400 text-[10px] font-black font-mono uppercase tracking-wider">PHASE 2 — VLM</div>
            <span className="text-[11px] text-slate-500 font-mono">Moondream2 + Rule-Based Expert System</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-violet-400" />
            AI Incident Explainer — Vision Language Model
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            VLM generates human-readable safety incident narratives, danger assessments, corrective actions, and regulatory citations for every event type.
          </p>
        </div>
      </div>

      {/* VLM Tech Card */}
      <div className="glass-panel rounded-2xl p-4 border-violet-500/20 shadow-lg">
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { label: 'Primary Model', value: 'Moondream2 (vikhyatk/moondream2)', color: 'violet' },
            { label: 'Fallback', value: 'Rule-Based Expert System', color: 'blue' },
            { label: 'Framework', value: 'HuggingFace Transformers 5.x', color: 'amber' },
            { label: 'Context', value: 'Frame + Event + Pose Data Fusion', color: 'emerald' },
          ].map((t, i) => (
            <div key={i} className={`flex items-center gap-1.5 bg-${t.color}-500/10 border border-${t.color}-500/30 px-3 py-1.5 rounded-xl`}>
              <span className={`text-${t.color}-500 font-black`}>{t.label}:</span>
              <span className={`text-${t.color}-300 font-mono`}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4">
              <Sparkles className="w-4 h-4 text-violet-400" /> Generate Incident Report
            </h3>

            {/* Event Type Selector */}
            <div className="space-y-1.5 mb-4">
              <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Event Type</label>
              <div className="grid grid-cols-1 gap-1.5">
                {EVENT_TYPES.map(e => (
                  <button key={e.value} onClick={() => setEventType(e.value)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                      eventType === e.value
                        ? `bg-${e.color}-500/20 border-${e.color}-500/50 text-${e.color}-300`
                        : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                    }`}>
                    <span>{e.label}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      eventType === e.value ? `bg-${e.color}-500/30 text-${e.color}-400` : 'text-slate-600'
                    }`}>{e.severity}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Worker & Zone */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Worker ID</label>
                <input value={workerId} onChange={e => setWorkerId(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500/60" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Confidence</label>
                <input type="number" min="0.5" max="1.0" step="0.01" value={confidence}
                  onChange={e => setConfidence(parseFloat(e.target.value))}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500/60" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Zone</label>
              <input value={zone} onChange={e => setZone(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500/60" />
            </div>

            {/* Optional Image */}
            <div className="mb-4">
              <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Optional Frame (for Moondream2)</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="truncate">{selectedFile ? selectedFile.name : 'Upload CCTV Frame...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
                </label>
                {selectedFile && (
                  <button onClick={() => setSelectedFile(null)} className="p-2 text-slate-500 hover:text-red-400 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={isLoading}
              className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                isLoading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-lg shadow-violet-500/25'
              }`}>
              {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating AI Report...</> : <><Brain className="w-4 h-4" /> Generate VLM Report</>}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !isLoading && (
            <div className="glass-panel rounded-2xl p-14 text-center border border-dashed border-slate-700">
              <Brain className="w-12 h-12 text-violet-500/30 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-400">Select an event type and generate a report</h3>
              <p className="text-xs text-slate-600 mt-1.5">The VLM will produce a structured incident report with scene description, danger analysis, corrective action, and regulatory reference.</p>
            </div>
          )}

          {isLoading && (
            <div className="glass-panel rounded-2xl p-14 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin mx-auto mb-4"></div>
              <h3 className="text-base font-bold text-slate-300">Vision Language Model Processing...</h3>
              <p className="text-xs text-slate-500 mt-2">Moondream2 · multimodal reasoning · safety context fusion</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              

              {/* Title Banner */}
              <div className={`rounded-2xl p-5 border ${sevStyle.cls} shadow-xl`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${sevStyle.badge}`}>{result.severity}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{result.method === 'moondream2_vlm' ? '🤖 Moondream2 VLM' : '📋 Rule-Based Expert'}</span>
                    </div>
                    <h3 className="text-base font-black text-slate-100">{result.title}</h3>
                    <div className="flex gap-3 text-[11px] mt-2 text-slate-500 font-mono">
                      <span>Worker: <strong className="text-slate-300">{result.worker_id}</strong></span>
                      <span>Zone: <strong className="text-slate-300">{result.zone}</strong></span>
                      <span>Conf: <strong className="text-emerald-400">{Math.round(result.confidence * 100)}%</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VLM Narrative (if Moondream2 answered) */}
              {result.vlm_narrative && (
                <div className="glass-panel rounded-2xl p-5 border-violet-500/30 shadow-xl">
                  <h4 className="text-[11px] font-black text-violet-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Brain className="w-3.5 h-3.5" /> Moondream2 VLM Analysis ({result.vlm_latency_ms}ms)
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed italic">"{result.vlm_narrative}"</p>
                </div>
              )}

              {/* Incident Narrative */}
              <div className="glass-panel rounded-2xl p-5 shadow-xl">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">📋 Incident Narrative</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{result.narrative}</p>
              </div>

              {/* Three-column breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="glass-panel rounded-2xl p-4 shadow-xl border-slate-800/60">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Shield className="w-3 h-3 text-blue-400" /> Scene Analysis
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{result.scene}</p>
                </div>
                <div className="glass-panel rounded-2xl p-4 shadow-xl border-red-500/20">
                  <h4 className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3 h-3" /> Danger Assessment
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{result.danger}</p>
                </div>
                <div className="glass-panel rounded-2xl p-4 shadow-xl border-emerald-500/20">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3 h-3" /> Corrective Action
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{result.action}</p>
                </div>
              </div>

              {/* Regulatory */}
              <div className="glass-panel rounded-2xl p-4 border-amber-500/20 shadow-xl">
                <div className="flex items-start gap-2.5">
                  <Gavel className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">Regulatory Reference</h4>
                    <p className="text-xs text-slate-300">{result.regulatory}</p>
                  </div>
                </div>
              </div>

              {/* Raw JSON */}
              <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
                <button onClick={() => setShowRaw(p => !p)}
                  className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                  <span className="font-mono">{'{ } Raw JSON Output'}</span>
                  {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showRaw && (
                  <pre className="px-5 pb-5 text-[11px] font-mono text-emerald-400 bg-slate-950 overflow-x-auto max-h-64">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

