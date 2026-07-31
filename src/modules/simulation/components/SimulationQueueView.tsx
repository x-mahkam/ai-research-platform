import React, { useState, useEffect } from 'react';
import { SimulationJob } from '../../../types';
import {
  Play,
  Pause,
  XSquare,
  RotateCcw,
  Terminal,
  Cpu,
  HardDrive,
  Server,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Activity,
  Layers,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface SchedulerWorker {
  id: string;
  name: string;
  host: string;
  status: 'IDLE' | 'BUSY' | 'RECOVERING' | 'OFFLINE';
  assignedJobId?: string;
  cpuCapacityPercent: number;
  memoryCapacityGB: number;
  lastHeartbeat: string;
  tasksCompleted: number;
}

interface SchedulerResourceQuota {
  totalCpuPercent: number;
  totalMemoryGB: number;
  allocatedCpuPercent: number;
  allocatedMemoryGB: number;
}

interface SchedulerHistoryEntry {
  id: string;
  jobId?: string;
  eventType: string;
  description: string;
  timestamp: string;
}

interface SchedulerState {
  queue: Array<{
    id: string;
    experimentId: string;
    experimentTitle: string;
    pluginName: string;
    priority: number;
    priorityLevel: string;
    status: string;
    queuedAt: string;
    retryCount: number;
    maxRetries: number;
    workerId?: string;
    cpuRequired: number;
    memoryRequiredGB: number;
    error?: string;
  }>;
  policyMode: 'FIFO' | 'PRIORITY';
  isPaused: boolean;
  workers: SchedulerWorker[];
  concurrency: number;
  activeWorkerCount: number;
  resources: SchedulerResourceQuota;
  history: SchedulerHistoryEntry[];
}

interface SimulationQueueViewProps {
  simulationJobs: SimulationJob[];
  onJobAction: (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => void;
  onQuickRunSimulation: () => void;
}

export const SimulationQueueView: React.FC<SimulationQueueViewProps> = ({
  simulationJobs,
  onJobAction,
  onQuickRunSimulation,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(simulationJobs[0]?.id || '');
  const [schedulerState, setSchedulerState] = useState<SchedulerState | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'workers' | 'history'>('console');

  const fetchSchedulerState = async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      if (res.ok) {
        const data = await res.json();
        setSchedulerState(data);
      }
    } catch {
      // Ignore API disconnect
    }
  };

  useEffect(() => {
    fetchSchedulerState();
    const interval = setInterval(fetchSchedulerState, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePauseQueue = async () => {
    try {
      const res = await fetch('/api/scheduler/pause', { method: 'POST' });
      const data = await res.json();
      setSchedulerState(data);
    } catch {}
  };

  const handleResumeQueue = async () => {
    try {
      const res = await fetch('/api/scheduler/resume', { method: 'POST' });
      const data = await res.json();
      setSchedulerState(data);
    } catch {}
  };

  const handleSetPolicy = async (mode: 'FIFO' | 'PRIORITY') => {
    try {
      const res = await fetch('/api/scheduler/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      setSchedulerState(data);
    } catch {}
  };

  const handleSetConcurrency = async (concurrency: number) => {
    try {
      const res = await fetch('/api/scheduler/concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurrency }),
      });
      const data = await res.json();
      setSchedulerState(data);
    } catch {}
  };

  const handleTriggerRecovery = async () => {
    try {
      const res = await fetch('/api/scheduler/recovery', { method: 'POST' });
      const data = await res.json();
      setSchedulerState(data);
    } catch {}
  };

  const selectedJob = simulationJobs.find((j) => j.id === selectedJobId) || simulationJobs[0];

  const runningCount = simulationJobs.filter((j) => j.status === 'Running').length;
  const queuedCount = simulationJobs.filter((j) => j.status === 'Queued').length;

  return (
    <div id="simulation-queue-root" className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header & Queue Control Center */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Real-Time Scheduler</h1>
              <span
                className={`text-xs font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                  schedulerState?.isPaused
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}
              >
                {schedulerState?.isPaused ? 'QUEUE PAUSED' : 'SCHEDULER ACTIVE'}
              </span>
              <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
                {runningCount} Running / {queuedCount} Queued
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic priority & FIFO task scheduler communicating directly with Simulation Engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Pause / Resume Queue */}
            {schedulerState?.isPaused ? (
              <button
                onClick={handleResumeQueue}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition shadow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Scheduler</span>
              </button>
            ) : (
              <button
                onClick={handlePauseQueue}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition shadow"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Queue</span>
              </button>
            )}

            {/* Worker Recovery Trigger */}
            <button
              onClick={handleTriggerRecovery}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/60 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition"
              title="Detect stale workers and reclaim crashed jobs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Recover Workers</span>
            </button>

            {/* Dispatch New Simulation */}
            <button
              onClick={onQuickRunSimulation}
              className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Dispatch Job</span>
            </button>
          </div>
        </div>

        {/* Scheduler Controls Bar: Policy + Concurrency + Resource Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
          {/* Policy Selector */}
          <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Priority Strategy:</span>
            </span>
            <div className="flex bg-slate-900 p-0.5 rounded border border-slate-700">
              <button
                onClick={() => handleSetPolicy('PRIORITY')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                  schedulerState?.policyMode === 'PRIORITY'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Priority
              </button>
              <button
                onClick={() => handleSetPolicy('FIFO')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                  schedulerState?.policyMode === 'FIFO'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                FIFO
              </button>
            </div>
          </div>

          {/* Concurrency Selector */}
          <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Parallel Workers:</span>
            </span>
            <div className="flex bg-slate-900 p-0.5 rounded border border-slate-700 space-x-1">
              {[2, 4, 8].map((c) => (
                <button
                  key={c}
                  onClick={() => handleSetConcurrency(c)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                    schedulerState?.concurrency === c
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c} Slots
                </button>
              ))}
            </div>
          </div>

          {/* Resource Usage Summary */}
          <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cluster Resource Lock:</span>
            </span>
            <span className="font-mono text-slate-200 font-bold">
              CPU: {schedulerState?.resources.allocatedCpuPercent || 0}% / RAM:{' '}
              {schedulerState?.resources.allocatedMemoryGB || 0} GB
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Enqueued Jobs Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <span>Scheduler Queue</span>
            <span className="text-[10px] text-cyan-400 font-mono">{simulationJobs.length} Jobs Total</span>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {simulationJobs.map((job) => {
              const isSelected = job.id === selectedJob?.id;
              const schedItem = schedulerState?.queue.find((q) => q.id === job.id);

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-3.5 rounded-lg border text-xs cursor-pointer transition space-y-2 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] text-cyan-400">{job.id}</span>
                      {schedItem && (
                        <span className="bg-slate-800 text-cyan-300 px-1.5 py-0.2 rounded text-[9px] font-mono border border-slate-700">
                          P:{schedItem.priorityLevel}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase ${
                        job.status === 'Running'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                          : job.status === 'Completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : job.status === 'Cancelled'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="font-medium text-slate-200 truncate">{job.experimentTitle}</div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>{job.pluginName}</span>
                    <span>{job.progress}%</span>
                  </div>

                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Stage: Console / Worker Pool Nodes / Event History Tabs */}
        {selectedJob ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Job Header & Direct Actions */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-cyan-400">{selectedJob.id}</span>
                    <span className="text-xs text-slate-400">• Worker Node: {selectedJob.hostMachine}</span>
                  </div>
                  <h2 className="text-base font-bold text-white">{selectedJob.experimentTitle}</h2>
                </div>

                {/* Process Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {selectedJob.status === 'Running' && (
                    <button
                      onClick={() => onJobAction(selectedJob.id, 'pause')}
                      className="bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 px-3 py-1.5 rounded text-xs font-medium cursor-pointer flex items-center space-x-1"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Job</span>
                    </button>
                  )}

                  {selectedJob.status === 'Paused' && (
                    <button
                      onClick={() => onJobAction(selectedJob.id, 'resume')}
                      className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 px-3 py-1.5 rounded text-xs font-medium cursor-pointer flex items-center space-x-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Job</span>
                    </button>
                  )}

                  {(selectedJob.status === 'Running' || selectedJob.status === 'Queued') && (
                    <button
                      onClick={() => onJobAction(selectedJob.id, 'cancel')}
                      className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1.5 rounded text-xs font-medium cursor-pointer flex items-center space-x-1"
                    >
                      <XSquare className="w-3.5 h-3.5" />
                      <span>Cancel Job</span>
                    </button>
                  )}

                  {(selectedJob.status === 'Completed' || selectedJob.status === 'Cancelled') && (
                    <button
                      onClick={() => onJobAction(selectedJob.id, 'retry')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded text-xs font-medium cursor-pointer flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-queue Job</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Telemetry Gauges */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>CPU Allocation</span>
                  </div>
                  <div className="text-lg font-bold text-slate-100 font-mono">{selectedJob.cpuUsage}%</div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    <span>RAM Quota</span>
                  </div>
                  <div className="text-lg font-bold text-slate-100 font-mono">{selectedJob.memoryUsage} GB</div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Engine Plugin</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-300 font-mono truncate">{selectedJob.pluginName}</div>
                </div>
              </div>
            </div>

            {/* Failure reason — the real error, surfaced prominently */}
            {(selectedJob.status === 'Failed' || selectedJob.error) && selectedJob.error && (
              <div className="bg-red-950/50 border border-red-800/70 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-red-300 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Simulation failed</span>
                </div>
                <p className="text-[12px] text-red-200 font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {selectedJob.error}
                </p>
              </div>
            )}

            {/* Navigation Tabs: Live Console | Worker Pool Nodes | Audit History */}
            <div className="flex border-b border-slate-800 space-x-4 text-xs font-medium">
              <button
                onClick={() => setActiveTab('console')}
                className={`pb-2 flex items-center space-x-1.5 border-b-2 cursor-pointer transition ${
                  activeTab === 'console'
                    ? 'border-cyan-400 text-cyan-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Solver Terminal Console</span>
              </button>

              <button
                onClick={() => setActiveTab('workers')}
                className={`pb-2 flex items-center space-x-1.5 border-b-2 cursor-pointer transition ${
                  activeTab === 'workers'
                    ? 'border-cyan-400 text-cyan-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Worker Pool Nodes ({schedulerState?.workers.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 flex items-center space-x-1.5 border-b-2 cursor-pointer transition ${
                  activeTab === 'history'
                    ? 'border-cyan-400 text-cyan-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Scheduler Audit Events</span>
              </button>
            </div>

            {/* Tab 1: Terminal Console */}
            {activeTab === 'console' && (
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-slate-200">Simulation Engine Live Stream</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 animate-pulse">● LIVE SCHEDULER LOG</span>
                </div>

                <div className="bg-black/80 p-4 rounded-lg h-72 overflow-y-auto space-y-1 text-xs text-slate-300 border border-slate-900">
                  {selectedJob.logs.map((log, index) => (
                    <div key={index} className="leading-relaxed">
                      <span className="text-slate-600 select-none mr-2">[{index + 1}]</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Worker Pool Nodes */}
            {activeTab === 'workers' && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
                  Worker Pool Slots & Heartbeat Telemetry
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {schedulerState?.workers.map((w) => (
                    <div key={w.id} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">{w.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            w.status === 'IDLE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : w.status === 'BUSY'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 space-y-1">
                        <div>Host: {w.host}</div>
                        <div>Assigned Job: {w.assignedJobId || 'None (Idle)'}</div>
                        <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                          <span>Completed: {w.tasksCompleted} tasks</span>
                          <span>Heartbeat: OK</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Scheduler Audit History */}
            {activeTab === 'history' && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3 font-mono">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
                  Scheduler Event History Audit Trail
                </div>

                <div className="bg-slate-950 p-3 rounded-lg h-72 overflow-y-auto space-y-2 text-xs border border-slate-900">
                  {schedulerState?.history.map((h) => (
                    <div key={h.id} className="border-b border-slate-800/80 pb-2 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-cyan-400 font-bold">[{h.eventType}]</span>
                        <span className="text-slate-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-300 text-[11px]">{h.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-8 text-center text-slate-400">
            No simulation job selected.
          </div>
        )}
      </div>
    </div>
  );
};
