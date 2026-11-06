import React from 'react';
import { AlertOctagon, Target, User, MapPin, Search } from 'lucide-react';

export default function AiAlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <Search className="w-6 h-6 text-rose-400" /> Explainable AI Alerts
        </h2>
        <p className="text-sm text-slate-400">Reason-based feature scoring for transparent AI decisions.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-rose-950/10 max-w-2xl">
        <div className="flex justify-between items-start mb-6">
          <div className="bg-rose-500 text-rose-100 font-black px-3 py-1 rounded uppercase tracking-widest text-sm flex items-center gap-2">
            <AlertOctagon className="w-4 h-4"/> HIGH RISK - 87/100
          </div>
          <span className="text-slate-500 text-xs font-mono">ID: TKT-0992</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-mono text-slate-300">
          <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-500"/> Worker: W027 (Cross-Cam Re-ID)</div>
          <div className="flex items-center gap-2"><Target className="w-4 h-4 text-slate-500"/> Task: Welding</div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-500"/> Zone: Sector B</div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <h4 className="text-slate-400 text-xs font-bold uppercase mb-3">AI Reasoning:</h4>
          <ul className="space-y-2 text-sm text-slate-300 ml-4 list-disc marker:text-rose-500">
            <li>Face shield missing during welding task</li>
            <li>Classified as High-Risk physical task</li>
            <li>Worker history: Previous 2 violations recorded</li>
            <li>Restricted heavy-machinery zone nearby (3 meters)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
