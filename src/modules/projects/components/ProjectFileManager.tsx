import React, { useState, useEffect, useCallback } from 'react';
import { Project, ModelFile } from '../../../types';
import { apiClient } from '../../../services/apiClient';
import { DEFAULT_SIMULATORS } from '../../../data/simulatorRegistry';
import {
  FileCode,
  Upload,
  Copy,
  Trash2,
  Edit2,
  Download,
  Info,
  RefreshCw,
  Plus,
  X,
  Check,
  AlertTriangle,
  HardDrive,
  Cpu,
  Layers,
  Hash,
  ShieldAlert,
  Star,
} from 'lucide-react';

interface ProjectFileManagerProps {
  project: Project;
  onModelChange?: () => void;
}

export const ProjectFileManager: React.FC<ProjectFileManagerProps> = ({ project, onModelChange }) => {
  const [models, setModels] = useState<ModelFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedMetaModel, setSelectedMetaModel] = useState<ModelFile | null>(null);
  const [editingModel, setEditingModel] = useState<ModelFile | null>(null);
  const [deletingModel, setDeletingModel] = useState<ModelFile | null>(null);
  const [replacingModel, setReplacingModel] = useState<ModelFile | null>(null);

  // Replace Model form state
  const [replaceFileName, setReplaceFileName] = useState<string>('');
  const [replaceContent, setReplaceContent] = useState<string>('');
  const [replaceFileSize, setReplaceFileSize] = useState<number>(0);

  // Set Default Model
  const handleSetDefault = async (modelId: string) => {
    try {
      await apiClient.setDefaultModel(project.id, modelId);
      fetchModels();
      if (onModelChange) onModelChange();
    } catch (err: any) {
      alert(`Failed to set default model: ${err.message}`);
    }
  };

  // Replace model file submission
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingModel || !replaceFileName.trim()) return;

    try {
      await apiClient.replaceProjectModel(project.id, replacingModel.id, {
        fileName: replaceFileName.trim(),
        content: replaceContent || `# Replaced model file: ${replaceFileName}\n`,
        fileSize: replaceFileSize || 184320,
        simulator: replacingModel.simulator,
        physicsModule: replacingModel.physicsModule,
      });

      setReplacingModel(null);
      setReplaceFileName('');
      setReplaceContent('');
      fetchModels();
      if (onModelChange) onModelChange();
    } catch (err: any) {
      alert(`Failed to replace model file: ${err.message}`);
    }
  };

  // Upload Form state
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadSimulator, setUploadSimulator] = useState<string>(project.simulator || 'COMSOL Multiphysics');
  const [uploadPhysicsModule, setUploadPhysicsModule] = useState<string>(project.physicsModule || 'Heat Transfer');
  const [uploadFileType, setUploadFileType] = useState<string>('.mph');
  const [uploadContent, setUploadContent] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [autoDetectedTag, setAutoDetectedTag] = useState<boolean>(false);

  // Load models for this project
  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getProjectModels(project.id);
      setModels(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load project model files.');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Handle auto detection when typing upload file name
  const handleFileNameChange = async (name: string) => {
    setUploadFileName(name);
    if (!name.trim()) return;

    setIsDetecting(true);
    try {
      const detected = await apiClient.detectModelMeta(name);
      setUploadSimulator(detected.simulator);
      setUploadPhysicsModule(detected.physicsModule);
      setUploadFileType(detected.fileType);
      setAutoDetectedTag(true);
    } catch (e) {
      // Ignore fallback
    } finally {
      setIsDetecting(false);
    }
  };

  // Read a picked file from disk into the form (filename + content), and
  // auto-detect the simulator from the extension.
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text().catch(() => '');
    setUploadContent(text);
    await handleFileNameChange(file.name);
  };

  // Generate a minimal, valid starter script for the selected simulator so a
  // user without an existing model file can still create and run an experiment.
  const generateStarterTemplate = () => {
    const ext = uploadFileType || '.cmd';
    const base = uploadFileName.trim() || `starter_model${ext}`;
    const fileName = base.includes('.') ? base : `${base}${ext}`;
    const template = `# Starter scientific model generated by AI Research Platform
# Simulator: ${uploadSimulator}
# Physics Module: ${uploadPhysicsModule}
#
# Replace the placeholders below with your real solver setup, or run as-is
# to validate the end-to-end pipeline.

Device "Starter_Device" {
  Grid    = "auto_mesh.grd"
  Physics = ${uploadPhysicsModule}
  Plot    ( Potential eDensity hDensity )
}

Solve {
  Coupled { Poisson Electron Hole }
}
`;
    setUploadFileName(fileName);
    setUploadContent(template);
    if (!uploadDescription.trim()) {
      setUploadDescription(`Starter ${uploadSimulator} model (${uploadPhysicsModule})`);
    }
    handleFileNameChange(fileName);
  };

  // Upload model submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;

    try {
      await apiClient.createProjectModel(project.id, {
        fileName: uploadFileName.trim(),
        simulator: uploadSimulator,
        physicsModule: uploadPhysicsModule,
        fileType: uploadFileType,
        content: uploadContent || `# Scientific Model File: ${uploadFileName}\n# Simulator: ${uploadSimulator}\n# Physics Module: ${uploadPhysicsModule}\n`,
        description: uploadDescription || `Model file for ${uploadSimulator} solver`,
        owner: project.principalInvestigator || 'Dr. Jasur Alimov',
      });

      setIsUploadOpen(false);
      setUploadFileName('');
      setUploadContent('');
      setUploadDescription('');
      setAutoDetectedTag(false);
      fetchModels();
      if (onModelChange) onModelChange();
    } catch (err: any) {
      alert(`Error creating model file: ${err.message}`);
    }
  };

  // Duplicate model
  const handleDuplicate = async (modelId: string) => {
    try {
      await apiClient.duplicateProjectModel(project.id, modelId);
      fetchModels();
      if (onModelChange) onModelChange();
    } catch (err: any) {
      alert(`Failed to duplicate model: ${err.message}`);
    }
  };

  // Rename/Update model
  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel || !editingModel.fileName.trim()) return;

    try {
      await apiClient.updateProjectModel(project.id, editingModel.id, {
        fileName: editingModel.fileName,
        simulator: editingModel.simulator,
        physicsModule: editingModel.physicsModule,
        description: editingModel.description,
      });
      setEditingModel(null);
      fetchModels();
      if (onModelChange) onModelChange();
    } catch (err: any) {
      alert(`Failed to rename model: ${err.message}`);
    }
  };

  // Delete model
  const handleConfirmDelete = async () => {
    if (!deletingModel) return;
    try {
      await apiClient.deleteProjectModel(project.id, deletingModel.id);
      setDeletingModel(null);
      fetchModels();
      if (onModelChange) onModelChange();
    } catch (err: any) {
      alert(`Failed to delete model: ${err.message}`);
    }
  };

  // Download model
  const handleDownload = (model: ModelFile) => {
    const blob = new Blob([model.content || `# Model: ${model.fileName}\n# Simulator: ${model.simulator}\n`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = model.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Scientific Models</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
              {models.length} {models.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Every research project owns its model files (.mph, .cmd, .py, .in, .fsp). Experiments execute isolated copies of these files.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center justify-center space-x-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Import / Upload Model</span>
        </button>
      </div>

      {/* Model Files Table / Empty State */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-slate-400 space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Loading project model files...</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : models.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/40 space-y-3">
          <FileCode className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-300">No Scientific Model Files Uploaded</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Experiments in this project require at least one valid model file. Upload a simulator file (.mph, .cmd, .in, .py, .fsp) to begin running simulations.
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Model File</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">File Name</th>
                <th className="py-2.5 px-3">Simulator</th>
                <th className="py-2.5 px-3">Physics Module</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {models.map((m) => {
                const isDefault = m.isDefault || m.id === project.defaultModelId;
                return (
                  <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center space-x-2">
                      <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-mono text-xs flex items-center space-x-2">
                          <span>{m.fileName}</span>
                          {isDefault && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wide bg-amber-950 text-amber-300 border border-amber-700/80 rounded">
                              DEFAULT MODEL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                          {m.absolutePath}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px]">
                        {m.simulator}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 text-[11px]">
                        {m.physicsModule}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {formatFileSize(m.fileSize)}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {m.version}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Set Default Model Star button */}
                        <button
                          title={isDefault ? 'Default Scientific Model' : 'Set as Default Project Model'}
                          onClick={() => !isDefault && handleSetDefault(m.id)}
                          className={`p-1.5 rounded cursor-pointer transition ${
                            isDefault
                              ? 'text-amber-400 bg-amber-950/50'
                              : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* Replace File */}
                        <button
                          title="Replace Scientific Model File"
                          onClick={() => {
                            setReplacingModel(m);
                            setReplaceFileName(m.fileName);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        {/* View Metadata Inspector */}
                        <button
                          title="View File Metadata & SHA-256 Checksum"
                          onClick={() => setSelectedMetaModel(m)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>

                        {/* Download */}
                        <button
                          title="Download Model File"
                          onClick={() => handleDownload(m)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate */}
                        <button
                          title="Duplicate Model File"
                          onClick={() => handleDuplicate(m.id)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit / Rename */}
                        <button
                          title="Rename / Update Model"
                          onClick={() => setEditingModel({ ...m })}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          title="Delete Model File"
                          onClick={() => setDeletingModel(m)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Upload / Import Model */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Import Scientific Model File</h3>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              {/* Choose an existing file from disk, or generate a starter template */}
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-2.5 cursor-pointer text-slate-200">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Choose model file from computer…</span>
                  <input
                    type="file"
                    onChange={handleFilePicked}
                    className="hidden"
                    accept=".cmd,.mph,.py,.in,.fsp,.m,.foam,.txt,.dat,.tcl"
                  />
                </label>
                <button
                  type="button"
                  onClick={generateStarterTemplate}
                  className="flex items-center gap-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg px-3 py-2.5 cursor-pointer whitespace-nowrap"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Generate starter</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-500 text-center">
                — or fill in the details manually below —
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  File Name * <span className="text-slate-500 font-normal">(e.g. Nanosheet_Transport.cmd, Heat_Sink.mph)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={uploadFileName}
                    onChange={(e) => handleFileNameChange(e.target.value)}
                    placeholder="e.g. Battery_Thermal_Model.mph"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  {isDetecting && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400 absolute right-3 top-3" />
                  )}
                </div>
                {autoDetectedTag && (
                  <div className="flex items-center space-x-1 text-[11px] text-cyan-400 mt-1">
                    <Check className="w-3 h-3" />
                    <span>Auto-detected simulator format: {uploadSimulator} ({uploadPhysicsModule})</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Simulator Platform</label>
                  <select
                    value={uploadSimulator}
                    onChange={(e) => setUploadSimulator(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {DEFAULT_SIMULATORS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Physics Module</label>
                  <input
                    type="text"
                    value={uploadPhysicsModule}
                    onChange={(e) => setUploadPhysicsModule(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="e.g. Mesh configuration and physics settings for thermal boundary analysis"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Model Script / Commands Content</label>
                <textarea
                  rows={4}
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Paste model solver commands, script lines, or configuration parameters here..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Import Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View Metadata Inspector */}
      {selectedMetaModel && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Model File Metadata Inspector</h3>
              </div>
              <button onClick={() => setSelectedMetaModel(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">File Name:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedMetaModel.fileName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Simulator:</span>
                  <span className="text-slate-200 font-medium">{selectedMetaModel.simulator}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Physics Module:</span>
                  <span className="text-slate-200 font-medium">{selectedMetaModel.physicsModule}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Version:</span>
                  <span className="font-mono text-slate-300">{selectedMetaModel.version}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">File Size:</span>
                  <span className="font-mono text-slate-300">{formatFileSize(selectedMetaModel.fileSize)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Owner / PI:</span>
                  <span className="text-slate-300">{selectedMetaModel.owner}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Absolute Workspace Path</span>
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {selectedMetaModel.absolutePath}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SHA-256 Verification Checksum</span>
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-cyan-400 break-all">
                  {selectedMetaModel.checksum}
                </div>
              </div>

              {selectedMetaModel.description && (
                <div className="space-y-1">
                  <span className="text-slate-400 text-[11px]">Description:</span>
                  <p className="text-slate-300 text-xs bg-slate-950/60 p-2 rounded border border-slate-800">
                    {selectedMetaModel.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedMetaModel(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Rename / Edit Model */}
      {editingModel && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Rename / Update Model File</h3>
              </div>
              <button onClick={() => setEditingModel(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={editingModel.fileName}
                  onChange={(e) => setEditingModel({ ...editingModel, fileName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Physics Module</label>
                <input
                  type="text"
                  value={editingModel.physicsModule}
                  onChange={(e) => setEditingModel({ ...editingModel, physicsModule: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={editingModel.description || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingModel(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Replace Scientific Model File */}
      {replacingModel && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Replace Scientific Model File</h3>
              </div>
              <button onClick={() => setReplacingModel(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Replacing model file for <span className="font-mono text-cyan-300">{replacingModel.fileName}</span> (Simulator: {replacingModel.simulator}). This updates the active execution model.
            </p>

            <form onSubmit={handleReplaceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">New File Name</label>
                <input
                  type="text"
                  required
                  value={replaceFileName}
                  onChange={(e) => setReplaceFileName(e.target.value)}
                  placeholder="New_Model_Version.mph"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <span className="block text-slate-300 font-medium mb-1">Upload / Select File</span>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/60 p-4 rounded-xl text-center cursor-pointer">
                  <span className="flex flex-col items-center space-y-1">
                    <Upload className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs text-slate-300 font-medium">Browse replacement file...</span>
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setReplaceFileName(file.name);
                        setReplaceFileSize(file.size);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setReplaceContent((ev.target?.result as string) || '');
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReplacingModel(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-cyan-900/50"
                >
                  Replace File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deletingModel && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center space-x-3 text-red-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">Delete Model File</h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete <span className="font-mono text-cyan-300">{deletingModel.fileName}</span>? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeletingModel(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
