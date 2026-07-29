import React, { useState } from 'react';
import { OptimizationJob, OptimizationAlgorithm } from '../../../types';
import {
  Sliders,
  Play,
  CheckCircle2,
  TrendingUp,
  Activity,
  Award,
  RefreshCw,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

interface OptimizationViewProps {
  optimizationJobs: OptimizationJob[];
  onCreateOptimization: (job: any) => void;
  onStepOptimization: (jobId: string) => void;
}

export const OptimizationView: React.FC<OptimizationViewProps> = ({
  optimizationJobs,
  onCreateOptimization,
  onStepOptimization,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(optimizationJobs[0]?.id || '');
  const activeJob = optimizationJobs.find((j) => j.id === selectedJobId) || optimizationJobs[0];

  // New Optimization modal / form state
  const [algorithm, setAlgorithm] = useState<OptimizationAlgorithm>('Bayesian Optimization');
  const [targetMetric, setTargetMetric] = useState('Max Ion/Ioff ratio (Target > 1e7)');
  const [maxIterations, setMaxIterations] = useState(20);

  const handleRunNewStep = () => {
    if (activeJob) {
      onStepOptimization(activeJob.id);
    }
  };

  return (
    <div id="optimization-view-root" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Optimization Engine (ARP-006)</h1>
            <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
              Bayesian & Genetic Solvers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated multi-parameter searching to maximize target figure-of-merit (FOM) metrics in semiconductor TCAD.
          </p>
        </div>

        <button
          onClick={handleRunNewStep}
          disabled={!activeJob || activeJob.status === 'Completed'}
          className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Dispatch Optimization Iteration</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Optimization Jobs List (1 col) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
            Active Solvers
          </div>

          <div className="space-y-3">
            {optimizationJobs.map((job) => {
              const isSelected = job.id === activeJob?.id;
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition space-y-2 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 truncate max-w-[150px]">{job.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        job.status === 'Running'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1">{job.targetMetric}</p>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                    <span>Algorithm: {job.algorithm}</span>
                    <span>
                      Iter: {job.currentIteration}/{job.maxIterations}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Optimization Details & Pareto Points (2 cols) */}
        {activeJob ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Best Found Figure-of-Merit Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 p-5 rounded-xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" /> OPTIMAL PARETO SOLUTION FOUND
                </span>
                <span className="text-slate-400">Iteration {activeJob.currentIteration}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400">Best Objective Value</div>
                  <div className="text-base font-bold text-cyan-300 font-mono">
                    {activeJob.bestValue ? activeJob.bestValue.toExponential(2) : 'Searching...'}
                  </div>
                </div>

                {activeJob.bestParameters &&
                  Object.entries(activeJob.bestParameters).map(([pName, pVal]) => (
                    <div key={pName} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 truncate">{pName}</div>
                      <div className="text-sm font-bold text-slate-100 font-mono">{pVal}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Convergence History Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 uppercase tracking-wider">
                  Optimization Convergence History ({activeJob.history.length} Runs)
                </span>
                <span className="text-slate-400 font-mono">Algorithm: {activeJob.algorithm}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                      <th className="p-2.5">Iter #</th>
                      <th className="p-2.5">Objective Value</th>
                      <th className="p-2.5">Gate Length (nm)</th>
                      <th className="p-2.5">Workfunction (eV)</th>
                      <th className="p-2.5">Pareto Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {activeJob.history.map((item) => (
                      <tr key={item.iteration} className="hover:bg-slate-800/50">
                        <td className="p-2.5 font-bold text-cyan-400">#{item.iteration}</td>
                        <td className="p-2.5 font-bold text-emerald-300">
                          {item.objectiveValue.toExponential(2)}
                        </td>
                        <td className="p-2.5">{item.parameters.Gate_Length_nm || 12}</td>
                        <td className="p-2.5">{item.parameters.WorkFunction_eV || 4.58}</td>
                        <td className="p-2.5">
                          {item.isParetoOptimal ? (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                              PARETO OPTIMAL
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Sub-optimal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-8 text-center text-slate-400">
            No optimization solver active.
          </div>
        )}
      </div>
    </div>
  );
};
