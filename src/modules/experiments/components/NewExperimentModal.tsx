import React, { useState, useEffect } from 'react';
import { Project, SimulatorPlugin, Experiment, ModelFile } from '../../../types';
import { apiClient } from '../../../services/apiClient';
import {
  FlaskConical,
  X,
  FileCode,
  HardDrive,
  Cpu,
  Layers,
  AlertTriangle,
  Check,
  RefreshCw,
  Target,
  Sparkles,
} from 'lucide-react';

interface NewExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  plugins: SimulatorPlugin[];
  activeProjectId: string | null;
  onCreateExperiment: (experimentData: Partial<Experiment>) => void;
}

export const NewExperimentModal: React.FC<NewExperimentModalProps> = ({
  isOpen,
  onClose,
  projects,
  plugins,
  activeProjectId,
  onCreateExperiment,
}) => {
  if (!isOpen) return null;

  const [projectId, setProjectId] = useState<string>(activeProjectId || projects[0]?.id || '');
  const [projectModels, setProjectModels] = useState<ModelFile[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const [title, setTitle] = useState<string>('');
  const [researchGoal, setResearchGoal] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');

  // Load models whenever target project changes
  useEffect(() => {
    if (!projectId) return;
    setLoadingModels(true);
    const targetProject = projects.find((p) => p.id === projectId);

    apiClient
      .getProjectModels(projectId)
      .then((models) => {
        setProjectModels(models);
        if (models.length > 0) {
          // Preselect default model or first model
          const defaultModel =
            models.find((m) => m.isDefault) ||
            models.find((m) => m.id === targetProject?.defaultModelId) ||
            models[0];

          setSelectedModelId(defaultModel.id);
          setTitle(`Sweep: ${defaultModel.fileName}`);
          setResearchGoal(defaultModel.description || targetProject?.researchGoal || '');
          setTagsInput(`${defaultModel.simulator}, ${defaultModel.physicsModule}`);
        } else {
          setSelectedModelId('');
          setTitle('');
        }
      })
      .catch(() => {
        setProjectModels([]);
        setSelectedModelId('');
      })
      .finally(() => {
        setLoadingModels(false);
      });
  }, [projectId, projects]);

  // Handle selecting a different model file
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = projectModels.find((m) => m.id === modelId);
    if (model) {
      setTitle(`Sweep: ${model.fileName}`);
      setResearchGoal(model.description || '');
      setTagsInput(`${model.simulator}, ${model.physicsModule}`);
    }
  };

  const selectedModel = projectModels.find((m) => m.id === selectedModelId);
  const selectedProject = projects.find((p) => p.id === projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedModel) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const defaultParameters = [
      { key: 'primary_stimulus', name: 'Primary Bias / Sweep Voltage', value: 0.7, unit: 'V', min: 0.0, max: 2.0, group: 'Bias' },
      { key: 'ambient_temp', name: 'Ambient Temperature', value: 300, unit: 'K', min: 200, max: 450, group: 'Environment' },
      { key: 'solver_tolerance', name: 'Solver Relative Tolerance', value: '1e-5', unit: '-', group: 'Numerical' },
    ];

    onCreateExperiment({
      projectId,
      modelId: selectedModel.id,
      modelFileName: selectedModel.fileName,
      simulator: selectedModel.simulator,
      physicsModule: selectedModel.physicsModule,
      title,
      researchGoal: researchGoal || selectedModel.description,
      description: description || `Execution sweep on ${selectedModel.fileName} using ${selectedModel.simulator}`,
      pluginId: 'plugin-auto',
      status: 'Ready',
      parameters: defaultParameters,
      tags: tags.length > 0 ? tags : [selectedModel.simulator, selectedModel.physicsModule],
      createdBy: 'Dr. Jasur Alimov',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Execute Model Experiment
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Active Project Context */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Active Research Project</span>
              <span className="text-xs font-bold text-cyan-300">{selectedProject?.title || 'Active Research Project'}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {selectedProject?.simulator || 'Universal Simulator'}
            </span>
          </div>

          {/* Select Model File inside Project */}
          <div>
            <div className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Select Scientific Model File *</span>
              {loadingModels && (
                <span className="text-[11px] text-cyan-400 flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Fetching models...</span>
                </span>
              )}
            </div>

            {projectModels.length === 0 && !loadingModels ? (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">No Scientific Model Files Uploaded in Active Project</p>
                  <p className="text-[11px] text-amber-300/80">
                    A project cannot execute unless a valid model file exists. Please go to Project Management and upload/import a model file (.mph, .cmd, .in, .py) first.
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={selectedModelId}
                onChange={(e) => handleModelSelect(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              >
                {projectModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fileName} — {m.simulator} ({m.physicsModule})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 3: Auto-Detected Simulator & Physics Module Inspector */}
          {selectedModel && (
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[11px] font-semibold text-cyan-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Detected Execution Specifications</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  VERIFIED MODEL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Simulator Platform:</span>
                  <span className="text-slate-100 font-semibold flex items-center space-x-1 mt-0.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedModel.simulator}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Physics Module:</span>
                  <span className="text-slate-100 font-semibold flex items-center space-x-1 mt-0.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedModel.physicsModule}</span>
                  </span>
                </div>
              </div>

              <div className="pt-1 text-[11px] font-mono text-slate-400 border-t border-slate-800/60 flex items-center justify-between">
                <span>Workspace Isolation:</span>
                <span className="text-cyan-300">
                  /workspaces/exp-run/{selectedModel.fileName} (Original file unchanged)
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Experiment Title */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              3. Experiment Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3nm Nanosheet I-V Transport Sweep"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Step 5: Research Goal & Notes */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              4. Research Goal & Simulation Notes
            </label>
            <textarea
              rows={2}
              value={researchGoal}
              onChange={(e) => setResearchGoal(e.target.value)}
              placeholder="Specific scientific objective for this simulation run..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedModel}
              className={`px-5 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-md transition-all ${
                selectedModel
                  ? 'bg-cyan-600 hover:bg-cyan-500'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Run Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
