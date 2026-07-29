import React, { useState } from 'react';
import { Experiment, GeneratedReport } from '../../../types';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface ReportGeneratorViewProps {
  experiment: Experiment;
  reports: GeneratedReport[];
  projectName: string;
  onGenerateReport: (experiment: Experiment) => void;
}

export const ReportGeneratorView: React.FC<ReportGeneratorViewProps> = ({
  experiment,
  reports,
  projectName,
  onGenerateReport,
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const handleTriggerGenerate = async () => {
    setIsGenerating(true);
    await onGenerateReport(experiment);
    setIsGenerating(false);
  };

  const copyMarkdown = () => {
    if (activeReport) {
      navigator.clipboard.writeText(activeReport.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="reports-view-root" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">AI Report Generator (ARP-010)</h1>
            <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
              Publication Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatically compile TCAD simulation setup, physical transport models, metrics, and AI observations into Markdown/PDF reports.
          </p>
        </div>

        <button
          onClick={handleTriggerGenerate}
          disabled={isGenerating}
          className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isGenerating ? 'Generating with Gemini...' : 'Generate AI Report'}</span>
        </button>
      </div>

      {/* Main Grid: Saved Reports List + Report Content Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saved Reports (1 col) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
            Generated Reports
          </div>

          <div className="space-y-2">
            {reports.map((rep) => {
              const isSelected = rep.id === activeReport?.id;
              return (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`p-3.5 rounded-lg border text-xs cursor-pointer transition space-y-2 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-cyan-400">v{rep.version}</span>
                    <span className="text-[10px] text-slate-500">{new Date(rep.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="font-medium text-slate-200">{rep.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{rep.projectName}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Content Preview (2 cols) */}
        {activeReport ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Control Bar */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-100">{activeReport.title}</span>
                <p className="text-[11px] text-slate-400 font-mono">Author: {activeReport.author}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={copyMarkdown}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded text-xs font-medium cursor-pointer flex items-center space-x-1.5 transition"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
              </div>
            </div>

            {/* Markdown Paper Canvas */}
            <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-slate-200 font-sans leading-relaxed text-xs space-y-4 shadow-inner">
              <div className="whitespace-pre-wrap font-mono text-slate-200 text-xs">
                {activeReport.markdownContent}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-8 text-center text-slate-400">
            No report selected. Click "Generate AI Report" to create a new one.
          </div>
        )}
      </div>
    </div>
  );
};
