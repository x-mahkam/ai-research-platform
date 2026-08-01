import React, { useEffect, useRef, useState } from 'react';
import { Experiment, AutonomousRun } from '../../../types';
import { apiClient } from '../../../services/apiClient';
import { Rocket, Loader2, CheckCircle2, XCircle, StopCircle, Clock } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface Props {
  experiment: Experiment;
}

/**
 * Expand start/stop/step into a list of single scalar values, appending an
 * optional unit. Bounded to keep the sweep within the backend's point cap.
 */
function buildValues(start: number, stop: number, step: number, unit: string): Array<string> {
  const out: string[] = [];
  if (!Number.isFinite(start) || !Number.isFinite(stop) || !Number.isFinite(step) || step <= 0) return out;
  const lo = Math.min(start, stop);
  const hi = Math.max(start, stop);
  for (let v = lo; v <= hi + 1e-9 && out.length < 40; v += step) {
    // Trim floating-point noise, then attach units (e.g. "0.35[V]").
    const num = Number(v.toFixed(6));
    out.push(unit ? `${num}${unit}` : String(num));
  }
  return out;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-slate-500" />,
  running: <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

export const AutonomousResearchPanel: React.FC<Props> = ({ experiment }) => {
  const { t } = useI18n();
  const [parameter, setParameter] = useState('V_app');
  const [unit, setUnit] = useState('[V]');
  const [start, setStart] = useState('0');
  const [stop, setStop] = useState('0.7');
  const [step, setStep] = useState('0.05');
  const [objectiveMetric, setObjectiveMetric] = useState('');
  const [run, setRun] = useState<AutonomousRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const preview = buildValues(Number(start), Number(stop), Number(step), unit);
  const isActive = run?.status === 'running' || run?.status === 'concluding';

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const poll = (runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const latest = await apiClient.getAutoResearch(runId);
        setRun(latest);
        if (latest.status === 'completed' || latest.status === 'failed' || latest.status === 'stopped') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // transient; keep polling
      }
    }, 2000);
  };

  const handleStart = async () => {
    setError(null);
    if (preview.length === 0) {
      setError(t('auto.err.range'));
      return;
    }
    setStarting(true);
    try {
      const started = await apiClient.startAutoResearch({
        experimentId: experiment.id,
        parameter: parameter.trim(),
        values: preview,
        objectiveMetric: objectiveMetric.trim() || undefined,
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

  const handleStop = async () => {
    if (!run) return;
    try {
      const stopped = await apiClient.stopAutoResearch(run.id);
      setRun(stopped);
    } catch {
      /* ignore */
    }
  };

  const doneCount = run?.points.filter((p) => p.status === 'completed' || p.status === 'failed').length || 0;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
      <div className="flex items-center space-x-2">
        <Rocket className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">{t('auto.title')}</h2>
      </div>
      <p className="text-xs text-slate-400">{t('auto.subtitle')}</p>

      {/* Configuration */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="text-xs text-slate-300 space-y-1">
          <span>{t('auto.parameter')}</span>
          <input
            value={parameter}
            onChange={(e) => setParameter(e.target.value)}
            disabled={isActive}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-xs disabled:opacity-60"
          />
        </label>
        <label className="text-xs text-slate-300 space-y-1">
          <span>{t('auto.unit')}</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={isActive}
            placeholder="[V]"
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-xs disabled:opacity-60"
          />
        </label>
        <label className="text-xs text-slate-300 space-y-1">
          <span>{t('auto.objective')}</span>
          <input
            value={objectiveMetric}
            onChange={(e) => setObjectiveMetric(e.target.value)}
            disabled={isActive}
            placeholder="ec.I0_1"
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-xs disabled:opacity-60"
          />
        </label>
        <label className="text-xs text-slate-300 space-y-1">
          <span>{t('auto.start')}</span>
          <input
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={isActive}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-xs disabled:opacity-60"
          />
        </label>
        <label className="text-xs text-slate-300 space-y-1">
          <span>{t('auto.stop')}</span>
          <input
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            disabled={isActive}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-xs disabled:opacity-60"
          />
        </label>
        <label className="text-xs text-slate-300 space-y-1">
          <span>{t('auto.step')}</span>
          <input
            value={step}
            onChange={(e) => setStep(e.target.value)}
            disabled={isActive}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-xs disabled:opacity-60"
          />
        </label>
      </div>

      <div className="text-xs text-slate-400">
        {t('auto.points', { count: String(preview.length) })}:{' '}
        <span className="font-mono text-slate-300">
          {preview.slice(0, 6).join(', ')}
          {preview.length > 6 ? ' …' : ''}
        </span>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded p-2">{error}</div>}

      <div className="flex items-center gap-2">
        {!isActive && (
          <button
            onClick={handleStart}
            disabled={starting || preview.length === 0}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {t('auto.launch')}
          </button>
        )}
        {isActive && (
          <button
            onClick={handleStop}
            className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <StopCircle className="w-4 h-4" />
            {t('auto.stop.btn')}
          </button>
        )}
        {run && (
          <span className="text-xs text-slate-400">
            {t('auto.progress', { done: String(doneCount), total: String(run.points.length) })} — {run.status}
          </span>
        )}
      </div>

      {/* Live results table */}
      {run && run.points.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="text-left py-1.5 px-2 font-medium">{parameter}</th>
                <th className="text-left py-1.5 px-2 font-medium">{t('auto.col.status')}</th>
                <th className="text-left py-1.5 px-2 font-medium">{t('auto.col.objective')}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {run.points.map((p, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td className="py-1.5 px-2 text-slate-200">{String(p.value)}</td>
                  <td className="py-1.5 px-2">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      {STATUS_ICON[p.status]}
                      {p.status}
                      {p.error ? <span className="text-red-400">— {p.error}</span> : null}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-cyan-300">{p.objective != null ? p.objective : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI conclusion */}
      {run?.conclusion && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-2">{t('auto.conclusion')}</h3>
          <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{run.conclusion}</div>
        </div>
      )}
    </div>
  );
};
