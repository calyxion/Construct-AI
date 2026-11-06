import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  AlertTriangle, 
  Users, 
  MapPin, 
  BarChart3, 
  FileText, 
  Settings,
  UploadCloud,
  Layers,
  Radio,
  Activity,
  Map,
  Brain,
  ShieldAlert,
  Box,
  Database,
  CreditCard,
  BarChart2,
  Search
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, openAlertsCount = 0 }) {
  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'live', label: 'Live CCTV Feed', icon: Video },
    { id: 'upload', label: 'Media Upload & AI', icon: UploadCloud },
    { id: 'alerts', label: 'Incident Alerts', icon: AlertTriangle, badge: openAlertsCount > 0 ? String(openAlertsCount) : null },
    { id: 'workers', label: 'Workforce Hub', icon: Users },
    { id: 'zones', label: 'Safety Zones', icon: MapPin },
    { id: 'pose', label: 'Pose & Ergonomics', icon: Activity },
    { id: 'floormap', label: '3D Floor Map', icon: Map },
    { id: 'vlm', label: 'VLM Explainer', icon: Brain },
    { id: 'iot', label: 'IoT Interlocks', icon: ShieldAlert },
    { id: 'bim', label: 'BIM 4D Twin', icon: Box },
    { id: 'payments', label: 'Compliance Fines', icon: CreditCard },
    { id: 'intelligence', label: 'Weekly Intelligence', icon: BarChart2 },
    { id: 'ai_alerts', label: 'Explainable Alerts', icon: Search },
    { id: 'reports', label: 'Compliance Reports', icon: FileText },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between min-h-[calc(100vh-67px)] shrink-0 shadow-2xl backdrop-blur-xl">
      <div className="py-6 px-4 space-y-1.5">
        <div className="px-3 pb-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-between">
          <span>Operations Navigation</span>
          <Radio className="w-3 h-3 text-amber-500 animate-pulse" />
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="tracking-wide">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black font-mono shadow-xs ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Industrial Footer System Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 space-y-2 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-400">Site Location:</span>
            <span className="text-amber-400 font-mono font-bold">Sector 4B Yard</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-400">Active Cameras:</span>
            <span className="text-emerald-400 font-mono font-bold">3 Online</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 font-mono">
            <span>CONSTRUCTAI v2.0</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SOTA
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}






