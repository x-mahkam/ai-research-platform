import React, { useState, useEffect, useCallback } from 'react';
import {
  Project,
  Experiment,
  SimulationJob,
  SimulatorPlugin,
  OptimizationJob,
  GeneratedReport,
} from './types';
import { Header } from './layouts/Header';
import { Sidebar, ActiveTab } from './layouts/Sidebar';
import { DashboardView } from './modules/dashboard/components/DashboardView';
import { ProjectsView } from './modules/projects/components/ProjectsView';
import { ExperimentsView } from './modules/experiments/components/ExperimentsView';
import { SimulationQueueView } from './modules/simulation/components/SimulationQueueView';
import { PluginsView } from './modules/plugins/components/PluginsView';
import { OptimizationView } from './modules/optimization/components/OptimizationView';
import { VisualizationView } from './modules/visualization/components/VisualizationView';
import { AIAssistantView } from './modules/ai/components/AIAssistantView';
import { AIResearchEntryView } from './modules/ai/components/AIResearchEntryView';
import { ReportGeneratorView } from './modules/reports/components/ReportGeneratorView';
import { NewExperimentModal } from './modules/experiments/components/NewExperimentModal';

import { apiClient } from './services/apiClient';

type BackendStatus = 'loading' | 'online' | 'offline';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ai_assistant');
  const [aiSubMode, setAiSubMode] = useState<'entry' | 'chat'>('entry');

  const [projects, setProjects] = useState<Project[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [simulationJobs, setSimulationJobs] = useState<SimulationJob[]>([]);
  const [plugins, setPlugins] = useState<SimulatorPlugin[]>([]);
  const [optimizationJobs, setOptimizationJobs] = useState<OptimizationJob[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);
  const [isNewExperimentModalOpen, setIsNewExperimentModalOpen] = useState(false);

  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reportError = (context: string, err: unknown) => {
    const detail = err instanceof Error ? err.message : String(err);
    setErrorMessage(`${context}: ${detail}`);
  };

  // Load all collections from the backend. The UI shows real state only:
  // an empty backend renders empty, an unreachable backend shows "offline".
  const loadAllData = useCallback(async () => {
    try {
      const [projectsData, experimentsData, simulationsData, pluginsData, optimizationsData, reportsData] =
        await Promise.all([
          apiClient.getProjects(),
          apiClient.getExperiments(),
          apiClient.getSimulations(),
          apiClient.getPlugins(),
          apiClient.getOptimizations(),
          apiClient.getReports(),
        ]);

      setProjects(projectsData);
      setExperiments(experimentsData);
      setSimulationJobs(simulationsData);
      setPlugins(pluginsData);
      setOptimizationJobs(optimizationsData);
      setReports(reportsData);
      setActiveProjectId((prev) => prev || projectsData[0]?.id || null);
      setActiveExperimentId((prev) => prev || experimentsData[0]?.id || null);
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Keep simulation jobs live while the backend is reachable, so launched
  // jobs progress past "Queued" and completed results surface.
  useEffect(() => {
    if (backendStatus !== 'online') return;
    const interval = setInterval(() => {
      apiClient.getSimulations().then(setSimulationJobs).catch(() => setBackendStatus('offline'));
    }, 3000);
    return () => clearInterval(interval);
  }, [backendStatus]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeExperiment = experiments.find((e) => e.id === activeExperimentId) || experiments[0];

  // Handler: Create Project (ARP-011)
  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProj = await apiClient.createProject(projectData);
      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
    } catch (err) {
      reportError('Failed to create project', err);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updated = await apiClient.updateProject(id, updates);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      reportError('Failed to update project', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await apiClient.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) {
        const remaining = projects.filter((p) => p.id !== id);
        setActiveProjectId(remaining[0]?.id || null);
      }
    } catch (err) {
      reportError('Failed to delete project', err);
    }
  };

  // Handler: Create Experiment (ARP-012)
  const handleCreateExperiment = async (expData: Partial<Experiment>) => {
    try {
      const newExp = await apiClient.createExperiment(expData);
      setExperiments((prev) => [newExp, ...prev]);
      setActiveExperimentId(newExp.id);
    } catch (err) {
      reportError('Failed to create experiment', err);
    }
  };

  // Handler: Clone Experiment (ARP-012)
  const handleCloneExperiment = async (id: string) => {
    try {
      const clonedExp = await apiClient.cloneExperiment(id);
      setExperiments((prev) => [clonedExp, ...prev]);
      setActiveExperimentId(clonedExp.id);
    } catch (err) {
      reportError('Failed to clone experiment', err);
    }
  };

  const handleUpdateExperiment = async (id: string, updates: Partial<Experiment>) => {
    // Optimistic local update keeps parameter sliders responsive; the server
    // response is the source of truth and replaces it.
    setExperiments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e))
    );
    try {
      const updated = await apiClient.updateExperiment(id, updates);
      setExperiments((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      reportError('Failed to save experiment changes', err);
    }
  };

  // Handler: Launch Simulation Job (ARP-013)
  const handleRunSimulation = async (expId: string) => {
    try {
      const newJob = await apiClient.runSimulation(expId);
      setSimulationJobs((prev) => [newJob, ...prev.filter((j) => j.id !== newJob.id)]);
      setActiveTab('queue');
    } catch (err) {
      reportError('Failed to launch simulation', err);
    }
  };

  // Handler: Simulation Job Control (Pause, Resume, Cancel, Retry)
  const handleJobAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    try {
      const updatedJob = await apiClient.performJobAction(jobId, action);
      setSimulationJobs((prev) => prev.map((j) => (j.id === jobId ? updatedJob : j)));
    } catch (err) {
      reportError(`Failed to ${action} job`, err);
    }
  };

  // Handler: Optimization Step (ARP-006)
  const handleStepOptimization = async (jobId: string) => {
    try {
      const updated = await apiClient.stepOptimization(jobId);
      setOptimizationJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch (err) {
      reportError('Failed to step optimization', err);
    }
  };

  // Handler: Generate Report with Claude API (ARP-010)
  const handleGenerateReport = async (exp: Experiment) => {
    try {
      const newReport = await apiClient.generateReport(exp, activeProject?.title || 'ARP Project');
      setReports((prev) => [newReport, ...prev]);
      setActiveTab('reports');
    } catch (err) {
      reportError('Failed to generate report', err);
    }
  };

  // Handler: Launch Research from AI Entry Prompt
  const handleLaunchResearchFromAI = async (config: {
    title: string;
    objective: string;
    simulatorId: string;
    modelFileName: string;
    modelFileContent: string;
    modelFormat: string;
    initialParameters: Record<string, number | string>;
  }) => {
    try {
      // 1. Create container project
      const projectData = {
        title: config.title,
        description: config.objective,
        owner: 'AI Agent',
        domain: config.simulatorId,
        status: 'Active' as const,
        members: ['AI Agent', 'Researcher'],
        simulator: config.simulatorId,
        physicsModule: 'Hydrodynamic',
        scientificField: 'Physics & TCAD',
        principalInvestigator: 'Dr. Jasur Alimov',
        researchGoal: config.objective,
        tags: ['AI-Orchestrated', config.simulatorId],
      };

      const newProj = await apiClient.createProject(projectData);

      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);

      // 2. Upload model file (backend derives size/checksum/path from content)
      await apiClient.createProjectModel(newProj.id, {
        fileName: config.modelFileName,
        fileType: config.modelFormat,
        simulator: config.simulatorId,
        physicsModule: 'Hydrodynamic',
        owner: 'AI Agent',
        content: config.modelFileContent,
        description: `Model file for ${config.title}`,
        version: '1.0',
        isDefault: true,
      });

      // 3. Create experiment
      const paramList = Object.entries(config.initialParameters).map(([key, val]) => ({
        key,
        name: key.replace(/_/g, ' '),
        value: typeof val === 'number' ? val : parseFloat(String(val)) || 0,
        unit: '',
        description: 'AI Injected Parameter',
      }));

      const newExpData = {
        projectId: newProj.id,
        title: config.title,
        description: config.objective,
        pluginId: config.simulatorId,
        status: 'Ready' as const,
        version: 1,
        parameters: paramList,
        notes: [
          {
            id: `n-${Date.now()}`,
            author: 'AI Agent',
            content: `AI Agent initialized workspace for objective: "${config.objective}"`,
            createdAt: new Date().toISOString(),
            version: 1,
          },
        ],
        attachments: [],
        tags: ['AI-Orchestrated', config.simulatorId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'AI Agent',
      };

      const newExp = await apiClient.createExperiment(newExpData);

      setExperiments((prev) => [newExp, ...prev]);
      setActiveExperimentId(newExp.id);

      // 4. Automatically run simulation and switch to queue/execution view
      await handleRunSimulation(newExp.id);
    } catch (err) {
      reportError('Failed to launch AI research workflow', err);
    }
  };

  const runningJobCount = simulationJobs.filter((j) => j.status === 'Running').length;

  if (backendStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Connecting to AI Research Platform backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header
        projects={projects}
        experiments={experiments}
        activeProjectId={activeProjectId}
        activeExperimentId={activeExperimentId}
        onSelectProject={setActiveProjectId}
        onSelectExperiment={setActiveExperimentId}
        onOpenNewExperimentModal={() => setIsNewExperimentModalOpen(true)}
        onQuickRunSimulation={() => activeExperimentId && handleRunSimulation(activeExperimentId)}
        runningJobCount={runningJobCount}
      />

      {/* Backend connectivity / error banners */}
      {backendStatus === 'offline' && (
        <div className="bg-red-950/80 border-b border-red-800 text-red-200 text-xs px-4 py-2 flex items-center justify-between">
          <span>
            Backend is unreachable — data shown may be stale and actions will fail. Check that the server is
            running, then retry.
          </span>
          <button
            onClick={() => {
              setBackendStatus('loading');
              loadAllData();
            }}
            className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="bg-amber-950/80 border-b border-amber-800 text-amber-200 text-xs px-4 py-2 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-3 py-1 rounded bg-amber-800 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeProjectTitle={activeProject?.title}
          activeExperimentTitle={activeExperiment?.title}
          queueCount={runningJobCount}
        />

        {/* Center Main Stage View */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-2">
          {activeTab === 'dashboard' && (
            <DashboardView
              projects={projects}
              experiments={experiments}
              simulationJobs={simulationJobs}
              plugins={plugins}
              onSelectProject={setActiveProjectId}
              onSelectExperiment={setActiveExperimentId}
              onNavigateTab={setActiveTab}
              onOpenNewExperimentModal={() => setIsNewExperimentModalOpen(true)}
              onQuickRunSimulation={() => activeExperimentId && handleRunSimulation(activeExperimentId)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={setActiveProjectId}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {activeTab === 'experiments' && (
            <ExperimentsView
              experiments={experiments}
              activeExperimentId={activeExperimentId}
              onSelectExperiment={setActiveExperimentId}
              onCloneExperiment={handleCloneExperiment}
              onUpdateExperiment={handleUpdateExperiment}
              onRunSimulation={handleRunSimulation}
              onOpenNewExperimentModal={() => setIsNewExperimentModalOpen(true)}
            />
          )}

          {activeTab === 'queue' && (
            <SimulationQueueView
              simulationJobs={simulationJobs}
              onJobAction={handleJobAction}
              onQuickRunSimulation={() => activeExperimentId && handleRunSimulation(activeExperimentId)}
            />
          )}

          {activeTab === 'plugins' && <PluginsView plugins={plugins} />}

          {activeTab === 'optimization' && (
            <OptimizationView
              optimizationJobs={optimizationJobs}
              onCreateOptimization={(job) => setOptimizationJobs((prev) => [job, ...prev])}
              onStepOptimization={handleStepOptimization}
            />
          )}

          {activeTab === 'visualization' && (
            <VisualizationView experiments={experiments} activeExperimentId={activeExperimentId} />
          )}

          {activeTab === 'ai_assistant' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-2.5 px-4 rounded-xl text-xs">
                <span className="text-slate-400 font-mono flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>AI Agent Mode: <strong className="text-white">{aiSubMode === 'entry' ? 'New Objective Orchestrator' : 'Active Experiment Reasoning'}</strong></span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAiSubMode('entry')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      aiSubMode === 'entry' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    + New Research Goal
                  </button>
                  {activeExperiment && (
                    <button
                      onClick={() => setAiSubMode('chat')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        aiSubMode === 'chat' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Active Chat Analysis
                    </button>
                  )}
                </div>
              </div>

              {aiSubMode === 'entry' ? (
                <AIResearchEntryView
                  plugins={plugins}
                  onLaunchResearch={handleLaunchResearchFromAI}
                  recentExperiments={experiments}
                  onSelectExperiment={(expId) => {
                    setActiveExperimentId(expId);
                    setAiSubMode('chat');
                  }}
                />
              ) : activeExperiment ? (
                <AIAssistantView
                  experiment={activeExperiment}
                  onApplySuggestedParameters={(params) => {
                    const updatedParams = activeExperiment.parameters.map((p) => {
                      if (params[p.key] !== undefined) {
                        return { ...p, value: params[p.key] };
                      }
                      return p;
                    });
                    handleUpdateExperiment(activeExperiment.id, { parameters: updatedParams });
                    setActiveTab('experiments');
                  }}
                />
              ) : null}
            </div>
          )}

          {activeTab === 'reports' && activeExperiment && (
            <ReportGeneratorView
              experiment={activeExperiment}
              reports={reports}
              projectName={activeProject?.title || 'ARP Project'}
              onGenerateReport={handleGenerateReport}
            />
          )}
        </main>
      </div>

      {/* New Experiment Modal */}
      <NewExperimentModal
        isOpen={isNewExperimentModalOpen}
        onClose={() => setIsNewExperimentModalOpen(false)}
        projects={projects}
        plugins={plugins}
        activeProjectId={activeProjectId}
        onCreateExperiment={handleCreateExperiment}
      />
    </div>
  );
}
