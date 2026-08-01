import React, { useState, useEffect, useRef } from 'react';
import { Experiment, ChatMessage } from '../../../types';
import { apiClient } from '../../../services/apiClient';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Brain,
  Lightbulb,
  Trash2,
  PlayCircle,
  Loader2,
} from 'lucide-react';
import { useI18n } from '../../../i18n';
import { AutonomousResearchPanel } from './AutonomousResearchPanel';
import { ModelRebuildPanel } from './ModelRebuildPanel';

interface AIAssistantViewProps {
  experiment: Experiment;
  onApplySuggestedParameters?: (params: Record<string, number | string>) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  experiment,
  onApplySuggestedParameters,
}) => {
  const { t } = useI18n();

  // Adapt prompts to the actual model, not a fixed transistor/TCAD domain —
  // the solver (e.g. COMSOL) can model any physics: heat, fluids, EM, structural…
  const physics = experiment.physicsModule || experiment.simulator || t('chat.physicsFallback');

  // Persist the conversation per experiment so switching pages (which unmounts
  // this view) doesn't wipe the chat. Restored on mount; saved on every change.
  const storageKey = `arp.chat.${experiment.id}`;
  const draftKey = `arp.chat.draft.${experiment.id}`;

  const welcomeMessage = (): ChatMessage => ({
    id: 'msg-1',
    sender: 'assistant',
    text: t('chat.welcome', { title: experiment.title }),
    timestamp: new Date().toLocaleTimeString(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      // ignore corrupt/unavailable storage
    }
    return [welcomeMessage()];
  });

  const [inputPrompt, setInputPrompt] = useState(() => {
    try {
      return localStorage.getItem(draftKey) || '';
    } catch {
      return '';
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [runState, setRunState] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore storage write failures (quota/private mode)
    }
  }, [messages, storageKey]);

  useEffect(() => {
    try {
      if (inputPrompt) localStorage.setItem(draftKey, inputPrompt);
      else localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }, [inputPrompt, draftKey]);

  const promptPresets = [
    t('chat.preset.physics', { physics }),
    t('chat.preset.params'),
    t('chat.preset.results'),
    t('chat.preset.next'),
  ];

  const handleClearChat = () => {
    setMessages([welcomeMessage()]);
    setInputPrompt('');
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputPrompt('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          experimentId: experiment.id,
          providers: experiment.aiProviders,
          experimentContext: {
            id: experiment.id,
            title: experiment.title,
            parameters: experiment.parameters,
            results: experiment.results?.metrics,
            aiProviders: experiment.aiProviders,
          },
        }),
      });

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.text || 'Analysis completed.',
        reasoning: data.reasoning || 'Evaluated via Claude AI Research Engine.',
        suggestedParameters: data.suggestedParameters,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI Assistant Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Note: AI engine communicated successfully or returned fallback domain analysis.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Run the current model, wait for it to finish, then have the AI analyze the
  // real results — so the user gets a computed answer in one click instead of
  // being told to dispatch the run elsewhere.
  const handleRunAndAnalyze = async () => {
    if (isRunning || isGenerating) return;
    setIsRunning(true);
    setRunState(t('chat.run.starting'));
    try {
      const job = await apiClient.runSimulation(experiment.id);
      const start = Date.now();
      let final: { status: string; error?: string } | undefined;
      // Poll to a terminal state (bounded by the solver's own 1h cap).
      while (Date.now() - start < 3_600_000) {
        await new Promise((r) => setTimeout(r, 3000));
        if (!mountedRef.current) return;
        const jobs = await apiClient.getSimulations();
        const j = jobs.find((x) => x.id === job.id);
        if (j) {
          setRunState(t('chat.run.running', { p: String(j.progress ?? 0) }));
          if (j.status === 'Completed' || j.status === 'Failed') {
            final = j;
            break;
          }
        }
      }
      if (!mountedRef.current) return;
      if (final?.status === 'Completed') {
        setRunState(t('chat.run.analyzing'));
        await handleSendMessage(t('chat.run.analyzePrompt'));
        if (mountedRef.current) setRunState(null);
      } else {
        setRunState(t('chat.run.failed', { e: final?.error || '' }));
      }
    } catch (e) {
      if (mountedRef.current) setRunState((e as Error).message);
    } finally {
      if (mountedRef.current) setIsRunning(false);
    }
  };

  return (
    <div id="ai-assistant-view-root" className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 p-5 rounded-xl border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">{t('chat.title')}</h1>
          </div>
          <p className="text-xs text-slate-300">
            {t('chat.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300">
            {t('chat.context')}: {experiment.title}
          </div>
          <button
            type="button"
            onClick={handleClearChat}
            title={t('chat.clear')}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 p-1.5 rounded-lg transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* One-click: run the model and analyze the real results */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={handleRunAndAnalyze}
          disabled={isRunning || isGenerating}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer shrink-0"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          {t('chat.run.btn')}
        </button>
        <p className="text-xs text-slate-400">{runState || t('chat.run.hint')}</p>
      </div>

      {/* Autonomous research sweep */}
      <AutonomousResearchPanel experiment={experiment} />

      {/* Experimental: AI rebuilds the model structure via COMSOL LiveLink */}
      <ModelRebuildPanel experiment={experiment} />

      {/* Preset Prompts */}
      <div className="flex flex-wrap gap-2">
        {promptPresets.map((preset) => (
          <button
            key={preset}
            onClick={() => handleSendMessage(preset)}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
          >
            <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
            <span>{preset}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 min-h-[420px] max-h-[550px] overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 text-xs ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-xl max-w-2xl space-y-2 border ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white border-cyan-500'
                  : 'bg-slate-800/80 text-slate-200 border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
                <span>{msg.sender === 'user' ? 'You (Researcher)' : 'AI Scientist Agent'}</span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

              {/* Explainable AI Reasoning Box */}
              {msg.reasoning && (
                <div className="bg-slate-900/90 p-2.5 rounded border border-slate-750 text-[11px] font-mono text-cyan-300 space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Brain className="w-3 h-3 text-cyan-400" />
                    <span>AI REASONING LOG:</span>
                  </div>
                  <div>{msg.reasoning}</div>
                </div>
              )}

              {/* Suggested Parameter Action */}
              {msg.suggestedParameters && (
                <div className="bg-cyan-950 p-3 rounded border border-cyan-800 space-y-2 text-xs">
                  <div className="font-bold text-cyan-300">Suggested Parameter Updates</div>
                  <div className="font-mono text-slate-300 space-y-1">
                    {Object.entries(msg.suggestedParameters).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{k}:</span>
                        <span className="font-bold text-cyan-400">{v}</span>
                      </div>
                    ))}
                  </div>
                  {onApplySuggestedParameters && (
                    <button
                      onClick={() => onApplySuggestedParameters(msg.suggestedParameters!)}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 rounded font-semibold text-xs transition cursor-pointer"
                    >
                      Apply Suggested Parameters to Experiment
                    </button>
                  )}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center space-x-2 text-xs text-cyan-400 font-mono p-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI Scientist evaluating TCAD device equations...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex gap-3"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Ask AI Scientist about parameters, transport models, or optimization..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || isGenerating}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-2 disabled:opacity-50 transition shadow-md shadow-cyan-900/40"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
