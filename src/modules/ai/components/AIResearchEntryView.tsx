import React, { useState } from 'react';
import {
  Sparkles,
  Brain,
  Cpu,
  Layers,
  Upload,
  FileCode,
  Play,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Zap,
  RotateCcw,
  RefreshCw,
  Atom,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Project, Experiment, SimulatorPlugin } from '../../../types';
import { apiClient } from '../../../services/apiClient';
import { useI18n } from '../../../i18n';

interface AIResearchEntryViewProps {
  plugins: SimulatorPlugin[];
  onLaunchResearch: (config: {
    title: string;
    objective: string;
    simulatorId: string;
    modelFileName: string;
    modelFileContent: string;
    modelFormat: string;
    initialParameters: Record<string, number | string>;
  }) => void;
  recentExperiments: Experiment[];
  onSelectExperiment: (expId: string) => void;
}

export const AIResearchEntryView: React.FC<AIResearchEntryViewProps> = ({
  plugins,
  onLaunchResearch,
  recentExperiments,
  onSelectExperiment,
}) => {
  const { t } = useI18n();
  const [objective, setObjective] = useState('');
  const [step, setStep] = useState<'prompt' | 'analysis' | 'model_select' | 'confirm'>('prompt');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // AI Analyzed State
  const [analyzedData, setAnalyzedData] = useState<{
    detectedDomain: string;
    recommendedSimulator: SimulatorPlugin;
    extractedMetrics: string[];
    suggestedParameters: Record<string, { value: number | string; unit: string; description: string }>;
    physicsSummary: string;
  } | null>(null);

  // Model choice state
  const [hasExistingModel, setHasExistingModel] = useState<boolean | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('default');

  const presetObjectives = [
    {
      label: 'Semiconductor TCAD Transfer Sweep',
      text: 'Analyze subthreshold swing (SS), threshold voltage (Vt), and drain-induced barrier lowering (DIBL) in a 12nm FinFET device under hydrodynamic transport.',
      simulator: 'sentaurus_tcad',
    },
    {
      label: '3D Thermal Hotspot & Heat Sink CFD',
      text: 'Simulate Conjugate Heat Transfer (CHT) and temperature dissipation in a copper microchannel heat sink with turbulent fluid dynamics.',
      simulator: 'comsol_mph',
    },
    {
      label: '2D Material Bandgap Calculation',
      text: 'Perform Density Functional Theory (DFT) quantum calculation for monolayer MoS2 band gap and electron effective mass using GGA-PBE exchange correlation.',
      simulator: 'quantumatk_py',
    },
    {
      label: 'Photonic Crystal Waveguide Transmission',
      text: 'Calculate optical transmission spectra and group velocity dispersion in a silicon photonic crystal ring resonator at 1550nm wavelength.',
      simulator: 'lumerical_fsp',
    },
  ];

  const handleAnalyzeObjective = async (textToAnalyze?: string) => {
    const text = textToAnalyze || objective;
    if (!text.trim()) return;

    if (textToAnalyze) setObjective(textToAnalyze);

    setIsAnalyzing(true);
    setAnalysisError(null);
    setStep('analysis');

    try {
      const plan = await apiClient.planResearch(text);

      // Resolve the plan's plugin id against the loaded plugin list; fall back
      // to keyword matching since ids can differ between registry versions.
      const findPlugin = (keyword: string) =>
        plugins.find(
          (p) =>
            p.id.toLowerCase().includes(keyword) ||
            p.name.toLowerCase().includes(keyword) ||
            (p.simulatorName || '').toLowerCase().includes(keyword)
        );

      const planPluginKey = plan.recommendedPlugin.toLowerCase().split('-')[0];
      const matchedPlugin =
        plugins.find((p) => p.id === plan.recommendedPlugin) || findPlugin(planPluginKey) || plugins[0];

      if (!matchedPlugin) {
        throw new Error('No simulator plugins are registered on the backend.');
      }

      setAnalyzedData({
        detectedDomain: matchedPlugin.scientificFields?.[0] || 'Scientific Simulation',
        recommendedSimulator: matchedPlugin,
        extractedMetrics: plan.physicalModels,
        suggestedParameters: Object.fromEntries(
          Object.entries(plan.suggestedParameters).map(([key, value]) => [
            key,
            {
              value: (typeof value === 'number' || typeof value === 'string' ? value : String(value)) as
                | number
                | string,
              unit: '',
              description: key.replace(/_/g, ' '),
            },
          ])
        ),
        physicsSummary: plan.rationale,
      });

      setStep('model_select');
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Objective analysis failed.');
      setStep('prompt');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFileContent(event.target?.result as string || '# Custom Scientific Model File');
      };
      reader.readAsText(file);
    }
  };

  const handleFinalLaunch = () => {
    if (!analyzedData) return;

    let finalFileName = uploadedFileName;
    let finalContent = uploadedFileContent;

    if (!hasExistingModel || !uploadedFileName) {
      const firstFileType = analyzedData.recommendedSimulator.capabilities?.supportedFileTypes?.[0];
      const ext = firstFileType ? firstFileType.replace(/^\./, '') : 'cmd';
      finalFileName = `AI_Generated_Model_${Date.now()}.${ext}`;
      finalContent = `# Auto-generated Scientific Model Template by AI Agent
# Solver: ${analyzedData.recommendedSimulator.name}
# Objective: ${objective}

Device "AI_Research_Target" {
  Grid = "auto_mesh.grd"
  Physics = Hydrodynamic
  Plot (eDensity hDensity eTemperature Potential)
}
File {
  Output = "simulation_result.tdr"
  Plot = "iv_sweep.plt"
}
`;
    }

    const format = finalFileName.split('.').pop() || 'cmd';

    const params: Record<string, number | string> = {};
    if (analyzedData.suggestedParameters) {
      Object.entries(analyzedData.suggestedParameters).forEach(([key, val]) => {
        params[key] = (val as { value: number | string }).value;
      });
    }

    onLaunchResearch({
      title: objective.length > 55 ? objective.substring(0, 52) + '...' : objective,
      objective,
      simulatorId: analyzedData.recommendedSimulator.id,
      modelFileName: finalFileName,
      modelFileContent: finalContent,
      modelFormat: format,
      initialParameters: params,
    });
  };

  return (
    <div id="ai-research-entry-root" className="max-w-5xl mx-auto p-6 space-y-8">
      {/* AI Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
                {t('entry.badge')}
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t('entry.title')}
              </h1>
            </div>
          </div>

          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {t('entry.desc')}
          </p>

          <div className="flex items-center space-x-6 pt-2 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('entry.tag.realExec')}</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Atom className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('entry.tag.zero')}</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('entry.tag.sweeps')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Research Goal Prompt Section */}
      {step === 'prompt' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          {analysisError && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
              {analysisError}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>{t('entry.question')}</span>
              </span>
              <span className="text-xs font-mono text-slate-400 font-normal">{t('entry.step1of3')}</span>
            </label>
            <div className="relative">
              <textarea
                id="research-objective-input"
                rows={4}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder={t('entry.placeholder')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium leading-relaxed resize-none transition"
              />
              <button
                id="analyze-objective-btn"
                onClick={() => handleAnalyzeObjective()}
                disabled={!objective.trim()}
                className="absolute bottom-3 right-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center space-x-2 shadow-lg cursor-pointer transition"
              >
                <span>{t('entry.analyzeBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Prompts */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
              {t('entry.presets')}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presetObjectives.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnalyzeObjective(preset.text)}
                  className="p-3.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-700/60 rounded-xl text-left space-y-1.5 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">
                      {preset.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.text}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Active Research Runs */}
          {recentExperiments.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                  {t('entry.recent')}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{t('entry.recentHint')}</span>
              </div>
              <div className="space-y-2">
                {recentExperiments.slice(0, 3).map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => onSelectExperiment(exp.id)}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <div>
                        <div className="font-bold text-white">{exp.title}</div>
                        <div className="text-[11px] text-slate-400">{t('entry.simulator')} {exp.simulator}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {t('entry.viewExecution')} &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Analysis & Simulator Selection */}
      {(step === 'analysis' || isAnalyzing) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-center">
          <div className="inline-flex p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">{t('entry.analyzing')}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t('entry.analyzingHint')}
            </p>
          </div>
        </div>
      )}

      {step === 'model_select' && analyzedData && (
        <div className="space-y-6">
          {/* AI Analysis Result Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">
                    {t('entry.analysisComplete')}
                  </span>
                  <h3 className="text-sm font-bold text-white">{t('entry.targetIdentified')}</h3>
                </div>
              </div>
              <button
                onClick={() => setStep('prompt')}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('entry.changeObjective')}</span>
              </button>
            </div>

            {/* Selected Simulator Badge */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block uppercase">{t('entry.selectedEngine')}</span>
                <span className="font-bold text-cyan-300 text-sm">{analyzedData.recommendedSimulator.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block uppercase">{t('entry.physicsDomain')}</span>
                <span className="font-semibold text-slate-200">{analyzedData.detectedDomain}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block uppercase">{t('entry.modelFormat')}</span>
                <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5">
                  {(analyzedData.recommendedSimulator.capabilities?.supportedFileTypes || ['.cmd'])
                    .map((t) => `*${t}`)
                    .join(', ')}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-cyan-950/30 border border-cyan-800/50 p-3.5 rounded-xl">
              {analyzedData.physicsSummary}
            </p>
          </div>

          {/* Model File Question: Do you have a model? */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>{t('entry.haveModelQ')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('entry.haveModelHint')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Yes, upload */}
              <div
                onClick={() => setHasExistingModel(true)}
                className={`p-5 rounded-xl border cursor-pointer transition space-y-3 ${
                  hasExistingModel === true
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">{t('entry.yesUpload')}</span>
                  </div>
                  {hasExistingModel === true && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('entry.yesUploadHint')}
                </p>
              </div>

              {/* Option 2: No, create template */}
              <div
                onClick={() => {
                  setHasExistingModel(false);
                  setUploadedFileName('');
                }}
                className={`p-5 rounded-xl border cursor-pointer transition space-y-3 ${
                  hasExistingModel === false
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">{t('entry.noTemplate')}</span>
                  </div>
                  {hasExistingModel === false && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('entry.noTemplateHint', { name: analyzedData.recommendedSimulator.name })}
                </p>
              </div>
            </div>

            {/* If YES: Show file uploader */}
            {hasExistingModel === true && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  {t('entry.selectFromStorage')}
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                />
                {uploadedFileName && (
                  <div className="p-2.5 bg-cyan-950 border border-cyan-800 rounded-lg text-xs text-cyan-300 font-mono flex items-center justify-between">
                    <span>{t('entry.loaded', { name: uploadedFileName })}</span>
                    <span className="text-[10px] text-emerald-400">{t('entry.ready')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Launch Button */}
            {hasExistingModel !== null && (
              <div className="pt-2 flex justify-end">
                <button
                  id="launch-research-btn"
                  onClick={handleFinalLaunch}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center space-x-2 shadow-xl cursor-pointer transition transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t('entry.launch')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
