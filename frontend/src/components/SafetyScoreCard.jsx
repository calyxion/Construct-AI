import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';

export default function SafetyScoreCard({ riskStatus }) {
  const score = Math.round(riskStatus?.overall_score ?? 84);
  const level = riskStatus?.risk_level ?? 'MODERATE';
  const recommendations = riskStatus?.recommendations ?? ["Maintain current compliance standards."];
  const breakdown = riskStatus?.breakdown ?? {};

  const getLevelBadge = (lvl) => {
    switch (lvl) {
      case 'SAFE':
        return { 
          color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', 
          stroke: '#10b981',
          glow: 'glow-emerald',
          label: 'SAFE SITE', 
          icon: ShieldCheck 
        };
      case 'MODERATE':
        return { 
          color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', 
          stroke: '#f59e0b',
          glow: 'glow-amber',
          label: 'MODERATE RISK', 
          icon: AlertTriangle 
        };
      case 'HIGH':
        return { 
          color: 'text-orange-400 border-orange-500/40 bg-orange-500/10', 
          stroke: '#f97316',
          glow: 'glow-amber',
          label: 'HIGH RISK', 
          icon: AlertTriangle 
        };
      default:
        return { 
          color: 'text-red-400 border-red-500/40 bg-red-500/10', 
          stroke: '#ef4444',
          glow: 'glow-red',
          label: 'CRITICAL RISK', 
          icon: ShieldAlert 
        };
    }
  };

  const badge = getLevelBadge(level);
  const BadgeIcon = badge.icon;

  // SVG Circular Gauge calculation
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Live Safety Risk Index
          </h3>
          <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${badge.color} flex items-center space-x-1.5 shadow-sm`}>
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </span>
        </div>

        {/* Circular SVG Gauge Dial */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              {/* Background Track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Progress Arc */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                stroke={badge.stroke}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-black text-slate-100 font-mono tracking-tight">{score}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ 100 PTS</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">Dynamic Risk Score Engine</p>
        </div>

        {/* Penalty Deductions Breakdown */}
        <div className="space-y-2 text-xs border-t border-slate-800/80 pt-4 font-mono">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px]">Hardhat Non-Compliance:</span>
            <span className={`font-bold ${breakdown.missing_helmet_penalties > 0 ? 'text-red-400' : 'text-slate-500'}`}>
              -{breakdown.missing_helmet_penalties ?? 0} pts
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px]">Safety Vest Omission:</span>
            <span className={`font-bold ${breakdown.missing_vest_penalties > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
              -{breakdown.missing_vest_penalties ?? 0} pts
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px]">Geofence Zone Intrusion:</span>
            <span className={`font-bold ${breakdown.restricted_zone_penalties > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
              -{breakdown.restricted_zone_penalties ?? 0} pts
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px]">Worker Fall Displacement:</span>
            <span className={`font-bold ${breakdown.fall_penalties > 0 ? 'text-red-500' : 'text-slate-500'}`}>
              -{breakdown.fall_penalties ?? 0} pts
            </span>
          </div>
        </div>
      </div>

      {/* Safety Recommendations */}
      <div className="mt-5 pt-3.5 bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-xl shadow-inner">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold mb-1.5">
          <Lightbulb className="w-4 h-4 animate-pulse" />
          <span className="uppercase tracking-wider">AI Safety Recommendation:</span>
        </div>
        <p className="text-xs text-slate-300 italic leading-relaxed">
          "{recommendations[0]}"
        </p>
      </div>
    </div>
  );
}
