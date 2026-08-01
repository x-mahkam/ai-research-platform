import React, { useEffect, useRef, useState } from 'react';
import { Experiment, RebuildRun } from '../../../types';
import { apiClient } from '../../../services/apiClient';
import { Wrench, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface Props {
  experiment: Experiment;
}

/**
 * Experimental: ask the AI to write a COMSOL Java (LiveLink) model script that
 * applies a structural fix, then have the platform compile & run it to produce
 * a corrected .mph. Honest by construction — it shows the generated code and
 * the full compile/run logs, and reports failure plainly.
 */
export const ModelRebuildPanel: React.FC<Props> = ({ experiment }) => {
  const { t } = useI18n();
  const [instruction, setInstruction] = useState('');
  const [run, setRun] = useState<RebuildRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const active = run?.status === 'generating' || run?.status === 'building';

  const poll = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const latest = await apiClient.getRebuildModel(id);
        setRun(latest);
        if (latest.status === 'completed' || latest.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
  };

  const handleStart = async () => {
    setError(null);
    if (!instruction.trim()) {
      setError(t('rebuild.err.instruction'));
      return;
    }
    setStarting(true);
    try {
      const started = await apiClient.startRebuildModel({
        experimentId: experiment.id,
        instruction: instruction.trim(),
        providers: experiment.aiProviders,
      });
      setRun(started);
      poll(started.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const statusLabel = run
    ? run.status === 'generating'
      ? t('rebuild.status.generating')
      : run.status === 'building'
      ? t('rebuild.status.building')
      : run.status === 'completed'
      ? t('rebuild.status.completed')
      : t('rebuild.status.failed')
    : '';

  return (
    <details className="bg-slate-900 rounded-xl border border-slate-800 p-5 group">
      <summary className="flex items-center gap-2 cursor-pointer list-none">
        <Wrench className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-white">{t('rebuild.title')}</h2>
        <span className="text-[10px] uppercase tracking-wide bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
          {t('rebuild.beta')}
        </span>
      </summary>

      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-900/50 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{t('rebuild.warning')}</p>
        </div>

        <label className="block text-xs text-slate-300 space-y-1">
          <span>{t('rebuild.instruction')}</span>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={active}
            rows={3}
            placeholder={t('rebuild.placeholder')}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-xs disabled:opacity-60"
          />
        </label>

        {error && <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded p-2">{error}</div>}

        <div className="flex items-center gap-2">
          <button
            onClick={handleStart}
            disabled={starting || active}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            {starting || active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            {t('rebuild.launch')}
          </button>
          {run && (
            <span className="text-xs flex items-center gap-1.5 text-slate-300">
              {run.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {run.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
              {active && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
              {statusLabel}
              {run.provider ? ` · ${run.provider}` : ''}
            </span>
          )}
        </div>

        {run?.status === 'completed' && (
          <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-2.5">
            {t('rebuild.done', { path: run.outputModelPath || '' })}
          </div>
        )}
        {run?.error && (
          <div className="text-xs text-red-300 bg-red-950/30 border border-red-900/50 rounded-lg p-2.5">{run.error}</div>
        )}

        {run?.javaSource && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-400 hover:text-white">{t('rebuild.showCode')}</summary>
            <pre className="mt-2 bg-slate-950 border border-slate-800 rounded p-3 overflow-x-auto text-slate-300 max-h-72">
              {run.javaSource}
            </pre>
          </details>
        )}
        {(run?.compileLog || run?.runLog) && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-400 hover:text-white">{t('rebuild.showLogs')}</summary>
            <pre className="mt-2 bg-slate-950 border border-slate-800 rounded p-3 overflow-x-auto text-slate-400 max-h-72 whitespace-pre-wrap">
              {[run?.compileLog, run?.runLog].filter(Boolean).join('\n\n--- run ---\n\n')}
            </pre>
          </details>
        )}
      </div>
    </details>
  );
};
