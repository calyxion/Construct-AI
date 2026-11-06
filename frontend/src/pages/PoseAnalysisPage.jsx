import React, { useState, useRef } from 'react';
import { Activity, Upload, Crosshair, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Zap, Users, BarChart3, Layers, RefreshCw } from 'lucide-react';
import axios from 'axios';



const RISK_STYLES = {
  CRITICAL: { border: 'border-red-500/60', bg: 'bg-red-950/30', text: 'text-red-400', badge: 'bg-red-500 text-white', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' },
  HIGH:     { border: 'border-amber-500/50', bg: 'bg-amber-950/20', text: 'text-amber-400', badge: 'bg-amber-500 text-slate-950', glow: '' },
  WARNING:  { border: 'border-yellow-500/40', bg: 'bg-yellow-950/10', text: 'text-yellow-400', badge: 'bg-yellow-500 text-slate-950', glow: '' },
  SAFE:     { border: 'border-emerald-500/30', bg: 'bg-emerald-950/10', text: 'text-emerald-400', badge: 'bg-emerald-500 text-white', glow: '' },
};

export default function PoseAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [usedDemo, setUsedDemo] = useState(false);
  const fileRef = useRef();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setAnnotatedImage(null);
    setUsedDemo(false);
    const reader = new FileReader();
    reader.onload = (ev) => setFilePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const resp = await axios.post('http://localhost:8000/api/pose/analyse-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000
        });
        setResult(resp.data);
        if (resp.data.annotated_image_base64) {
          setAnnotatedImage(`data:image/jpeg;base64,${resp.data.annotated_image_base64}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to AI Backend: ' + (err.response?.data?.detail || err.message));
    }
    setIsAnalyzing(false);
  };

  const toggleExpanded = (idx) => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  const riskStyle = (risk) => RISK_STYLES[risk] || RISK_STYLES.SAFE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[10px] font-black font-mono uppercase tracking-wider">
              PHASE 2
            </div>
            <span className="text-[11px] text-slate-500 font-mono">YOLO11-Pose + 17-Keypoint Biomechanics</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-purple-400" />
            Ergonomic Posture & Fall Biomechanics Analysis
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            17-keypoint skeleton estimation — lumbar spine angle, fall trajectory vectors, overhead fatigue risk, and knee joint biomechanics.
          </p>
        </div>
        
      </div>

      {/* YOLO11-Pose Tech Badge */}
      <div className="glass-panel rounded-2xl p-4 border-purple-500/20 shadow-lg">
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { label: 'Model', value: 'YOLO11n-Pose', color: 'purple' },
            { label: 'Keypoints', value: '17-pt COCO Skeleton', color: 'blue' },
            { label: 'Lumbar Threshold', value: '45° Hazard / 30° Warning', color: 'amber' },
            { label: 'Fall Vector', value: '50° Lean + Aspect Ratio', color: 'red' },
            { label: 'Acceleration', value: 'ONNX FP16 + CUDA RTX 4050', color: 'emerald' },
          ].map((t, i) => (
            <div key={i} className={`flex items-center gap-1.5 bg-${t.color}-500/10 border border-${t.color}-500/30 px-3 py-1.5 rounded-xl`}>
              <span className={`text-${t.color}-500 font-black`}>{t.label}:</span>
              <span className={`text-${t.color}-300 font-mono`}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Upload */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4">
              <Upload className="w-4 h-4 text-purple-400" /> Upload Site Image or Frame
            </h3>

            <div
              onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center p-6 min-h-[140px] ${
                selectedFile ? 'border-purple-500/60 bg-purple-950/20' : 'border-slate-700 hover:border-purple-500/40 hover:bg-purple-950/10'
              }`}>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              {selectedFile ? (
                <div className="text-center">
                  <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-200">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-400">Drop image or click to upload</p>
                  <p className="text-[11px] text-slate-600 mt-1">CCTV frame, site photo, or video still</p>
                </div>
              )}
            </div>

            {filePreview && (
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 aspect-video bg-slate-950">
                <img src={annotatedImage || filePreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            <button
              onClick={handleRunAnalysis}
              disabled={!selectedFile || isAnalyzing}
              className={`mt-4 w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !selectedFile || isAnalyzing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/20'
              }`}>
              {isAnalyzing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Running YOLO11-Pose...</>
              ) : (
                <><Activity className="w-4 h-4" /> Analyse Biomechanics</>
              )}
            </button>
          </div>

          {/* Skeleton Keypoint Guide */}
          <div className="glass-panel rounded-2xl p-5 shadow-xl">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3">17-Keypoint COCO Skeleton</h4>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {['Nose', 'Left Eye', 'Right Eye', 'Left Ear', 'Right Ear', 'L Shoulder', 'R Shoulder', 'L Elbow', 'R Elbow', 'L Wrist', 'R Wrist', 'L Hip', 'R Hip', 'L Knee', 'R Knee', 'L Ankle', 'R Ankle'].map((kp, i) => (
                <div key={i} className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 font-mono font-black text-[9px] flex items-center justify-center shrink-0">{i}</span>
                  <span>{kp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !isAnalyzing && (
            <div className="glass-panel rounded-2xl p-14 text-center border border-dashed border-slate-700">
              <Activity className="w-12 h-12 text-purple-500/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-400">Upload a site image and run analysis</h3>
              <p className="text-xs text-slate-600 mt-1.5">YOLO11-Pose will detect all workers and analyse their posture for ergonomic risk.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="glass-panel rounded-2xl p-14 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin mx-auto mb-4"></div>
              <h3 className="text-base font-bold text-slate-300">YOLO11-Pose Inference Running...</h3>
              <p className="text-xs text-slate-500 mt-2">17-keypoint skeleton detection & biomechanical analysis</p>
            </div>
          )}

          {result && (
            <>
              

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Workers Detected', value: result.stats.total_workers, color: 'blue', icon: Users },
                  { label: 'Critical Posture', value: result.stats.critical_posture_count, color: 'red', icon: AlertTriangle },
                  { label: 'Falls Detected', value: result.stats.fall_detected_count, color: 'red', icon: Activity },
                  { label: 'Avg Lumbar Angle', value: `${result.stats.avg_lumbar_angle?.toFixed(1)}°`, color: 'amber', icon: BarChart3 },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4 text-center">
                    <s.icon className={`w-4 h-4 text-${s.color}-400 mx-auto mb-1.5`} />
                    <div className={`text-xl font-black font-mono text-${s.color}-400`}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Overall Risk Banner */}
              <div className={`rounded-2xl p-4 border ${riskStyle(result.overall_risk).border} ${riskStyle(result.overall_risk).bg} ${riskStyle(result.overall_risk).glow} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-black font-mono ${riskStyle(result.overall_risk).text}`}>
                    {result.overall_risk}
                  </span>
                  <span className="text-xs text-slate-400">— Overall Site Ergonomic Risk Level</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${riskStyle(result.overall_risk).badge}`}>
                  {result.total_workers} Worker{result.total_workers !== 1 ? 's' : ''} Analysed
                </span>
              </div>

              {/* Per-Worker Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-purple-400" /> Per-Worker Posture Analysis
                </h3>
                {result.workers.map((w, idx) => (
                  <div key={idx} className={`glass-panel rounded-2xl border ${riskStyle(w.analysis.posture_risk).border} shadow-lg overflow-hidden`}>
                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpanded(idx)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm font-mono border ${riskStyle(w.analysis.posture_risk).border} ${riskStyle(w.analysis.posture_risk).bg} ${riskStyle(w.analysis.posture_risk).text}`}>
                          {w.track_id || idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${riskStyle(w.analysis.posture_risk).badge}`}>
                              {w.analysis.posture_risk}
                            </span>
                            <span className="text-xs font-bold text-slate-300">Worker Track #{w.track_id || idx + 1}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 font-mono">
                            <span>Lumbar: <strong className="text-amber-400">{w.analysis.lumbar_angle}°</strong></span>
                            <span>Risk Score: <strong className={riskStyle(w.analysis.posture_risk).text}>{w.analysis.posture_risk_score}/100</strong></span>
                            <span>Conf: <strong className="text-emerald-400">{Math.round(w.confidence * 100)}%</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.analysis.fall_vector_detected && (
                          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">FALL DETECTED</span>
                        )}
                        {expanded[idx] ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>

                    {expanded[idx] && w.analysis.ergonomic_flags.length > 0 && (
                      <div className="px-4 pb-4 border-t border-slate-800/60 pt-3">
                        <h5 className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-wider">Ergonomic Risk Flags:</h5>
                        <ul className="space-y-1.5">
                          {w.analysis.ergonomic_flags.map((flag, fi) => (
                            <li key={fi} className={`text-xs flex items-start gap-2 px-3 py-2 rounded-lg ${riskStyle(w.analysis.posture_risk).bg} border ${riskStyle(w.analysis.posture_risk).border}`}>
                              <AlertTriangle className={`w-3.5 h-3.5 ${riskStyle(w.analysis.posture_risk).text} shrink-0 mt-0.5`} />
                              <span className="text-slate-300">{flag}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                          {[
                            { label: 'Lumbar Angle', value: `${w.analysis.lumbar_angle}°`, threshold: '45°' },
                            { label: 'Lean Angle', value: `${w.analysis.lean_angle}°`, threshold: '50°' },
                            { label: 'Posture Score', value: `${w.analysis.posture_risk_score}/100`, threshold: '>40=HIGH' },
                          ].map((m, mi) => (
                            <div key={mi} className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                              <div className="text-slate-500 text-[10px] uppercase font-semibold">{m.label}</div>
                              <div className={`text-base font-black font-mono mt-0.5 ${riskStyle(w.analysis.posture_risk).text}`}>{m.value}</div>
                              <div className="text-[10px] text-slate-600 mt-0.5">Threshold: {m.threshold}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

