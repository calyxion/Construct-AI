import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'amber', trend, onClick }) {
  const colorMap = {
    amber: {
      badge: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
      glow: 'from-amber-500/10 to-transparent',
      border: 'hover:border-amber-500/50'
    },
    red: {
      badge: 'border-red-500/40 text-red-400 bg-red-500/10',
      glow: 'from-red-500/10 to-transparent',
      border: 'hover:border-red-500/50'
    },
    emerald: {
      badge: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      glow: 'from-emerald-500/10 to-transparent',
      border: 'hover:border-emerald-500/50'
    },
    blue: {
      badge: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
      glow: 'from-blue-500/10 to-transparent',
      border: 'hover:border-blue-500/50'
    },
  };

  const scheme = colorMap[color] || colorMap.amber;

  return (
    <div 
      onClick={onClick}
      className={`glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden group transition-all duration-300 ${scheme.border} hover:-translate-y-1 hover:shadow-2xl ${onClick ? 'cursor-pointer active:scale-98' : ''}`}
    >
      {/* Ambient Top Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${scheme.glow} rounded-full blur-2xl pointer-events-none`}></div>

      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black text-slate-100 mt-2 font-mono tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3.5 rounded-2xl border ${scheme.badge} shadow-lg shadow-black/40 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span>▲</span> {trend}
          </span>
          <span className="text-slate-500 text-[11px]">{onClick ? 'Click to Open ➜' : 'Real-Time Pulse'}</span>
        </div>
      )}
    </div>
  );
}
