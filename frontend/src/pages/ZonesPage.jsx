import React, { useState } from 'react';
import { MapPin, Users, Lock, Unlock, Plus, X, ShieldAlert, AlertTriangle, CheckCircle, Clock, Save } from 'lucide-react';

const DEFAULT_ZONES = [
  {
    id: 'ZONE-A', name: 'General Assembly & Concrete Pour', type: 'PERMITTED', risk_level: 'SAFE',
    risk_score: 95, workers_present: 2, max_capacity: 10,
    description: 'Standard work zone. Hardhat and high-visibility vest mandatory.',
    is_restricted: false, color: 'emerald',
    polygon: '[[120,50],[480,50],[480,250],[120,250]]',
    history: [
      { time: '11:30', event: 'W-103 PPE violation — No Helmet', severity: 'HIGH' },
      { time: '09:15', event: 'Zone capacity at 80%', severity: 'LOW' },
    ]
  },
  {
    id: 'ZONE-B', name: 'Crane Swing & Hoisting Radius', type: 'RESTRICTED', risk_level: 'CRITICAL',
    risk_score: 45, workers_present: 1, max_capacity: 2,
    description: 'DANGER ZONE: Overhead heavy load operation. Unauthorized entry prohibited.',
    is_restricted: true, color: 'red',
    polygon: '[[600,80],[820,80],[820,280],[600,280]]',
    history: [
      { time: '10:42', event: '⚠ W-102 unauthorized intrusion detected', severity: 'CRITICAL' },
      { time: '08:00', event: 'Zone restricted — Crane operation commenced', severity: 'LOW' },
    ]
  },
  {
    id: 'ZONE-C', name: 'Scaffolding & Elevated Platform', type: 'HAZARDOUS', risk_level: 'HIGH',
    risk_score: 68, workers_present: 1, max_capacity: 4,
    description: 'Fall arrest harnesses required. Geofence tracking for vertical displacement.',
    is_restricted: true, color: 'amber',
    polygon: '[[120,320],[400,320],[400,480],[120,480]]',
    history: [
      { time: '13:05', event: 'Possible fall detected — W-104 (resolved)', severity: 'CRITICAL' },
      { time: '07:30', event: 'Shift start — 1 worker checked in', severity: 'LOW' },
    ]
  },
];

export default function ZonesPage({ zones = [] }) {
  const [zoneList, setZoneList] = useState(zones.length > 0 ? zones : DEFAULT_ZONES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [newZone, setNewZone] = useState({
    name: '', type: 'PERMITTED', risk_level: 'SAFE', max_capacity: 5, description: ''
  });

  const toggleRestriction = (zoneId) => {
    setZoneList(prev => prev.map(z => z.id === zoneId ? { ...z, is_restricted: !z.is_restricted } : z));
  };

  const handleAddZone = () => {
    if (!newZone.name.trim()) return;
    const id = `ZONE-${String.fromCharCode(65 + zoneList.length)}`;
    setZoneList(prev => [...prev, {
      ...newZone, id, risk_score: 80, workers_present: 0, is_restricted: newZone.type !== 'PERMITTED',
      color: newZone.type === 'RESTRICTED' ? 'red' : newZone.type === 'HAZARDOUS' ? 'amber' : 'emerald',
      polygon: '[[0,0],[100,0],[100,100],[0,100]]',
      history: [{ time: new Date().toLocaleTimeString(), event: `Zone ${id} created`, severity: 'LOW' }]
    }]);
    setNewZone({ name: '', type: 'PERMITTED', risk_level: 'SAFE', max_capacity: 5, description: '' });
    setShowAddModal(false);
  };

  const handleRemoveZone = (zoneId) => {
    setZoneList(prev => prev.filter(z => z.id !== zoneId));
  };

  const getRiskColor = (level) => {
    const map = {
      CRITICAL: 'text-red-400 border-red-500/30 bg-red-500/10',
      HIGH: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      SAFE: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    };
    return map[level?.toUpperCase()] || map.SAFE;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-amber-500" />
            Geofenced Safety Zones & Polygon Management
          </h2>
          <p className="text-sm text-slate-400">Virtual boundary geofencing, restricted perimeter management, occupancy tracking, and zone event history.</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer transition-all">
          <Plus className="w-4 h-4" /> Add New Zone
        </button>
      </div>

      {/* 2D Geofence Schematic */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <MapPin className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Site Geofence Polygon Schematic</h3>
          </div>
          <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono font-bold">
            SHAPELY 2.0 POLYGON ENGINE ACTIVE
          </span>
        </div>

        <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden" style={{ height: 220 }}>
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-60"></div>
          <div className="absolute inset-0 flex items-center justify-center gap-4 p-6">
            {zoneList.slice(0, 3).map((z, i) => (
              <div key={z.id} className={`relative flex-1 h-full border-2 ${
                z.color === 'red' ? 'border-red-500/80 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]' :
                z.color === 'amber' ? 'border-amber-500/70 bg-amber-950/20 border-dashed' :
                'border-emerald-500/60 bg-emerald-950/20 border-dashed'
              } rounded-xl p-3 flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-black ${z.color === 'red' ? 'text-red-400' : z.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'} flex items-center gap-1.5`}>
                    {z.risk_level === 'CRITICAL' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>}
                    {z.id}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    z.is_restricted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>{z.is_restricted ? 'RESTRICTED' : 'OPEN'}</span>
                </div>
                <div>
                  <div className={`text-[11px] font-bold ${z.color === 'red' ? 'text-red-300' : z.color === 'amber' ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {z.name.split('&')[0].trim()}
                  </div>
                  <div className={`text-[10px] font-mono font-black mt-1 ${z.color === 'red' ? 'text-red-400' : z.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    Safety: {z.risk_score}/100
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{z.workers_present}/{z.max_capacity} Workers</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {zoneList.map((z) => (
          <div key={z.id} className="glass-panel rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold tracking-wider">{z.id}</span>
                  <h4 className="text-sm font-extrabold text-slate-100 mt-0.5 leading-tight">{z.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border ${getRiskColor(z.risk_level)}`}>
                    {z.risk_level || 'SAFE'}
                  </span>
                  <button onClick={() => handleRemoveZone(z.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{z.description}</p>

              {/* Polygon coordinates */}
              <div className="mt-3 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-slate-500">
                <span className="text-amber-500 font-bold">POLYGON</span>
                <span className="ml-1 text-slate-400 break-all">{z.polygon || '[[0,0],[1,0],[1,1],[0,1]]'}</span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400" /> Occupancy:</span>
                  <strong className="text-slate-200 font-mono">{z.workers_present || 0} / {z.max_capacity || 5} Workers</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Type:</span>
                  <span className="font-mono font-bold text-slate-300">{z.type}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Safety Score:</span>
                  <span className={`font-mono font-black ${z.risk_score >= 80 ? 'text-emerald-400' : z.risk_score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                    {z.risk_score}/100
                  </span>
                </div>
              </div>

              {/* Zone Event History */}
              {z.history && z.history.length > 0 && (
                <div className="mt-3">
                  <button onClick={() => setExpandedHistory(expandedHistory === z.id ? null : z.id)}
                    className="w-full text-left text-[11px] font-bold text-slate-500 hover:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Clock className="w-3 h-3" />
                    Zone Event Log ({z.history.length} events)
                  </button>
                  {expandedHistory === z.id && (
                    <div className="mt-2 space-y-1.5">
                      {z.history.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px]">
                          <span className="font-mono text-slate-600 shrink-0">{h.time}</span>
                          <span className={`${h.severity === 'CRITICAL' ? 'text-red-400' : h.severity === 'HIGH' ? 'text-amber-400' : 'text-slate-400'}`}>
                            {h.event}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button onClick={() => toggleRestriction(z.id)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  z.is_restricted
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}>
                {z.is_restricted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {z.is_restricted ? 'Zone Restricted — Click to Open' : 'Zone Open — Click to Restrict'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Zone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" /> Add New Geofence Zone
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Zone Name *</label>
                <input type="text" value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Hazmat Storage Area"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Zone Type</label>
                <select value={newZone.type} onChange={e => setNewZone(p => ({ ...p, type: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none">
                  <option value="PERMITTED">Permitted — Normal Operations</option>
                  <option value="HAZARDOUS">Hazardous — Elevated Precautions</option>
                  <option value="RESTRICTED">Restricted — Authorized Personnel Only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Risk Level</label>
                  <select value={newZone.risk_level} onChange={e => setNewZone(p => ({ ...p, risk_level: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none">
                    <option value="SAFE">Safe</option>
                    <option value="HIGH">High Risk</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Max Capacity</label>
                  <input type="number" value={newZone.max_capacity} onChange={e => setNewZone(p => ({ ...p, max_capacity: parseInt(e.target.value) || 5 }))}
                    min={1} max={50}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Description / PPE Requirements</label>
                <textarea value={newZone.description} onChange={e => setNewZone(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Describe required PPE and entry conditions..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-800 cursor-pointer transition-all">
                  Cancel
                </button>
                <button onClick={handleAddZone} disabled={!newZone.name.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20">
                  <Save className="w-3.5 h-3.5" /> Create Zone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
