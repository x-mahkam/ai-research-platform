import React from 'react';
import { Project, Experiment } from '../types';
import {
  Cpu,
  Sparkles,
  Search,
  Plus,
  Play,
  Layers,
  FlaskConical,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface HeaderProps {
  projects: Project[];
  experiments: Experiment[];
  activeProjectId: string | null;
  activeExperimentId: string | null;
  onSelectProject: (id: string) => void;
  onSelectExperiment: (id: string) => void;
  onOpenNewExperimentModal: () => void;
  onQuickRunSimulation: () => void;
  runningJobCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  experiments,
  activeProjectId,
  activeExperimentId,
  onSelectProject,
  onSelectExperiment,
  onOpenNewExperimentModal,
  onQuickRunSimulation,
  runningJobCount,
}) => {
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const filteredExperiments = experiments.filter((e) => e.projectId === activeProjectId);
  const activeExperiment = experiments.find((e) => e.id === activeExperimentId);

  return (
    <header id="header-root" className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 text-slate-100 shadow-md">
      {/* Brand & Active Context */}
      <div id="header-brand-section" className="flex items-center space-x-6">
        <div id="header-logo" className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg tracking-tight text-white">AI Research Platform</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-medium">
                ARP-010
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">Multi-Physics Simulation Engine</p>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 hidden md:block" />

        {/* Active Project & Experiment Selectors */}
        <div id="header-context-selectors" className="hidden lg:flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Project:</span>
            <select
              value={activeProjectId || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
            <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Experiment:</span>
            <select
              value={activeExperimentId || ''}
              onChange={(e) => onSelectExperiment(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              {filteredExperiments.length > 0 ? (
                filteredExperiments.map((e) => (
                  <option key={e.id} value={e.id} className="bg-slate-900 text-slate-200">
                    [{e.status}] {e.title}
                  </option>
                ))
              ) : (
                <option value="">No experiments</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Header Actions & Telemetry Status */}
      <div id="header-right-actions" className="flex items-center space-x-4">
        {/* Active Execution Badge */}
        <div id="header-simulation-status" className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
          {runningJobCount > 0 ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="text-cyan-300 font-mono font-medium">{runningJobCount} Sentaurus Job Running</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-mono">TCAD Engine Idle</span>
            </>
          )}
        </div>

        {/* AI Assistant Status */}
        <div id="header-ai-badge" className="hidden sm:flex items-center space-x-1.5 bg-cyan-950/60 text-cyan-300 px-3 py-1.5 rounded-full border border-cyan-800 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-medium">AI Scientist Active</span>
        </div>

        {/* Action Buttons */}
        <button
          id="btn-header-new-exp"
          onClick={onOpenNewExperimentModal}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Exp</span>
        </button>

        <button
          id="btn-header-quick-run"
          onClick={onQuickRunSimulation}
          className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-md text-xs font-medium transition shadow-sm cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run Simulation</span>
        </button>
      </div>
    </header>
  );
};
