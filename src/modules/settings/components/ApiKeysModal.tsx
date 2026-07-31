import React, { useEffect, useState } from 'react';
import { KeyRound, X, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { useI18n } from '../../../i18n';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type ProviderMeta = { id: string; label: string; model: string; configured: boolean };

// Where users obtain each key, and which have a free tier.
const KEY_INFO: Record<string, { url: string; free?: boolean }> = {
  gemini: { url: 'https://aistudio.google.com/apikey', free: true },
  deepseek: { url: 'https://platform.deepseek.com' },
  openai: { url: 'https://platform.openai.com/api-keys' },
  grok: { url: 'https://console.x.ai' },
  claude: { url: 'https://console.anthropic.com/settings/keys' },
};

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { t } = useI18n();
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValues({});
    setMessage(null);
    apiClient
      .getAIProviders()
      .then((d) => setProviders(d.providers))
      .catch(() => setProviders([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = {};
      for (const [id, v] of Object.entries(values)) {
        if (v && v.trim()) payload[id] = v.trim();
      }
      const res = await apiClient.saveAIKeys(payload);
      setProviders(res.providers);
      setValues({});
      setMessage(t('keys.saved'));
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('keys.title')}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">{t('keys.desc')}</p>

        <div className="space-y-3">
          {providers.map((p) => {
            const info = KEY_INFO[p.id];
            return (
              <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate">{p.label}</span>
                    {info?.free && (
                      <span className="text-[9px] font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 py-0.5 rounded">
                        {t('keys.free')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-mono ${
                      p.configured ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {p.configured && <Check className="w-3 h-3" />}
                    {p.configured ? t('keys.configured') : t('keys.notSet')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={values[p.id] || ''}
                    onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                    placeholder={p.configured ? t('keys.placeholderSet') : t('keys.placeholder')}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  {info?.url && (
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
                    >
                      {t('keys.getKey')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {message && <p className="text-[11px] text-cyan-300">{message}</p>}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
          >
            {t('common.close')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-md flex items-center gap-1.5"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            {saving ? t('keys.saving') : t('keys.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
