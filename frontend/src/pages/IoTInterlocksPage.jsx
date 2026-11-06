import React, { useState, useEffect } from 'react';
import { ShieldAlert, Volume2, StopCircle, HardHat, Link2, PowerOff, Zap } from 'lucide-react';
import axios from 'axios';

export default function IoTInterlocksPage() {
  const [iotStatus, setIotStatus] = useState({ siren_active: false, crane_estop_engaged: false });
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/iot/status');
      setIotStatus(res.data);
    } catch (e) { console.warn(e); }
  };

  // Web Audio API for actual sound
  const audioCtxRef = React.useRef(null);
  const oscRef = React.useRef(null);
  const gainRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  const startSound = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    oscRef.current = ctx.createOscillator();
    gainRef.current = ctx.createGain();
    
    oscRef.current.type = 'square'; // Harsh industrial sound
    oscRef.current.frequency.setValueAtTime(600, ctx.currentTime);
    
    // Siren wobble effect (600hz to 1000hz)
    intervalRef.current = setInterval(() => {
      if (oscRef.current) {
        oscRef.current.frequency.setValueAtTime(1000, ctx.currentTime);
        setTimeout(() => {
          if (oscRef.current) oscRef.current.frequency.setValueAtTime(600, ctx.currentTime);
        }, 400);
      }
    }, 800);

    oscRef.current.connect(gainRef.current);
    gainRef.current.connect(ctx.destination);
    
    gainRef.current.gain.setValueAtTime(0.15, ctx.currentTime); // 15% volume
    oscRef.current.start();
  };

  const stopSound = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (oscRef.current) {
      oscRef.current.stop();
      oscRef.current.disconnect();
      oscRef.current = null;
    }
  };

  useEffect(() => {
    if (iotStatus.siren_active) {
      startSound();
    } else {
      stopSound();
    }
    return () => stopSound();
  }, [iotStatus.siren_active]);

  useEffect(() => {
    fetchStatus();
    const int = setInterval(fetchStatus, 2000);
    return () => clearInterval(int);
  }, []);

  const triggerSiren = async () => {
    setIsLoading(true);
    await axios.post('http://localhost:8000/api/iot/siren/trigger');
    await fetchStatus();
    setIsLoading(false);
  };
  const resetSiren = async () => {
    setIsLoading(true);
    await axios.post('http://localhost:8000/api/iot/siren/reset');
    await fetchStatus();
    setIsLoading(false);
  };
  const triggerEstop = async () => {
    setIsLoading(true);
    await axios.post('http://localhost:8000/api/iot/crane/estop/CRANE-01');
    await fetchStatus();
    setIsLoading(false);
  };
  const resetEstop = async () => {
    setIsLoading(true);
    await axios.post('http://localhost:8000/api/iot/crane/reset/CRANE-01');
    await fetchStatus();
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[10px] font-black font-mono uppercase tracking-wider">PHASE 3</div>
          <span className="text-[11px] text-slate-500 font-mono">Modbus TCP / Physical PLC Relays</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-orange-400" /> Hardware Safety Interlocks
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Control physical site hardware (sirens, crane e-stops) based on AI vision triggers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Siren Control */}
        <div className={`glass-panel p-6 rounded-2xl border transition-all ${iotStatus.siren_active ? 'border-orange-500/50 bg-orange-950/20 shadow-[0_0_30px_rgba(249,115,22,0.15)]' : 'border-slate-800'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${iotStatus.siren_active ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                <Volume2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-200">Acoustic Siren Relay</h3>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5"><Link2 className="w-3 h-3"/> Modbus: REG_SIREN_STATE (100)</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded border text-[10px] font-black font-mono ${iotStatus.siren_active ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
              {iotStatus.siren_active ? 'TRIGGERED (LOUD)' : 'STANDBY'}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={triggerSiren} disabled={iotStatus.siren_active || isLoading} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${iotStatus.siren_active ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}>
              Trigger Siren (Test)
            </button>
            <button onClick={resetSiren} disabled={!iotStatus.siren_active || isLoading} className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase transition-all ${!iotStatus.siren_active ? 'border-slate-800 text-slate-600 cursor-not-allowed' : 'border-slate-600 hover:border-slate-400 text-slate-300 bg-slate-800'}`}>
              Reset Relay
            </button>
          </div>
        </div>

        {/* Crane E-Stop */}
        <div className={`glass-panel p-6 rounded-2xl border transition-all ${iotStatus.crane_estop_engaged ? 'border-red-500/50 bg-red-950/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-slate-800'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${iotStatus.crane_estop_engaged ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                <StopCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-200">Crane E-Stop Interlock</h3>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5"><Link2 className="w-3 h-3"/> Modbus: REG_CRANE_ESTOP (101)</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded border text-[10px] font-black font-mono ${iotStatus.crane_estop_engaged ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
              {iotStatus.crane_estop_engaged ? 'E-STOP ENGAGED' : 'OPERATIONAL'}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={triggerEstop} disabled={iotStatus.crane_estop_engaged || isLoading} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${iotStatus.crane_estop_engaged ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'}`}>
              <PowerOff className="w-4 h-4" /> Halt Crane!
            </button>
            <button onClick={resetEstop} disabled={!iotStatus.crane_estop_engaged || isLoading} className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${!iotStatus.crane_estop_engaged ? 'border-slate-800 text-slate-600 cursor-not-allowed' : 'border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400'}`}>
              <Zap className="w-4 h-4" /> Restore Power
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

