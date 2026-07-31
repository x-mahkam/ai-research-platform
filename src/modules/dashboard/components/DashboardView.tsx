import React from 'react';
import { Project, Experiment, SimulationJob, SimulatorPlugin } from '../../../types';
import {
  FolderGit2,
  FlaskConical,
  Activity,
  Sparkles,
  Play,
  ArrowUpRight,
  Clock,
  Blocks,
  CheckCircle2,
  Sliders,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '../../../i18n';

interface DashboardViewProps {
  projects: Project[];
  experiments: Experiment[];
  simulationJobs: SimulationJob[];
  plugins: SimulatorPlugin[];
  onSelectProject: (id: string) => void;
  onSelectExperiment: (id: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenNewExperimentModal: () => void;
  onQuickRunSimulation: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  experiments,
  simulationJobs,
  plugins,
  onSelectProject,
  onSelectExperiment,
  onNavigateTab,
  onOpenNewExperimentModal,
  onQuickRunSimulation,
}) => {
  const { t } = useI18n();
  const activeProjects = projects.filter((p) => p.status === 'Active');
  const runningJobs = simulationJobs.filter((j) => j.status === 'Running' || j.status === 'Queued');
  const completedJobs = simulationJobs.filter((j) => j.status === 'Completed');

  return (
    <div id="dashboard-root" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 rounded-xl border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="bg-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold px-2.5 py-0.5 rounded border border-cyan-800">
              AI-Driven Simulation Orchestrator
            </span>
            <span className="text-slate-400 text-xs">v0.1.0</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Research Platform Overview</h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {t('dash.bannerSubtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onOpenNewExperimentModal}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            <span>New Experiment</span>
          </button>
          <button
            onClick={onQuickRunSimulation}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition shadow-md shadow-cyan-900/40 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Simulation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Projects Card */}
        <div
          onClick={() => onNavigateTab('projects')}
          className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Projects</span>
            <FolderGit2 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{activeProjects.length}</span>
            <span className="text-[11px] text-slate-400">{projects.length} total</span>
          </div>
          <div className="text-[11px] text-cyan-400 flex items-center space-x-1 pt-1">
            <span>Manage projects (ARP-011)</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Total Experiments Card */}
        <div
          onClick={() => onNavigateTab('experiments')}
          className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Experiments</span>
            <FlaskConical className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{experiments.length}</span>
            <span className="text-[11px] text-emerald-400">
              {experiments.filter((e) => e.status === 'Completed').length} completed
            </span>
          </div>
          <div className="text-[11px] text-blue-400 flex items-center space-x-1 pt-1">
            <span>View parameters & history</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Simulation Queue Card */}
        <div
          onClick={() => onNavigateTab('queue')}
          className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">TCAD Compute Jobs</span>
            <Activity className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{runningJobs.length}</span>
            <span className="text-[11px] text-slate-400">{completedJobs.length} executed</span>
          </div>
          <div className="text-[11px] text-amber-400 flex items-center space-x-1 pt-1">
            <span>Simulation manager (ARP-013)</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Active Plugin Card */}
        <div
          onClick={() => onNavigateTab('plugins')}
          className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t('dash.primaryPlugin')}</span>
            <Blocks className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-emerald-300 truncate">{plugins[0]?.name || '—'}</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
              {t('dash.pluginsAvailable', { n: plugins.length })}
            </span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center space-x-1 pt-1">
            <span>Plugin SDK & Capabilities</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Main Grid Section: Running Jobs & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Simulation Status (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Live Simulation Jobs</h2>
            </div>
            <button
              onClick={() => onNavigateTab('queue')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>View Live Log Stream</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {simulationJobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-800/60 p-4 rounded-lg border border-slate-800 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200">{job.experimentTitle}</span>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Plugin: {job.pluginName} | Node: {job.hostMachine}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase ${
                      job.status === 'Running'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                        : job.status === 'Completed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                {/* Latest log preview */}
                {job.logs.length > 0 && (
                  <div className="bg-slate-950 p-2.5 rounded font-mono text-[11px] text-slate-300 truncate border border-slate-850">
                    <span className="text-cyan-400 mr-2">&gt;</span>
                    {job.logs[job.logs.length - 1]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Scientist Quick Recommendations (1 col) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">{t('dash.insights')}</h2>
          </div>

          {completedJobs.length > 0 ? (
            <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700/80 space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {t('dash.haveRuns', { n: completedJobs.length })}
              </p>
              <button
                onClick={() => onNavigateTab('ai_assistant')}
                className="w-full bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-700/80 py-2 rounded font-medium transition cursor-pointer text-center text-xs flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('dash.analyzeAI')}</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700/80 space-y-3 text-xs">
              <div className="font-mono text-[11px] text-slate-400 uppercase tracking-wider">{t('dash.noAnalysisTitle')}</div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{t('dash.noAnalysisBody')}</p>
              <ol className="space-y-1 text-[11px] text-slate-400">
                <li>{t('dash.step1')}</li>
                <li>{t('dash.step2')}</li>
                <li>{t('dash.step3')}</li>
                <li>{t('dash.step4')}</li>
              </ol>
              <button
                onClick={() => onNavigateTab('projects')}
                className="w-full bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-700/80 py-2 rounded font-medium transition cursor-pointer text-center text-xs flex items-center justify-center space-x-1.5"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>{t('dash.goProjects')}</span>
              </button>
            </div>
          )}

          {/* Quick shortcuts */}
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</div>
            <button
              onClick={() => onNavigateTab('optimization')}
              className="w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Run Bayesian Optimization</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigateTab('visualization')}
              className="w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compare I-V & Band Curves</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
