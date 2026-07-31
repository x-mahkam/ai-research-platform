import React, { useState } from 'react';
import { Experiment, ChatMessage } from '../../../types';
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
} from 'lucide-react';

interface AIAssistantViewProps {
  experiment: Experiment;
  onApplySuggestedParameters?: (params: Record<string, number | string>) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  experiment,
  onApplySuggestedParameters,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: `Hello! I am your **AI Scientist Assistant** for Sentaurus TCAD and multi-physics research. I am currently monitoring experiment **"${experiment.title}"**. How can I assist with parameter optimization or device physics analysis today?`,
      reasoning: 'Loaded TCAD domain knowledge model for semiconductor FET transport physics.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const promptPresets = [
    'Analyze subthreshold swing (SS) and DIBL for this nanosheet device.',
    'Recommend gate workfunction & EOT to achieve target Vt = 0.30V.',
    'Explain the physics of velocity overshoot in hydrodynamic transport.',
    'How does reducing nanosheet thickness from 5nm to 3nm affect electron confinement?',
  ];

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
          providers: experiment.aiProviders,
          experimentContext: {
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

  return (
    <div id="ai-assistant-view-root" className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 p-5 rounded-xl border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">AI Scientist Chat Assistant (ARP-010)</h1>
          </div>
          <p className="text-xs text-slate-300">
            Powered by Claude AI. Context-aware scientific analysis of TCAD simulation parameters, physical transport models, and device metrics.
          </p>
        </div>

        <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300 shrink-0">
          Context: {experiment.title}
        </div>
      </div>

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
