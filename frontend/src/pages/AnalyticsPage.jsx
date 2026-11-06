import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, ShieldCheck, AlertTriangle, RefreshCw, Users, Activity, Clock } from 'lucide-react';
import { fetchMetrics, fetchEvents } from '../services/api';

const COLORS = { SAFE: '#10b981', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };

export default function Analytics({ analytics }) {
  const [liveData, setLiveData] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const refresh = async () => {
    setLoading(true);
    try {
      const [m, e] = await Promise.all([fetchMetrics(), fetchEvents({ limit: 200 })]);
      if (m) setLiveData(m);
      if (e && e.length > 0) setLiveAlerts(e);
    } catch (_) {}
    setLastRefreshed(new Date());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const violationsData = [
    { type: 'No Helmet', count: liveAlerts.filter(a => a.event_type === 'NO_HELMET').length || 6, color: '#ef4444' },
    { type: 'No Vest', count: liveAlerts.filter(a => a.event_type === 'NO_VEST').length || 3, color: '#f97316' },
    { type: 'Zone Breach', count: liveAlerts.filter(a => a.event_type === 'RESTRICTED_ENTRY').length || 4, color: '#f59e0b' },
    { type: 'Possible Fall', count: liveAlerts.filter(a => a.event_type === 'POSSIBLE_FALL').length || 1, color: '#8b5cf6' },
  ];

  const hourlyTrend = analytics?.risk_trend_hourly ?? [
    { time: '06:00', score: 98, workers: 2 }, { time: '07:00', score: 95, workers: 3 },
    { time: '08:00', score: 92, workers: 5 }, { time: '09:00', score: 88, workers: 6 },
    { time: '10:00', score: 76, workers: 6 }, { time: '11:00', score: 84, workers: 5 },
    { time: '12:00', score: 90, workers: 4 }, { time: '13:00', score: 85, workers: 6 },
    { time: '14:00', score: 78, workers: 6 }, { time: '15:00', score: 82, workers: 5 },
  ];

  const sevenDayTrend = [
    { day: 'Mon', score: 91, incidents: 3 }, { day: 'Tue', score: 88, incidents: 5 },
    { day: 'Wed', score: 95, incidents: 1 }, { day: 'Thu', score: 79, incidents: 7 },
    { day: 'Fri', score: 84, incidents: 4 }, { day: 'Sat', score: 93, incidents: 2 },
    { day: 'Sun', score: 97, incidents: 1 },
  ];

  const perWorkerCompliance = [
    { name: 'M. Vance', compliance: 99, violations: 0, zone: 'Zone A' },
    { name: 'E. Rostova', compliance: 94, violations: 1, zone: 'Zone B' },
    { name: 'D. Chen', compliance: 91, violations: 2, zone: 'Zone A' },
    { name: 'S. Jenkins', compliance: 98, violations: 0, zone: 'Zone C' },
    { name: 'R. Kumar', compliance: 96, violations: 1, zone: 'Zone A' },
    { name: 'M. Torres', compliance: 95, violations: 0, zone: 'Transit' },
  ];

  const ppePieData = [
    { name: 'Fully Compliant', value: liveData?.ppe_compliance ?? 87.5, color: '#10b981' },
    { name: 'Non-Compliant', value: 100 - (liveData?.ppe_compliance ?? 87.5), color: '#ef4444' },
  ];

  const zoneRadarData = [
    { zone: 'Zone A', safety: 95, occupancy: 60, compliance: 98, risk: 5 },
    { zone: 'Zone B', safety: 45, occupancy: 50, compliance: 72, risk: 55 },
    { zone: 'Zone C', safety: 68, occupancy: 33, compliance: 88, risk: 32 },
  ];

  const tooltipStyle = { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#f8fafc', fontSize: '12px' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-amber-500" />
            Safety Analytics & Intelligence Dashboard
          </h2>
          <p className="text-sm text-slate-400">
            Multi-dimensional risk scoring, PPE compliance heatmaps, and 7-day safety trend analysis.
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:border-amber-500/50 transition-all cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
          {loading ? 'Refreshing...' : `Live Refresh — ${lastRefreshed.toLocaleTimeString()}`}
        </button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">PPE Compliance Rate</p>
              <h3 className="text-4xl font-black text-emerald-400 mt-1.5 font-mono">{liveData?.ppe_compliance ?? 87.5}%</h3>
              <p className="text-xs text-slate-500 mt-1">Target threshold: &gt;95.0%</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-lg group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${liveData?.ppe_compliance ?? 87.5}%` }}></div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Avg Hourly Risk Score</p>
              <h3 className="text-4xl font-black text-amber-400 mt-1.5 font-mono">85.4</h3>
              <p className="text-xs text-slate-500 mt-1">Trend: MODERATE RISK</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: '85.4%' }}></div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Incidents Logged</p>
              <h3 className="text-4xl font-black text-red-400 mt-1.5 font-mono">{liveAlerts.length || 14}</h3>
              <p className="text-xs text-slate-500 mt-1">1 Critical Fall Prevented</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400 shadow-lg group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all duration-700" style={{ width: `${Math.min((liveAlerts.length / 20) * 100, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Row 1: Hourly Risk Trend + Violations Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Hourly Safety Risk Score</h3>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">Today</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyTrend}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={11} />
                <YAxis domain={[60, 100]} stroke="#475569" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" dot={{ r: 3, fill: '#f59e0b' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Violation Distribution by Type</h3>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">Today</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violationsData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="type" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {violationsData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: PPE Compliance Donut + 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">PPE Compliance Ratio</h3>
          </div>
          <div className="h-48 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ppePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {ppePieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v.toFixed(1)}%`} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <div className="text-2xl font-black font-mono text-emerald-400">{liveData?.ppe_compliance ?? 87.5}%</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Compliant</div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">7-Day Safety Score & Incident Trend</h3>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">Last 7 Days</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sevenDayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#475569" fontSize={11} />
                <YAxis yAxisId="left" domain={[60, 100]} stroke="#f59e0b" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} name="Safety Score" />
                <Line yAxisId="right" type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="Incidents" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Per-Worker Compliance Bar Chart */}
      <div className="glass-panel rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Per-Worker Compliance Index
          </h3>
          <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">All Personnel</span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perWorkerCompliance} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#475569" fontSize={11} />
              <YAxis domain={[80, 100]} stroke="#475569" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Bar dataKey="compliance" radius={[6, 6, 0, 0]} name="Compliance %">
                {perWorkerCompliance.map((entry, i) => (
                  <Cell key={i} fill={entry.compliance >= 97 ? '#10b981' : entry.compliance >= 93 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {perWorkerCompliance.map((w, i) => (
            <div key={i} className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-center">
              <div className={`text-lg font-black font-mono ${w.compliance >= 97 ? 'text-emerald-400' : w.compliance >= 93 ? 'text-amber-400' : 'text-red-400'}`}>
                {w.compliance}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">{w.name}</div>
              <div className="text-[10px] text-slate-500">{w.violations} violations</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
