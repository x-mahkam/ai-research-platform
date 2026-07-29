import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  FlaskConical,
  ListTodo,
  Blocks,
  Sliders,
  LineChart,
  Sparkles,
  FileText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export type ActiveTab =
  | 'ai_assistant'
  | 'dashboard'
  | 'experiments'
  | 'queue'
  | 'plugins'
  | 'optimization'
  | 'visualization'
  | 'reports'
  | 'projects';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeProjectTitle?: string;
  activeExperimentTitle?: string;
  queueCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeProjectTitle,
  activeExperimentTitle,
  queueCount,
}) => {
  const navItems = [
    { id: 'ai_assistant', label: 'AI Scientist Agent', icon: Sparkles, highlight: true },
    { id: 'dashboard', label: 'Research Dashboard', icon: LayoutDashboard },
    { id: 'experiments', label: 'Active Experiments', icon: FlaskConical },
    { id: 'queue', label: 'Simulation Orchestrator', icon: ListTodo, badge: queueCount > 0 ? queueCount : undefined },
    { id: 'plugins', label: 'Simulator Plugins', icon: Blocks },
    { id: 'optimization', label: 'Optimization Engine', icon: Sliders },
    { id: 'visualization', label: 'Scientific Visualizer', icon: LineChart },
    { id: 'reports', label: 'Publication Reports', icon: FileText },
  ];

  return (
    <aside id="sidebar-root" className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Research Modules
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => onTabChange(item.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-800/80 font-semibold shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : item.highlight ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Current Context Card */}
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-800 space-y-2">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Active Workspace</div>
          <div className="space-y-1 text-xs">
            <div className="truncate font-medium text-slate-200">
              <span className="text-cyan-400 font-mono text-[10px] mr-1">PROJ:</span>
              {activeProjectTitle || 'No project selected'}
            </div>
            <div className="truncate text-slate-400 text-[11px]">
              <span className="text-blue-400 font-mono text-[10px] mr-1">EXP:</span>
              {activeExperimentTitle || 'No experiment'}
            </div>
          </div>
        </div>
      </div>

      {/* System Health / Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/80 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Plugin SDK</span>
          <span className="text-emerald-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3 h-3" /> Sentaurus v2023.12
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Compute Host</span>
          <span className="font-mono text-slate-300">node-01.arp</span>
        </div>
      </div>
    </aside>
  );
};
