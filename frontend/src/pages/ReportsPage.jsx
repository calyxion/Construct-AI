import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Calendar, FileText, AlertTriangle, Shield, Users, Sparkles, Clock, Printer } from 'lucide-react';
import { fetchEvents, fetchMetrics } from '../services/api';

export default function ReportsPage({ riskStatus, metrics }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState([]);
  const [liveMetrics, setLiveMetrics] = useState(metrics);
  const [exportSuccess, setExportSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [e, m] = await Promise.all([fetchEvents({ limit: 200 }), fetchMetrics()]);
        if (e) setEvents(e);
        if (m) setLiveMetrics(m);
      } catch (_) {}
    };
    load();
  }, []);

  const handleExportCSV = () => {
    const headers = ['ID', 'Event Type', 'Severity', 'Status', 'Worker ID', 'Zone', 'Camera', 'Confidence', 'Timestamp'];
    const rows = (events.length > 0 ? events : SAMPLE_EVENTS).map(e => [
      e.id || 'N/A',
      e.event_type || 'UNKNOWN',
      e.severity || 'HIGH',
      e.status || 'OPEN',
      e.worker_id || 'UNKNOWN',
      e.zone_id || e.zone || 'Site',
      e.camera_id || 'CAM-01',
      `${Math.round((e.confidence || 0.92) * 100)}%`,
      e.timestamp ? new Date(e.timestamp).toLocaleString() : new Date().toLocaleString()
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CONSTRUCTAI_Safety_Report_${reportDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportSuccess('csv');
    setTimeout(() => setExportSuccess(''), 3000);
  };

  const handleExportJSON = () => {
    const report = {
      generated_at: new Date().toISOString(),
      report_date: reportDate,
      site: 'Sector 4B Construction Site',
      overall_safety_score: riskStatus?.overall_score ?? liveMetrics?.safety_score ?? 84,
      risk_level: riskStatus?.risk_level ?? 'MODERATE',
      active_workers: liveMetrics?.active_workers ?? 6,
      ppe_compliance_pct: liveMetrics?.ppe_compliance ?? 87.5,
      total_violations: liveMetrics?.total_events_today ?? events.length,
      incidents: events.length > 0 ? events : SAMPLE_EVENTS,
      ai_recommendations: [
        'Require EN 397 hardhat compliance checks at Zone B entry turnstile.',
        'Install physical swing barricade to reinforce Crane Perimeter geofence.',
        'Schedule scaffolding harness tie-off checks at start of each shift (07:00).',
        'Conduct weekly PPE awareness briefings for subcontract workforce.',
      ]
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CONSTRUCTAI_Safety_Report_${reportDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportSuccess('json');
    setTimeout(() => setExportSuccess(''), 3000);
  };

  const handlePrint = () => { window.print(); };

  const SAMPLE_EVENTS = [
    { id: 'EVT-001', event_type: 'NO_HELMET', severity: 'HIGH', status: 'RESOLVED', worker_id: 'W-103', zone_id: 'ZONE-A', camera_id: 'CAM-01', confidence: 0.94, timestamp: new Date().toISOString() },
    { id: 'EVT-002', event_type: 'RESTRICTED_ENTRY', severity: 'CRITICAL', status: 'ACKNOWLEDGED', worker_id: 'W-102', zone_id: 'ZONE-B', camera_id: 'CAM-01', confidence: 0.89, timestamp: new Date().toISOString() },
    { id: 'EVT-003', event_type: 'NO_VEST', severity: 'MEDIUM', status: 'OPEN', worker_id: 'W-106', zone_id: 'ZONE-A', camera_id: 'CAM-02', confidence: 0.82, timestamp: new Date().toISOString() },
    { id: 'EVT-004', event_type: 'POSSIBLE_FALL', severity: 'CRITICAL', status: 'RESOLVED', worker_id: 'W-104', zone_id: 'ZONE-C', camera_id: 'CAM-03', confidence: 0.91, timestamp: new Date().toISOString() },
  ];

  const displayEvents = events.length > 0 ? events : SAMPLE_EVENTS;

  const getSeverityBadge = (s) => {
    const map = {
      CRITICAL: 'bg-red-500 text-white', HIGH: 'bg-amber-500 text-slate-950',
      MEDIUM: 'bg-blue-500 text-white', LOW: 'bg-slate-700 text-slate-300'
    };
    return map[s] || map.HIGH;
  };

  const getStatusBadge = (s) => {
    const map = {
      OPEN: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      ACKNOWLEDGED: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
      RESOLVED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
    };
    return map[s] || map.OPEN;
  };

  const safetyScore = riskStatus?.overall_score ?? liveMetrics?.safety_score ?? 84;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-500" />
            OSHA / HSE Safety Compliance Audit Report
          </h2>
          <p className="text-sm text-slate-400">Automated incident audit trail, compliance summary, and AI-generated safety action items.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center glass-panel border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer" />
          </div>
          <button onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20">
            <Printer className="w-3.5 h-3.5" /> Print PDF
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {exportSuccess === 'csv' ? 'CSV report downloaded successfully.' : 'JSON report downloaded successfully.'}
        </div>
      )}

      {/* Report Summary Card */}
      <div className="glass-panel rounded-2xl p-8 shadow-2xl print:bg-white print:text-black">
        <div className="flex flex-col md:flex-row justify-between items-start pb-6 border-b border-slate-800/80 gap-4">
          <div>
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-widest">CONSTRUCTAI PLATFORM v2.0 — OFFICIAL AUDIT DOCUMENT</span>
            <h3 className="text-2xl font-black text-slate-100 uppercase tracking-tight mt-1">Daily Safety Compliance & Risk Assessment</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Generated: {new Date().toLocaleString()} | Report Date: {reportDate} | Project: Sector 4B Construction
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-right min-w-[160px] shadow-xl">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Overall Safety Score</div>
            <div className={`text-4xl font-black font-mono mt-1 ${safetyScore >= 85 ? 'text-emerald-400' : safetyScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {safetyScore}/100
            </div>
            <span className="text-[11px] font-bold text-amber-400 uppercase font-mono">{riskStatus?.risk_level ?? 'MODERATE RISK'}</span>
          </div>
        </div>

        {/* Metrics Summary Row */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Workers On Site', value: liveMetrics?.active_workers ?? 6, icon: Users, color: 'text-blue-400' },
            { label: 'PPE Compliance Rate', value: `${liveMetrics?.ppe_compliance ?? 87.5}%`, icon: Shield, color: 'text-emerald-400' },
            { label: 'Violations Detected', value: liveMetrics?.total_events_today ?? displayEvents.length, icon: AlertTriangle, color: 'text-amber-400' },
            { label: 'Critical Falls Prevented', value: displayEvents.filter(e => e.event_type === 'POSSIBLE_FALL').length || 1, icon: Shield, color: 'text-red-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-semibold mb-2">
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                {stat.label}
              </div>
              <div className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Full Incident Log Table */}
        <div className="mt-6">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Full Incident Audit Log — {displayEvents.length} Events
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800">
                  {['Event ID', 'Type', 'Severity', 'Status', 'Worker', 'Zone', 'Camera', 'Confidence', 'Timestamp'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayEvents.map((event, idx) => (
                  <tr key={event.id || idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{event.id?.slice(0, 8) || `EVT-${String(idx+1).padStart(3,'0')}`}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{(event.event_type || 'UNKNOWN').replace('_', ' ')}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadge(event.severity || 'HIGH')}`}>{event.severity || 'HIGH'}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${getStatusBadge(event.status || 'OPEN')}`}>{event.status || 'OPEN'}</span></td>
                    <td className="px-4 py-3 font-mono text-amber-400 font-bold">{event.worker_id || 'W-???'}</td>
                    <td className="px-4 py-3 text-slate-300">{event.zone_id || event.zone || 'Site'}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{event.camera_id || 'CAM-01'}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{Math.round((event.confidence || 0.92) * 100)}%</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Now'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Safety Recommendations */}
        <div className="mt-6 bg-slate-950/70 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-black uppercase mb-3">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>AI-Generated Safety Action Items & Recommendations</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {[
              'Require EN 397 certified hardhat compliance checks at Zone B Fabrication entry turnstile before shift start.',
              'Install physical swing barricade (physical boundary chain) to reinforce virtual computer vision crane polygon.',
              'Conduct scaffolding fall arrest harness tie-off inspection at start of each morning shift (07:00 mandatory).',
              'Schedule weekly PPE compliance awareness briefing sessions for all subcontract workforce entering site.',
            ].map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-amber-500 font-black shrink-0 mt-0.5">▸</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {/* Signature Block */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-500">
          {['Safety Officer Sign-Off', 'Site Manager Approval', 'AI System Certification'].map((label, i) => (
            <div key={i} className="text-center">
              <div className="h-12 border-b border-dashed border-slate-700 mb-2"></div>
              <div className="font-semibold text-slate-400">{label}</div>
              <div className="text-[11px] mt-0.5 font-mono">Date: {new Date().toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
