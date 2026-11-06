import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Info, Clock } from 'lucide-react';

function timeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function AlertWidget({ alerts = [] }) {
  const getSeverityStyle = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return { bg: 'bg-red-950/50 border-red-500/50', badge: 'bg-red-500 text-white', icon: ShieldAlert, iconColor: 'text-red-400', pulse: true };
      case 'HIGH':
        return { bg: 'bg-amber-950/40 border-amber-500/40', badge: 'bg-amber-500 text-slate-950', icon: AlertTriangle, iconColor: 'text-amber-400', pulse: false };
      default:
        return { bg: 'bg-blue-950/30 border-blue-500/30', badge: 'bg-blue-500 text-white', icon: Info, iconColor: 'text-blue-400', pulse: false };
    }
  };

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Real-Time Safety Alert Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          {alerts.filter(a => a.severity === 'CRITICAL').length > 0 && (
            <span className="text-[10px] bg-red-500 text-white font-black px-2 py-0.5 rounded-full font-mono animate-pulse">
              {alerts.filter(a => a.severity === 'CRITICAL').length} CRITICAL
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {alerts.length} Events
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
        {alerts.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm text-slate-200 font-extrabold">All Systems Clear</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px] mx-auto">No active safety violations detected across all monitoring feeds.</p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const style = getSeverityStyle(alert.severity);
            const Icon = style.icon;
            const isCritical = alert.severity === 'CRITICAL';
            return (
              <div key={alert.alert_id || alert.id || index}
                className={`p-4 rounded-xl border ${style.bg} transition-all duration-150 hover:brightness-110 shadow-sm`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <Icon className={`w-5 h-5 ${style.iconColor} shrink-0 mt-0.5 ${style.pulse ? 'animate-pulse' : ''}`} />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${style.badge}`}>
                          {alert.severity}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-100 uppercase tracking-tight">
                          {(alert.event_type || 'SAFETY VIOLATION').replace(/_/g, ' ')}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Worker: <strong className="text-slate-200">{alert.worker_id || 'Unknown'}</strong>
                        {' '}| Zone: <strong className="text-amber-400">{alert.zone || alert.zone_id || 'Site'}</strong>
                        {' '}| Conf: <strong className="text-emerald-400">{Math.round((alert.confidence || 0.92) * 100)}%</strong>
                      </p>
                      {alert.recommendation && (
                        <p className="text-[11px] text-slate-400 mt-1.5 italic border-t border-slate-700/60 pt-1.5">
                          ▸ {alert.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(alert.timestamp)}
                    </span>
                    {isCritical && (
                      <button onClick={playAlertSound}
                        className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono cursor-pointer hover:bg-red-500/30 transition-colors">
                        ⚠ SOUND
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
