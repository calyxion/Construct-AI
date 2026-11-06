import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import AlertWidget from './components/AlertWidget';
import SafetyScoreCard from './components/SafetyScoreCard';

import LiveMonitoring from './pages/LiveMonitoringPage';
import UploadInspectionPage from './pages/UploadInspectionPage';
import AlertsPage from './pages/AlertsPage';
import WorkersPage from './pages/WorkersPage';
import ZonesPage from './pages/ZonesPage';
import Analytics from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PoseAnalysisPage from './pages/PoseAnalysisPage';
import FloorMapPage from './pages/FloorMapPage';
import VlmExplainerPage from './pages/VlmExplainerPage';
import IoTInterlocksPage from './pages/IoTInterlocksPage';
import BimDigitalTwinPage from './pages/BimDigitalTwinPage';
import CompliancePaymentsPage from './pages/CompliancePaymentsPage';
import WeeklyIntelligencePage from './pages/WeeklyIntelligencePage';
import AiAlertsPage from './pages/AiAlertsPage';
import axios from 'axios';
import { Camera } from 'lucide-react';

function CameraStatusBanner() {
  const [camStatus, setCamStatus] = useState({ is_dirty: false, sharpness: 0 });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/camera/status');
        setCamStatus(res.data);
      } catch (e) { console.warn(e); }
    };
    fetchStatus();
    const int = setInterval(fetchStatus, 5000);
    return () => clearInterval(int);
  }, []);

  if (!camStatus.is_dirty) return null;

  return (
    <div className="bg-amber-500/20 border border-amber-500/50 p-3 mb-6 rounded-xl flex items-center gap-3 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.2)]">
      <div className="bg-amber-500 text-amber-950 p-2 rounded-lg">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-amber-400 font-black text-sm uppercase tracking-wider">DIRTY LENS WARNING</h4>
        <p className="text-amber-500/80 text-xs font-mono">Camera #1 lens is severely obscured (Blur index: {camStatus.sharpness}). Please clean lens to restore AI accuracy.</p>
      </div>
    </div>
  );
}

import { Users, AlertTriangle, ShieldCheck, FileWarning, Video, Clock } from 'lucide-react';
import { 
  fetchMetrics, 
  fetchEvents, 
  fetchZones, 
  createWebSocket, 
  SCENARIO_DATA 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeScenario, setActiveScenario] = useState('scenario_1');
  const [metrics, setMetrics] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [riskStatus, setRiskStatus] = useState(null);
  const [zones, setZones] = useState([]);
  const [wsStatus, setWsStatus] = useState('connecting');

  const wsRef = useRef(null);
  const [liveClock, setLiveClock] = useState('');

  // Live clock
  useEffect(() => {
    const updateClock = () => setLiveClock(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  // Load Scenario Data or backend data
  const applyScenarioData = useCallback((scenarioKey) => {
    const sc = SCENARIO_DATA[scenarioKey] || SCENARIO_DATA.scenario_1;
    setMetrics(sc.metrics);
    setWorkers(sc.workers);
    setAlerts(sc.alerts);
    setRiskStatus(sc.riskStatus);
  }, []);

  const refreshBackendData = useCallback(async () => {
    try {
      const [m, e, z] = await Promise.all([
        fetchMetrics(),
        fetchEvents({ limit: 50 }),
        fetchZones()
      ]);

      if (m) {
        setMetrics(m);
        setRiskStatus({
          overall_score: Math.round(m.safety_score ?? 84),
          risk_level: (m.safety_score ?? 84) > 85 ? 'SAFE' : (m.safety_score ?? 84) > 60 ? 'MODERATE' : 'CRITICAL',
          recommendations: [(m.safety_score ?? 84) > 85 ? "Maintain current compliance standards." : "Require immediate PPE compliance inspection."],
          breakdown: {
            missing_helmet_penalties: (m.events_by_type?.NO_HELMET || 0) * 15,
            missing_vest_penalties: (m.events_by_type?.NO_VEST || 0) * 10,
            restricted_zone_penalties: (m.events_by_type?.RESTRICTED_ENTRY || 0) * 20,
            fall_penalties: (m.events_by_type?.POSSIBLE_FALL || 0) * 30
          }
        });
      }
      if (e && e.length > 0) {
        setAlerts(e);
      }
      if (z && z.length > 0) {
        setZones(z);
      }
    } catch (err) {
      console.warn('[App] Backend data refresh note:', err.message);
    }
  }, []);

  // Handle Scenario Switcher
  const handleScenarioChange = (newScenario) => {
    setActiveScenario(newScenario);
    applyScenarioData(newScenario);
  };

  // Initial Scenario Setup + Polling backend
  useEffect(() => {
    applyScenarioData(activeScenario);
    refreshBackendData();
    const interval = setInterval(refreshBackendData, 10000);
    return () => clearInterval(interval);
  }, [activeScenario, applyScenarioData, refreshBackendData]);

  // WebSocket Connection
  useEffect(() => {
    wsRef.current = createWebSocket(
      (msg) => {
        if (msg.type === 'NEW_EVENT') {
          setAlerts((prev) => [msg.event, ...prev]);
          refreshBackendData();
        } else if (msg.type === 'EVENT_UPDATED') {
          setAlerts((prev) =>
            prev.map((e) => (e.id === msg.event.id ? msg.event : e))
          );
        }
      },
      (status) => setWsStatus(status)
    );

    return () => wsRef.current?.close();
  }, [refreshBackendData]);

  const handleUpdateAlert = (alertId, newStatus) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    );
  };

  const openAlertsCount = alerts.filter(a => (a.status || 'OPEN') === 'OPEN').length;

  return (
    <div className="bg-[#080C14] text-slate-100 min-h-screen flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar 
        activeScenario={activeScenario} 
        onScenarioChange={handleScenarioChange}
        wsStatus={wsStatus}
        onUploadClick={() => setActiveTab('upload')}
      />

      <div className="flex flex-1">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          openAlertsCount={openAlertsCount}
        />

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase">Construction Safety Command Center</h2>
                  <p className="text-sm text-slate-400">Real-time CCTV safety intelligence, PPE compliance, restricted zone geofencing, & fall monitoring.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 glass-panel border border-emerald-500/30 rounded-xl px-3.5 py-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-emerald-400 font-bold font-mono">3 CAMERAS ONLINE</span>
                  </div>
                  <div className="flex items-center gap-2 glass-panel border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400 font-black font-mono">{liveClock}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  title="Workers Monitored"
                  value={metrics?.active_workers ?? workers.length ?? 4}
                  subtitle="Active on Site (Click to Open)"
                  icon={Users}
                  color="blue"
                  trend="+2 personnel"
                  onClick={() => setActiveTab('workers')}
                />
                <StatCard
                  title="Active Alerts"
                  value={openAlertsCount}
                  subtitle="Requires Attention"
                  icon={AlertTriangle}
                  color={openAlertsCount > 0 ? "red" : "emerald"}
                  trend={openAlertsCount > 0 ? "+1 critical" : "Clear"}
                  onClick={() => setActiveTab('alerts')}
                />
                <StatCard
                  title="Safety Score"
                  value={`${riskStatus?.overall_score ?? 84}/100`}
                  subtitle={riskStatus?.risk_level ?? 'MODERATE RISK'}
                  icon={ShieldCheck}
                  color={riskStatus?.risk_level === 'SAFE' ? 'emerald' : riskStatus?.risk_level === 'CRITICAL' ? 'red' : 'amber'}
                  trend="Real-Time"
                />
                <StatCard
                  title="Violations Today"
                  value={metrics?.total_events_today ?? alerts.length ?? 4}
                  subtitle="Logged Incidents"
                  icon={FileWarning}
                  color="amber"
                  trend="-15% vs yesterday"
                  onClick={() => setActiveTab('reports')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Live Stream Preview Widget */}
                  <div className="glass-panel rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">Live Video Stream & AI Bounding Box Overlay</h3>
                      </div>
                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-0.5 rounded-full font-mono font-bold animate-pulse">
                        ● LIVE CAM 01
                      </span>
                    </div>

                    <div className="mt-4 relative bg-slate-950 rounded-2xl aspect-video flex items-center justify-center border border-slate-800 overflow-hidden shadow-2xl group">
                      <img
                        src="/api/stream/CAM-01"
                        alt="Live Stream"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 bg-black/20 pointer-events-none p-4 flex flex-col justify-between">
                        {/* Live Telemetry Status */}
                        <div className="flex justify-between items-center">
                          <span className="bg-slate-900/90 text-slate-200 text-[10px] font-mono px-2.5 py-1 rounded-lg border border-slate-700">
                            CAM-01 • SECTOR 4B
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            LIVE FEED • 30 FPS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AlertWidget alerts={alerts} />
                </div>

                <div>
                  <SafetyScoreCard riskStatus={riskStatus} />
                </div>
              </div>
            </div>
          )}

          {/* Live Monitoring Tab */}
          {activeTab === 'live' && (
            <LiveMonitoring 
              workers={workers} 
              alerts={alerts} 
              riskStatus={riskStatus} 
              activeScenario={activeScenario}
            />
          )}

          {/* Upload & Inspect Tab */}
          {activeTab === 'upload' && (
            <UploadInspectionPage />
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <AlertsPage 
              alerts={alerts} 
              onRefresh={refreshBackendData} 
              onUpdateAlert={handleUpdateAlert}
            />
          )}

          {/* Workers & Workforce Hub Tab */}
          {activeTab === 'workers' && (
            <WorkersPage workers={workers} />
          )}

          {/* Zones Tab */}
          {activeTab === 'zones' && (
            <ZonesPage zones={zones} />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <Analytics analytics={null} />
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <ReportsPage riskStatus={riskStatus} metrics={metrics} />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsPage 
              wsStatus={wsStatus} 
              onReconnectWs={() => wsRef.current = createWebSocket(null, setWsStatus)}
            />
          )}

          {/* Phase 2 Tabs */}
          {activeTab === 'pose' && <PoseAnalysisPage />}
          {activeTab === 'floormap' && <FloorMapPage />}
          {activeTab === 'vlm' && <VlmExplainerPage />}

          {/* Phase 3 Tabs */}
          {activeTab === 'iot' && <IoTInterlocksPage />}

          {/* Phase 4 Tabs */}
          {activeTab === 'bim' && <BimDigitalTwinPage />}
          {activeTab === 'payments' && <CompliancePaymentsPage />}
          {activeTab === 'intelligence' && <WeeklyIntelligencePage />}
          {activeTab === 'ai_alerts' && <AiAlertsPage />}
        </main>
      </div>
    </div>
  );
}









