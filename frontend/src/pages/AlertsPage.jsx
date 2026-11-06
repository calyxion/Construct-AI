import React, { useState, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Filter, Check, Clock, Eye, Sparkles, Search, Download, X } from 'lucide-react';
import { updateEventStatus } from '../services/api';

function timeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AlertsPage({ alerts = [], onRefresh, onUpdateAlert }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const handleStatusChange = async (alertId, newStatus) => {
    setUpdatingId(alertId);
    await updateEventStatus(alertId, newStatus);
    if (onUpdateAlert) onUpdateAlert(alertId, newStatus);
    if (onRefresh) onRefresh();
    setUpdatingId(null);
  };

  const handleBulkResolve = async () => {
    setBulkUpdating(true);
    for (const id of selectedIds) {
      await updateEventStatus(id, 'RESOLVED');
      if (onUpdateAlert) onUpdateAlert(id, 'RESOLVED');
    }
    setSelectedIds(new Set());
    if (onRefresh) onRefresh();
    setBulkUpdating(false);
  };

  const handleExportCSV = () => {
    const toExport = filteredAlerts;
    const headers = ['ID', 'Event Type', 'Severity', 'Status', 'Worker', 'Zone', 'Camera', 'Confidence', 'Timestamp', 'Recommendation'];
    const rows = toExport.map(e => [
      e.id || 'N/A', e.event_type || 'UNKNOWN', e.severity || 'HIGH', e.status || 'OPEN',
      e.worker_id || 'UNKNOWN', e.zone_id || e.zone || 'Site', e.camera_id || 'CAM-01',
      `${Math.round((e.confidence || 0.92) * 100)}%`,
      e.timestamp ? new Date(e.timestamp).toLocaleString() : 'Now',
      (e.recommendation || '').replace(/,/g, ';')
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filteredAlerts = useMemo(() => alerts.filter((a) => {
    const sevMatch = filterSeverity === 'ALL' || (a.severity || '').toUpperCase() === filterSeverity;
    const statusMatch = filterStatus === 'ALL' || (a.status || 'OPEN').toUpperCase() === filterStatus;
    const q = searchQuery.toLowerCase();
    const searchMatch = !q ||
      (a.worker_id || '').toLowerCase().includes(q) ||
      (a.zone || a.zone_id || '').toLowerCase().includes(q) ||
      (a.event_type || '').toLowerCase().includes(q);
    return sevMatch && statusMatch && searchMatch;
  }), [alerts, filterSeverity, filterStatus, searchQuery]);

  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-amber-500 text-slate-950';
      case 'MEDIUM': return 'bg-blue-500 text-white';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            Real-Time Incident & Alert Feed
          </h2>
          <p className="text-sm text-slate-400">Live safety violation log with one-click resolution, bulk actions, and CSV export.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleBulkResolve} disabled={bulkUpdating}
              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer transition-all">
              <Check className="w-3.5 h-3.5" />
              {bulkUpdating ? 'Resolving...' : `Resolve ${selectedIds.size} Selected`}
            </button>
          )}
          <button onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center glass-panel border border-slate-700/80 rounded-xl px-3 py-2 gap-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input type="text" placeholder="Search worker, zone, or event type..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full placeholder:text-slate-600" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center glass-panel border border-slate-700/80 rounded-xl p-1 text-xs gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-transparent text-slate-200 py-1 px-2 focus:outline-none cursor-pointer">
            <option value="ALL" className="bg-slate-900">All Severities</option>
            <option value="CRITICAL" className="bg-slate-900 text-red-400">Critical</option>
            <option value="HIGH" className="bg-slate-900 text-amber-400">High</option>
            <option value="MEDIUM" className="bg-slate-900 text-blue-400">Medium</option>
          </select>
        </div>

        <div className="flex items-center glass-panel border border-slate-700/80 rounded-xl p-1 text-xs">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-slate-200 py-1 px-2 focus:outline-none cursor-pointer">
            <option value="ALL" className="bg-slate-900">All Statuses</option>
            <option value="OPEN" className="bg-slate-900 text-amber-400">Open</option>
            <option value="ACKNOWLEDGED" className="bg-slate-900 text-blue-400">Acknowledged</option>
            <option value="RESOLVED" className="bg-slate-900 text-emerald-400">Resolved</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">{filteredAlerts.length} results</span>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 gap-3">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel border border-dashed border-slate-700 rounded-2xl p-14 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-lg font-extrabold text-slate-200">No Incidents Matching Filters</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">All monitored safety streams are within normal compliance thresholds.</p>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isResolved = alert.status === 'RESOLVED';
            const isAck = alert.status === 'ACKNOWLEDGED';
            const isSelected = selectedIds.has(alert.id);

            return (
              <div key={alert.id || idx}
                className={`glass-panel border rounded-2xl p-5 transition-all duration-200 hover:border-slate-600 shadow-lg cursor-pointer ${
                  isCritical && !isResolved ? 'border-red-500/40 bg-red-950/10' : isSelected ? 'border-amber-500/50' : 'border-slate-800/60'
                } ${isResolved ? 'opacity-60' : ''}`}
                onClick={() => !isResolved && toggleSelect(alert.id || idx)}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {isCritical ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      {!isResolved && (
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-600'}`}
                          onClick={(e) => { e.stopPropagation(); toggleSelect(alert.id || idx); }}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-slate-950" />}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider font-mono ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity || 'HIGH'}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                          isResolved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          isAck ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>{alert.status || 'OPEN'}</span>
                        <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight">
                          {(alert.event_type || 'Safety Violation').replace(/_/g, ' ')}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2 font-mono">
                        <span>Worker: <strong className="text-slate-200">{alert.worker_id || 'Unknown'}</strong></span>
                        <span>Zone: <strong className="text-amber-400">{alert.zone || alert.zone_id || 'Site Perimeter'}</strong></span>
                        <span>Camera: <strong className="text-slate-300">{alert.camera_id || 'CAM-01'}</strong></span>
                        <span>Conf: <strong className="text-emerald-400">{Math.round((alert.confidence || 0.92) * 100)}%</strong></span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />{timeAgo(alert.timestamp)}
                        </span>
                      </div>

                      {alert.recommendation && (
                        <div className="mt-2.5 bg-slate-950/70 border border-slate-800/60 p-2.5 rounded-xl text-xs text-slate-300 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><span className="font-black text-amber-400 uppercase text-[10px] mr-1">Action:</span>{alert.recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center" onClick={(e) => e.stopPropagation()}>
                    {!isAck && !isResolved && (
                      <button onClick={() => handleStatusChange(alert.id, 'ACKNOWLEDGED')} disabled={updatingId === alert.id}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer">
                        <Eye className="w-3.5 h-3.5" /> Acknowledge
                      </button>
                    )}
                    {!isResolved ? (
                      <button onClick={() => handleStatusChange(alert.id, 'RESOLVED')} disabled={updatingId === alert.id}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
                        <Check className="w-3.5 h-3.5" /> Resolve
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                      </span>
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
