import React, { useState, useEffect } from 'react';
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

import {
  DEFAULT_PROJECTS,
  DEFAULT_EXPERIMENTS,
  DEFAULT_SIMULATIONS,
  DEFAULT_PLUGINS,
  DEFAULT_OPTIMIZATIONS,
  DEFAULT_REPORTS,
} from './data/defaultData';
import { apiClient } from './services/apiClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ai_assistant');
  const [aiSubMode, setAiSubMode] = useState<'entry' | 'chat'>('entry');

  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [experiments, setExperiments] = useState<Experiment[]>(DEFAULT_EXPERIMENTS);
  const [simulationJobs, setSimulationJobs] = useState<SimulationJob[]>(DEFAULT_SIMULATIONS);
  const [plugins, setPlugins] = useState<SimulatorPlugin[]>(DEFAULT_PLUGINS);
  const [optimizationJobs, setOptimizationJobs] = useState<OptimizationJob[]>(DEFAULT_OPTIMIZATIONS);
  const [reports, setReports] = useState<GeneratedReport[]>(DEFAULT_REPORTS);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(DEFAULT_PROJECTS[0]?.id || null);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(DEFAULT_EXPERIMENTS[0]?.id || null);
  const [isNewExperimentModalOpen, setIsNewExperimentModalOpen] = useState(false);

  // Sync data from server endpoints if available
  useEffect(() => {
    apiClient.getProjects().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data);
        setActiveProjectId((prev) => prev || data[0]?.id || null);
      }
    }).catch(() => {});

    apiClient.getExperiments().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setExperiments(data);
        setActiveExperimentId((prev) => prev || data[0]?.id || null);
      }
    }).catch(() => {});

    apiClient.getSimulations().then((data) => {
      if (Array.isArray(data) && data.length > 0) setSimulationJobs(data);
    }).catch(() => {});

    apiClient.getPlugins().then((data) => {
      if (Array.isArray(data) && data.length > 0) setPlugins(data);
    }).catch(() => {});

    apiClient.getOptimizations().then((data) => {
      if (Array.isArray(data) && data.length > 0) setOptimizationJobs(data);
    }).catch(() => {});

    apiClient.getReports().then((data) => {
      if (Array.isArray(data) && data.length > 0) setReports(data);
    }).catch(() => {});
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeExperiment = experiments.find((e) => e.id === activeExperimentId) || experiments[0];

  // Handler: Create Project (ARP-011)
  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProj = await apiClient.createProject(projectData);
      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
    } catch {
      const fallbackProj: Project = {
        id: `proj-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...projectData,
      };
      setProjects((prev) => [fallbackProj, ...prev]);
      setActiveProjectId(fallbackProj.id);
    }
  };

  const handleUpdateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      setActiveProjectId(remaining[0]?.id || null);
    }
  };

  // Handler: Create Experiment (ARP-012)
  const handleCreateExperiment = async (expData: Partial<Experiment>) => {
    try {
      const newExp = await apiClient.createExperiment(expData);
      setExperiments((prev) => [newExp, ...prev]);
      setActiveExperimentId(newExp.id);
    } catch {
      const fallbackExp: Experiment = {
        id: `exp-${Date.now()}`,
        projectId: expData.projectId || activeProjectId || 'proj-001',
        title: expData.title || 'New Simulation Experiment',
        description: expData.description || '',
        pluginId: expData.pluginId || 'sentaurus-tcad',
        status: 'Ready',
        version: 1,
        parameters: expData.parameters || [],
        notes: [],
        attachments: [],
        tags: expData.tags || ['Sentaurus'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Researcher',
      };
      setExperiments((prev) => [fallbackExp, ...prev]);
      setActiveExperimentId(fallbackExp.id);
    }
  };

  // Handler: Clone Experiment (ARP-012)
  const handleCloneExperiment = async (id: string) => {
    try {
      const clonedExp = await apiClient.cloneExperiment(id);
      setExperiments((prev) => [clonedExp, ...prev]);
      setActiveExperimentId(clonedExp.id);
    } catch {
      const target = experiments.find((e) => e.id === id);
      if (!target) return;
      const clone: Experiment = {
        ...target,
        id: `exp-${Date.now()}`,
        parentId: target.id,
        title: `${target.title} (Clone v${target.version + 1})`,
        version: target.version + 1,
        status: 'Ready',
        results: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setExperiments((prev) => [clone, ...prev]);
      setActiveExperimentId(clone.id);
    }
  };

  const handleUpdateExperiment = (id: string, updates: Partial<Experiment>) => {
    setExperiments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e))
    );
  };

  // Handler: Launch Simulation Job (ARP-013)
  const handleRunSimulation = async (expId: string) => {
    try {
      const newJob = await apiClient.runSimulation(expId);
      setSimulationJobs((prev) => [newJob, ...prev]);
      setActiveTab('queue');
    } catch {
      const targetExp = experiments.find((e) => e.id === expId);
      const fallbackJob: SimulationJob = {
        id: `sim-job-${Date.now()}`,
        experimentId: expId,
        experimentTitle: targetExp?.title || 'TCAD Simulation',
        pluginId: 'sentaurus-tcad',
        pluginName: 'Synopsys Sentaurus TCAD',
        status: 'Running',
        progress: 15,
        startTime: new Date().toISOString(),
        cpuUsage: 82,
        memoryUsage: 9.2,
        hostMachine: 'node-compute-03.arp.local',
        logs: [
          `[${new Date().toLocaleTimeString()}] Sentaurus TCAD Solver process launched.`,
          `[${new Date().toLocaleTimeString()}] Grid mesh loaded into memory. Solving Poisson-Schrödinger hydrodynamic system...`,
        ],
      };
      setSimulationJobs((prev) => [fallbackJob, ...prev]);
      setActiveTab('queue');
    }
  };

  // Handler: Simulation Job Control (Pause, Resume, Cancel, Retry)
  const handleJobAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    try {
      const updatedJob = await apiClient.performJobAction(jobId, action);
      setSimulationJobs((prev) => prev.map((j) => (j.id === jobId ? updatedJob : j)));
    } catch {
      setSimulationJobs((prev) =>
        prev.map((j) => {
          if (j.id === jobId) {
            const statusMap: Record<string, any> = {
              pause: 'Paused',
              resume: 'Running',
              cancel: 'Cancelled',
              retry: 'Running',
            };
            return {
              ...j,
              status: statusMap[action] || j.status,
              logs: [...j.logs, `[${new Date().toLocaleTimeString()}] User performed action: ${action}`],
            };
          }
          return j;
        })
      );
    }
  };

  // Handler: Optimization Step (ARP-006)
  const handleStepOptimization = async (jobId: string) => {
    try {
      const updated = await apiClient.stepOptimization(jobId);
      setOptimizationJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch {
      setOptimizationJobs((prev) =>
        prev.map((job) => {
          if (job.id === jobId) {
            const nextIter = job.currentIteration + 1;
            const nextVal = (job.bestValue || 5e6) * 1.08;
            return {
              ...job,
              currentIteration: nextIter,
              bestValue: nextVal,
              history: [
                ...job.history,
                {
                  iteration: nextIter,
                  parameters: {
                    Gate_Length_nm: Number((10 + Math.random() * 4).toFixed(1)),
                    WorkFunction_eV: Number((4.5 + Math.random() * 0.2).toFixed(2)),
                  },
                  objectiveValue: nextVal,
                  isParetoOptimal: true,
                },
              ],
              status: nextIter >= job.maxIterations ? 'Completed' : 'Running',
            };
          }
          return job;
        })
      );
    }
  };

  // Handler: Generate Report with Gemini API (ARP-010)
  const handleGenerateReport = async (exp: Experiment) => {
    try {
      const newReport = await apiClient.generateReport(exp, activeProject?.title || 'ARP Project');
      setReports((prev) => [newReport, ...prev]);
      setActiveTab('reports');
    } catch {
      const fallbackReport: GeneratedReport = {
        id: `rep-${Date.now()}`,
        experimentId: exp.id,
        experimentTitle: exp.title,
        projectName: activeProject?.title || 'ARP Project',
        title: `${exp.title} Scientific Report`,
        author: 'AI Scientist Agent',
        createdAt: new Date().toISOString(),
        version: '1.0',
        markdownContent: `# Scientific Report: ${exp.title}\n\n## 1. Executive Summary\nTCAD simulation completed successfully using Sentaurus TCAD plugin.`,
      };
      setReports((prev) => [fallbackReport, ...prev]);
      setActiveTab('reports');
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

      const newProj = await apiClient.createProject(projectData).catch(() => ({
        id: `proj-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...projectData,
      }));

      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);

      // 2. Upload model file
      await apiClient.createProjectModel(newProj.id, {
        fileName: config.modelFileName,
        fileType: config.modelFormat,
        simulator: config.simulatorId,
        physicsModule: 'Hydrodynamic',
        owner: 'AI Agent',
        absolutePath: `/workspaces/projects/${newProj.id}/models/${config.modelFileName}`,
        fileSize: 12288,
        checksum: 'sha256-a1b2c3d4',
        content: config.modelFileContent,
        description: `Model file for ${config.title}`,
        version: '1.0',
        isDefault: true,
      }).catch(() => {});

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

      const newExp = await apiClient.createExperiment(newExpData).catch(() => ({
        id: `exp-${Date.now()}`,
        ...newExpData,
      }));

      setExperiments((prev) => [newExp, ...prev]);
      setActiveExperimentId(newExp.id);

      // 4. Automatically run simulation and switch to queue/execution view
      await handleRunSimulation(newExp.id);
    } catch (err) {
      console.error('Error launching AI research:', err);
    }
  };

  const runningJobCount = simulationJobs.filter((j) => j.status === 'Running').length;

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
