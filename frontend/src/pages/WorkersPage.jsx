import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Clock, 
  Activity, 
  HardHat, 
  Shirt, 
  ShieldCheck, 
  ShieldAlert, 
  Filter, 
  UserPlus, 
  Zap, 
  Layers,
  HeartPulse,
  Download,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { fetchWorkforceSummary, fetchWorkforceWorkers, fetchWorkforceZonesOccupancy } from '../services/api';

export default function WorkersPage({ workers: propWorkers = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeFilter, setTradeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [summaryData, setSummaryData] = useState(null);
  const [workerList, setWorkerList] = useState([]);
  const [zonesOccupancy, setZonesOccupancy] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorker, setNewWorker] = useState({
    worker_id: `W-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    role: 'Structural Technician',
    trade: 'Structural Assembly',
    current_zone: 'Zone A - Main Work Area'
  });

  useEffect(() => {
    const loadWorkforceData = async () => {
      try {
        const [sum, list, occ] = await Promise.all([
          fetchWorkforceSummary(),
          fetchWorkforceWorkers(),
          fetchWorkforceZonesOccupancy()
        ]);
        if (sum) setSummaryData(sum);
        if (list && list.length > 0) {
          setWorkerList(list);
        } else if (propWorkers.length > 0) {
          setWorkerList(propWorkers);
        }
        if (occ) setZonesOccupancy(occ);
      } catch (err) {
        console.warn('Workforce load note:', err);
      }
    };
    loadWorkforceData();
  }, [propWorkers]);

  const defaultList = workerList.length > 0 ? workerList : [
    { worker_id: 'W-101', name: 'Marcus Vance', role: 'Lead Specialist', trade: 'Structural Assembly', helmet_present: true, vest_present: true, current_zone: 'Zone A - Main Work Area', status: 'ACTIVE', activity_status: 'ACTIVE_WORKING', shift_start: '07:30 AM', shift_hours: 6.8, compliance_score: 99.2, heart_rate_bpm: 78, fatigue_level: 'LOW' },
    { worker_id: 'W-102', name: 'Elena Rostova', role: 'Senior Welder', trade: 'Hot Works & Welding', helmet_present: true, vest_present: true, current_zone: 'Zone B - Restricted Machinery', status: 'ACTIVE', activity_status: 'TRANSITING', shift_start: '08:00 AM', shift_hours: 6.3, compliance_score: 94.5, heart_rate_bpm: 84, fatigue_level: 'MODERATE' },
    { worker_id: 'W-103', name: 'David Chen', role: 'Crane Rigger', trade: 'Heavy Machinery Operations', helmet_present: true, vest_present: true, current_zone: 'Zone A - Main Work Area', status: 'ACTIVE', activity_status: 'ACTIVE_WORKING', shift_start: '06:45 AM', shift_hours: 7.5, compliance_score: 91.0, heart_rate_bpm: 92, fatigue_level: 'MODERATE' },
    { worker_id: 'W-104', name: 'Sarah Jenkins', role: 'Scaffold Inspector', trade: 'High-Altitude Scaffolding', helmet_present: true, vest_present: true, current_zone: 'Zone C - Scaffold Platform', status: 'ACTIVE', activity_status: 'INSPECTING', shift_start: '08:15 AM', shift_hours: 6.0, compliance_score: 98.0, heart_rate_bpm: 80, fatigue_level: 'LOW' }
  ];

  const filteredWorkers = defaultList.filter((w) => {
    const matchesTerm = (w.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (w.worker_id || '').toLowerCase().includes(searchTerm.toLowerCase()) || (w.trade || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrade = tradeFilter === 'ALL' || w.trade === tradeFilter;
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesTerm && matchesTrade && matchesStatus;
  });

  const handleCreateWorker = (e) => {
    e.preventDefault();
    if (!newWorker.name) return;
    const created = {
      ...newWorker,
      status: 'ACTIVE',
      activity_status: 'ACTIVE_WORKING',
      helmet_present: true,
      vest_present: true,
      shift_start: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      shift_hours: 0.1,
      compliance_score: 100.0,
      heart_rate_bpm: 76,
      fatigue_level: 'LOW'
    };
    setWorkerList((prev) => [created, ...prev]);
    setShowAddModal(false);
    setNewWorker({
      worker_id: `W-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      role: 'Structural Technician',
      trade: 'Structural Assembly',
      current_zone: 'Zone A - Main Work Area'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-500" />
            Workforce Intelligence & Safety Monitoring
          </h2>
          <p className="text-sm text-slate-400">
            Real-time biometric headcount, zone density tracking, shift attendance, and worker PPE compliance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Worker</span>
          </button>
        </div>
      </div>

      {/* Top 4 Workforce KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Headcount</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-100 font-mono">
              {summaryData?.active_on_site || defaultList.length} <span className="text-sm text-slate-500 font-normal">/ {summaryData?.total_workforce_headcount || 6}</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              ● ON SITE
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">2 Shifts Active Across 3 Work Sectors</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Site Productivity</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-amber-400 font-mono">
              {summaryData?.site_productivity_index || 92.4}%
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              +4.2% Optimal
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Movement Velocity & Dwell Efficiency</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-emerald-400 font-mono">
              {summaryData?.average_compliance_rating || 97.8}%
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              GRADE A
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">PPE Safety Index Score</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Shift Dwell</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-100 font-mono">
              {summaryData?.average_shift_duration_hours || 6.6} <span className="text-xs text-slate-500 font-normal">HRS</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">
              STANDARD
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Shift 01: Morning Rotation</p>
        </div>
      </div>

      {/* Zone Occupancy & Capacity Utilization Gauges */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-slate-200">
            <Layers className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Real-Time Zone Occupancy & Capacity Density</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Total Density: <strong className="text-emerald-400">{defaultList.length} Active Personnel</strong></span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(zonesOccupancy.length > 0 ? zonesOccupancy : [
            { zone_id: 'ZONE-A', zone_name: 'Main Assembly & Staging', zone_type: 'NORMAL', current_occupancy: 3, max_capacity: 10, utilization_pct: 30, status: 'OPTIMAL' },
            { zone_id: 'ZONE-CRANE', zone_name: 'Crane Swing Perimeter', zone_type: 'RESTRICTED', current_occupancy: 1, max_capacity: 2, utilization_pct: 50, status: 'CAUTION_RESTRICTED' },
            { zone_id: 'ZONE-C', zone_name: 'Scaffold Edge & High Elevation', zone_type: 'HIGH_RISK', current_occupancy: 1, max_capacity: 3, utilization_pct: 33, status: 'HARNESS_MANDATORY' },
          ]).map((zone) => (
            <div key={zone.zone_id} className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{zone.zone_name}</span>
                  <span className="text-[10px] font-mono text-slate-500">{zone.zone_id}</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  zone.zone_type === 'RESTRICTED' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                    : zone.zone_type === 'HIGH_RISK'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  {zone.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Headcount:</span>
                  <strong className="text-slate-100">{zone.current_occupancy} / {zone.max_capacity} Max</strong>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      zone.utilization_pct > 80 ? 'bg-red-500' : zone.utilization_pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${zone.utilization_pct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workforce Search & Trade Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search worker by name, ID (e.g. W-101), trade or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold">Trade:</span>
          </div>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All Trades</option>
            <option value="Structural Assembly">Structural Assembly</option>
            <option value="Hot Works & Welding">Hot Works & Welding</option>
            <option value="Heavy Machinery Operations">Heavy Machinery</option>
            <option value="High-Altitude Scaffolding">Scaffolding</option>
            <option value="Concrete & Foundations">Concrete</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Working</option>
            <option value="ON_BREAK">On Break</option>
          </select>
        </div>
      </div>

      {/* Workers Comprehensive Telemetry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredWorkers.map((w, idx) => {
          const fullyCompliant = w.helmet_present && w.vest_present;
          return (
            <div
              key={w.worker_id || idx}
              className={`bg-slate-900 border rounded-xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200 hover:border-slate-700 ${
                !fullyCompliant ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'
              }`}
            >
              <div>
                {/* Header: Name, Trade & ID */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-amber-400 text-sm shadow-inner">
                      {w.worker_id?.slice(-3) || 'W'}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-100">{w.name || `Worker ${w.worker_id}`}</h4>
                      <p className="text-[11px] text-amber-400/90 font-medium">{w.role || w.trade}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    w.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {w.status || 'ACTIVE'}
                  </span>
                </div>

                {/* Body: Zone, Shift Time, Trade */}
                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      Assigned Sector:
                    </span>
                    <strong className="text-slate-200 font-mono text-[11px]">{w.current_zone}</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Shift Progress:
                    </span>
                    <span className="font-mono text-slate-200">{w.shift_hours || 6.5} hrs (Since {w.shift_start || '07:30 AM'})</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                      Biometric Fatigue:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-200">
                      {w.heart_rate_bpm || 78} BPM • <span className={w.fatigue_level === 'HIGH' ? 'text-red-400' : 'text-emerald-400'}>{w.fatigue_level || 'LOW'}</span>
                    </span>
                  </div>

                  {/* Real-time PPE Compliance Checklist */}
                  <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <HardHat className="w-3.5 h-3.5 text-emerald-400" />
                        Hardhat Safety:
                      </span>
                      {w.helmet_present ? (
                        <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          ✓ PRESENT
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">
                          ✕ MISSING
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Shirt className="w-3.5 h-3.5 text-amber-400" />
                        High-Vis Vest:
                      </span>
                      {w.vest_present !== false ? (
                        <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          ✓ PRESENT
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                          ✕ MISSING
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Rating */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Safety Compliance Score:</span>
                <span className="font-mono font-black text-sm text-emerald-400">
                  {w.compliance_score || 98}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Register Site Personnel
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel O'Connor"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Worker Badge ID:</label>
                  <input
                    type="text"
                    required
                    value={newWorker.worker_id}
                    onChange={(e) => setNewWorker({ ...newWorker, worker_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Assigned Trade:</label>
                  <select
                    value={newWorker.trade}
                    onChange={(e) => setNewWorker({ ...newWorker, trade: e.target.value, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Structural Assembly">Structural Assembly</option>
                    <option value="Hot Works & Welding">Hot Works & Welding</option>
                    <option value="Heavy Machinery Operations">Heavy Machinery</option>
                    <option value="High-Altitude Scaffolding">Scaffolding</option>
                    <option value="Concrete & Foundations">Concrete & Civil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assigned Safety Zone:</label>
                <select
                  value={newWorker.current_zone}
                  onChange={(e) => setNewWorker({ ...newWorker, current_zone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="Zone A - Main Work Area">Zone A - Main Work Area</option>
                  <option value="Zone B - Restricted Machinery">Zone B - Restricted Machinery</option>
                  <option value="Zone C - Scaffold Platform">Zone C - Scaffold Platform</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  Register On Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
