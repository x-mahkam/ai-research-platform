import React, { useState } from 'react';
import { Experiment, SimulationParameter, ExperimentNote } from '../../../types';
import {
  FlaskConical,
  Copy,
  Plus,
  Play,
  History,
  Paperclip,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Tag,
  ChevronDown,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface ExperimentsViewProps {
  experiments: Experiment[];
  activeExperimentId: string | null;
  onSelectExperiment: (id: string) => void;
  onCloneExperiment: (id: string) => void;
  onUpdateExperiment: (id: string, updates: Partial<Experiment>) => void;
  onRunSimulation: (experimentId: string) => void;
  onOpenNewExperimentModal: () => void;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({
  experiments,
  activeExperimentId,
  onSelectExperiment,
  onCloneExperiment,
  onUpdateExperiment,
  onRunSimulation,
  onOpenNewExperimentModal,
}) => {
  const activeExp = experiments.find((e) => e.id === activeExperimentId) || experiments[0];
  const [activeTab, setActiveTab] = useState<'parameters' | 'results' | 'notes' | 'attachments'>('parameters');
  const [newNoteText, setNewNoteText] = useState('');

  if (!activeExp) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <FlaskConical className="w-12 h-12 mx-auto text-slate-600" />
        <p className="text-sm">No experiments available. Create a new experiment to begin.</p>
        <button
          onClick={onOpenNewExperimentModal}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold"
        >
          Create Experiment
        </button>
      </div>
    );
  }

  const handleParameterChange = (key: string, newValue: number | string) => {
    const updatedParameters = activeExp.parameters.map((p) => {
      if (p.key === key) {
        return { ...p, value: typeof p.value === 'number' ? Number(newValue) : newValue };
      }
      return p;
    });

    onUpdateExperiment(activeExp.id, { parameters: updatedParameters });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: ExperimentNote = {
      id: `note-${Date.now()}`,
      author: 'Researcher (You)',
      content: newNoteText,
      createdAt: new Date().toISOString(),
      version: activeExp.version,
    };

    onUpdateExperiment(activeExp.id, {
      notes: [newNote, ...activeExp.notes],
    });
    setNewNoteText('');
  };

  // Group parameters by parameter group
  const parameterGroups = activeExp.parameters.reduce((acc: Record<string, SimulationParameter[]>, param: SimulationParameter) => {
    const groupName = param.group || 'General Parameters';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(param);
    return acc;
  }, {});

  return (
    <div id="experiments-view-root" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
              VERSION {activeExp.version}
            </span>
            {activeExp.parentId && (
              <span className="text-[10px] text-slate-400 font-mono">Cloned from {activeExp.parentId}</span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                activeExp.status === 'Completed'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : activeExp.status === 'Running'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {activeExp.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{activeExp.title}</h1>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">{activeExp.description}</p>

          {/* Model File & Execution Workspace Spec */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            {activeExp.modelFileName && (
              <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-cyan-300 font-mono text-[11px]">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Model: <strong>{activeExp.modelFileName}</strong></span>
              </div>
            )}
            {activeExp.simulator && (
              <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300 font-mono text-[11px]">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulator: <strong>{activeExp.simulator}</strong></span>
              </div>
            )}
            {activeExp.physicsModule && (
              <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300 font-mono text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Module: <strong>{activeExp.physicsModule}</strong></span>
              </div>
            )}
            {activeExp.workspacePath && (
              <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-400 font-mono text-[10px]">
                <span>Workspace: {activeExp.workspacePath}</span>
              </div>
            )}
          </div>
        </div>

        {/* Experiment Actions */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onCloneExperiment(activeExp.id)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition"
            title="Clone experiment parameters for a new iteration"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Clone (v{activeExp.version + 1})</span>
          </button>

          <button
            onClick={() => onRunSimulation(activeExp.id)}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer shadow-md transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute Model Simulation</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Experiment Selector & Right Detail Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Experiments List (1 col) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Experiments</span>
            <button
              onClick={onOpenNewExperimentModal}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {experiments.map((exp) => {
              const isSelected = exp.id === activeExp.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => onSelectExperiment(exp.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition space-y-1.5 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-cyan-400">v{exp.version}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                        exp.status === 'Completed'
                          ? 'bg-emerald-950 text-emerald-400'
                          : exp.status === 'Running'
                          ? 'bg-cyan-950 text-cyan-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </div>
                  <div className="font-medium truncate text-slate-200">{exp.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {exp.parameters.length} Parameters | {exp.pluginId}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-5">
          {/* Tabs Navigation */}
          <div className="flex items-center space-x-6 border-b border-slate-800 pb-3 text-xs font-medium">
            <button
              onClick={() => setActiveTab('parameters')}
              className={`flex items-center space-x-2 pb-1 border-b-2 transition cursor-pointer ${
                activeTab === 'parameters'
                  ? 'border-cyan-500 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Simulation Parameters ({activeExp.parameters.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center space-x-2 pb-1 border-b-2 transition cursor-pointer ${
                activeTab === 'results'
                  ? 'border-cyan-500 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Results & Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center space-x-2 pb-1 border-b-2 transition cursor-pointer ${
                activeTab === 'notes'
                  ? 'border-cyan-500 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Research Notes ({activeExp.notes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center space-x-2 pb-1 border-b-2 transition cursor-pointer ${
                activeTab === 'attachments'
                  ? 'border-cyan-500 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>Attachments ({activeExp.attachments.length})</span>
            </button>
          </div>

          {/* TAB 1: PARAMETER EDITOR */}
          {activeTab === 'parameters' && (
            <div className="space-y-6">
              {(Object.entries(parameterGroups) as [string, SimulationParameter[]][]).map(([groupName, params]) => (
                <div key={groupName} className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{groupName}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {params.map((param) => (
                      <div key={param.key} className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-200">{param.name}</span>
                          <span className="font-mono text-cyan-400 font-bold">
                            {param.value} {param.unit}
                          </span>
                        </div>

                        {typeof param.value === 'number' && param.min !== undefined && param.max !== undefined ? (
                          <div className="space-y-1">
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step || (param.max - param.min) / 50}
                              value={param.value}
                              onChange={(e) => handleParameterChange(param.key, parseFloat(e.target.value))}
                              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>Min: {param.min}</span>
                              <span>Max: {param.max}</span>
                            </div>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => handleParameterChange(param.key, e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: RESULTS SUMMARY */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {activeExp.results ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(activeExp.results.metrics).map(([key, val]) => (
                      <div key={key} className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
                        <div className="text-[11px] text-slate-400 font-medium">{key}</div>
                        <div className="text-base font-bold text-cyan-300 font-mono">{val}</div>
                      </div>
                    ))}
                  </div>

                  {activeExp.results.outputFiles && (
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-200">Generated Simulation Files</div>
                      <div className="divide-y divide-slate-800 text-xs font-mono">
                        {activeExp.results.outputFiles.map((file) => (
                          <div key={file.name} className="py-2 flex items-center justify-between text-slate-300">
                            <span>{file.name} ({file.type})</span>
                            <span className="text-slate-500 text-[11px]">{file.size}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-xs">No execution results available yet. Run a simulation to generate artifacts.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add structured research observation or parameter change log..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </form>

              <div className="space-y-3 pt-2">
                {activeExp.notes.map((note) => (
                  <div key={note.id} className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-cyan-400">{note.author}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  <span className="font-bold">Command & Data Files</span>
                  <p className="text-[11px] text-slate-500">Sentaurus command scripts (.cmd), grid meshes (.tdr), plot datasets.</p>
                </div>
                <button className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-3 py-1.5 rounded text-xs font-medium cursor-pointer">
                  Upload File
                </button>
              </div>

              {activeExp.attachments.map((att) => (
                <div key={att.id} className="bg-slate-800/60 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <Paperclip className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="font-mono text-slate-200 font-medium">{att.name}</div>
                      <div className="text-[10px] text-slate-500">{att.type} • {att.size}</div>
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-white cursor-pointer p-1">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
