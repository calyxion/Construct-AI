import React, { useState, useEffect } from 'react';
import { BarChart2, Activity, Shield, Users, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function WeeklyIntelligencePage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/analytics/weekly-intelligence');
        setData(res.data);
      } catch (e) {
        console.warn(e);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="text-slate-400">Loading Intelligence...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-blue-400" /> Weekly Site Intelligence
        </h2>
        <p className="text-sm text-slate-400">Admin dashboard summarizing safety and productivity KPIs.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Workers', val: data.kpi.total_workers, icon: Users, color: 'text-blue-400' },
          { label: 'Tasks', val: data.kpi.total_tasks, icon: Activity, color: 'text-emerald-400' },
          { label: 'PPE Compliance', val: `${data.kpi.ppe_compliance}%`, icon: Shield, color: 'text-violet-400' },
          { label: 'Fines Collected', val: `$${data.kpi.fines_collected}`, icon: CheckCircle, color: 'text-red-400' }
        ].map((k, i) => (
          <div key={i} className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">{k.label}</div>
              <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
            </div>
            <k.icon className={`w-8 h-8 opacity-20 ${k.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety-Adjusted Productivity */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Safety-Adjusted Productivity</h3>
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between text-slate-300"><span>Task Completion</span> <span>{data.safety_adjusted_productivity.task_completion}%</span></div>
            <div className="flex justify-between text-slate-300"><span>PPE Compliance</span> <span>{data.safety_adjusted_productivity.ppe_compliance}%</span></div>
            <div className="flex justify-between text-slate-300"><span>Safety Score</span> <span>{data.safety_adjusted_productivity.safety_score}</span></div>
            <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-2"><span>Risk Level</span> <span>{data.safety_adjusted_productivity.risk_level}</span></div>
            <div className="flex justify-between text-emerald-400 font-bold text-lg pt-2"><span>Safe Productivity</span> <span>{data.safety_adjusted_productivity.safe_productivity}%</span></div>
          </div>
        </div>

        {/* AI Summary Box */}
        <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-blue-950/20">
          <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-blue-500/20 pb-2 flex items-center gap-2">
            <Activity className="w-5 h-5"/> AI Executive Summary
          </h3>
          <p className="text-slate-300 leading-relaxed text-sm">
            {data.ai_summary}
          </p>
          <div className="mt-6 pt-4 border-t border-slate-800 flex gap-4 text-xs text-slate-500">
            <div>Violations: {data.kpi.total_violations}</div>
            <div>Near Misses: {data.kpi.near_misses}</div>
            <div>Critical Events: {data.kpi.critical_events}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
