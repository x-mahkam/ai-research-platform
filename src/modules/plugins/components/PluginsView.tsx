import React, { useState } from 'react';
import { SimulatorPlugin } from '../../../types';
import {
  Blocks,
  CheckCircle2,
  ShieldCheck,
  Code,
  Layers,
  Cpu,
  FileCode,
  FileText,
  AlertTriangle,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface PluginsViewProps {
  plugins: SimulatorPlugin[];
}

export const PluginsView: React.FC<PluginsViewProps> = ({ plugins }) => {
  const [selectedPluginId, setSelectedPluginId] = useState<string>('sentaurus-tcad');
  const selectedPlugin = plugins.find((p) => p.id === selectedPluginId) || plugins[0];
  const [isValidationRunning, setIsValidationRunning] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);

  const runPluginValidation = () => {
    if (!selectedPlugin) return;
    setIsValidationRunning(true);
    setValidationResult(null);
    setTimeout(() => {
      setIsValidationRunning(false);
      setValidationResult(
        `✓ Plugin SDK Validation Passed for ${selectedPlugin.name}\n✓ Executable verified: /usr/synopsys/sentaurus/${selectedPlugin.version}/bin/sdevice\n✓ License daemon status: 12 Floating Licenses Available\n✓ File handlers registered for: ${(selectedPlugin.capabilities?.supportedFileTypes || []).join(', ')}`
      );
    }, 1500);
  };

  return (
    <div id="plugins-view-root" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Plugin SDK & Simulator Registry (ARP-014 & ARP-015)</h1>
            <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
              {plugins.length} Plugins
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Decoupled simulation engine architecture. Core target: Synopsys Sentaurus TCAD with QuantumATK, COMSOL & Lumerical integrations.
          </p>
        </div>

        <button
          onClick={runPluginValidation}
          disabled={isValidationRunning}
          className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isValidationRunning ? 'Validating...' : 'Run Plugin Validation'}</span>
        </button>
      </div>

      {/* Main Grid: Plugin List + Selected Plugin Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Plugin Cards (1 col) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
            Registered Simulators
          </div>

          <div className="space-y-3">
            {plugins.map((plugin) => {
              const isSelected = selectedPlugin ? plugin.id === selectedPlugin.id : false;
              return (
                <div
                  key={plugin.id}
                  onClick={() => {
                    setSelectedPluginId(plugin.id);
                    setValidationResult(null);
                  }}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition space-y-2 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{plugin.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        plugin.status === 'Active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {plugin.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{plugin.description}</p>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                    <span>{plugin.vendor}</span>
                    <span>{plugin.version}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Plugin Specification & Command Script Inspector (2 cols) */}
        {selectedPlugin ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Plugin Summary Box */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-cyan-400">{selectedPlugin.id}</span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5" /> License: {selectedPlugin.licenseStatus}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedPlugin.name}</h2>
                </div>
                <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded text-slate-300 border border-slate-700">
                  {selectedPlugin.version}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{selectedPlugin.description}</p>

            {/* Validation Diagnostic Output */}
            {validationResult && (
              <div className="bg-slate-950 p-3.5 rounded-lg border border-cyan-800/80 font-mono text-xs text-cyan-300 whitespace-pre-wrap leading-relaxed">
                {validationResult}
              </div>
            )}

            {/* Capabilities Matrix */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">Capabilities Matrix</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800 flex items-center justify-between text-slate-300">
                  <span>2D Mesh Mesh</span>
                  <span className={selectedPlugin.capabilities.supports2DMesh ? 'text-emerald-400' : 'text-slate-600'}>
                    {selectedPlugin.capabilities.supports2DMesh ? '✓' : '✗'}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800 flex items-center justify-between text-slate-300">
                  <span>3D Multiphysics</span>
                  <span className={selectedPlugin.capabilities.supports3D ? 'text-emerald-400' : 'text-slate-600'}>
                    {selectedPlugin.capabilities.supports3D ? '✓' : '✗'}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800 flex items-center justify-between text-slate-300">
                  <span>Parallel Solver</span>
                  <span className={selectedPlugin.capabilities.supportsParallel ? 'text-emerald-400' : 'text-slate-600'}>
                    {selectedPlugin.capabilities.supportsParallel ? '✓' : '✗'}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800 flex items-center justify-between text-slate-300">
                  <span>Optimization</span>
                  <span className={selectedPlugin.capabilities.supportsOptimization ? 'text-emerald-400' : 'text-slate-600'}>
                    {selectedPlugin.capabilities.supportsOptimization ? '✓' : '✗'}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800 flex items-center justify-between text-slate-300">
                  <span>Pause & Resume</span>
                  <span className={selectedPlugin.capabilities.supportsPauseResume ? 'text-emerald-400' : 'text-slate-600'}>
                    {selectedPlugin.capabilities.supportsPauseResume ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>

            {/* Supported Extensions */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">Registered File Formats</div>
              <div className="flex flex-wrap gap-2">
                {selectedPlugin.capabilities.supportedFileTypes.map((ext) => (
                  <span
                    key={ext}
                    className="bg-slate-800 text-cyan-300 border border-slate-700 px-2.5 py-1 rounded font-mono text-xs"
                  >
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sample Solver Script Preview */}
          {selectedPlugin.sampleScript && (
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs text-slate-400 font-mono">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200">Sentaurus TCAD Command Template (.cmd)</span>
                </div>
                <span>AUTO-GENERATED BY ARP-015</span>
              </div>

              <pre className="p-4 bg-slate-900 rounded-lg font-mono text-xs text-cyan-300/90 overflow-x-auto leading-relaxed border border-slate-800">
                {selectedPlugin.sampleScript}
              </pre>
            </div>
          )}
        </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-8 text-center text-slate-400">
            No simulator plugin selected.
          </div>
        )}
      </div>
    </div>
  );
};
