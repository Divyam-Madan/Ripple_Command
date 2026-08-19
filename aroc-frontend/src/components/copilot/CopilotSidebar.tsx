import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCopilotStore } from '@/stores/copilotStore';
import { useAuthStore } from '@/stores/authStore';

const PROMPT_SUGGESTIONS = [
  { label: '⚡ S03 Delay Impact (12h)', query: 'What happens if Motherson Sumi (S03) is delayed 12 hours?' },
  { label: '📦 Delayed Shipments', query: 'Show me all delayed shipments and their root causes' },
  { label: '💰 ₹57L Recovery Plan', query: 'What is the optimal CP-SAT recovery plan for the ₹57,00,000 exposure?' },
  { label: '🧠 Explain CP-SAT & Twin', query: 'Explain how CP-SAT optimization and the Digital Twin work in AROC' },
  { label: '📊 Network Health Breakdown', query: 'Break down the current supply chain health score and key risk factors' },
];

export default function CopilotSidebar() {
  const navigate = useNavigate();
  const { isOpen, toggleOpen, setOpen, messages, isTyping, sendMessage, clearMessages } = useCopilotStore();
  const { user } = useAuthStore();

  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || isTyping) return;
    sendMessage(inputQuery, user?.role);
    setInputQuery('');
  };

  const handleSuggestionClick = (query: string) => {
    sendMessage(query, user?.role);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-stone-900 text-white shadow-2xl hover:bg-black hover:scale-105 transition-all duration-300 border border-white/30 backdrop-blur-md group"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping absolute" />
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 relative z-10" />
        </div>
        <span className="font-black text-xs tracking-wider uppercase">AI Copilot</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600/40 text-blue-200 font-mono">
          OPEN
        </span>
      </button>
    );
  }

  return (
    <aside className="w-[360px] xl:w-[400px] shrink-0 h-full glass-panel border-l border-white/40 flex flex-col shadow-2xl relative z-30 transition-all duration-300 animate-slide-up overflow-hidden rounded-2xl">
      {/* Top Header */}
      <div className="p-4 border-b border-white/30 bg-white/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black text-stone-900 leading-none">AROC Copilot</h3>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-500/20 text-blue-800 border border-blue-500/30">
                AI Neural
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>OpenRouter Live Engine</span>
              <span>&bull;</span>
              <span className="truncate max-w-[120px]">{user?.roleTitle?.split(' ')[0] || 'SCM'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            title="Clear conversation"
            className="p-1.5 rounded-lg hover:bg-black/5 text-stone-600 hover:text-stone-900 transition-colors text-xs font-bold"
          >
            Clear
          </button>
          <button
            onClick={toggleOpen}
            title="Minimize Copilot"
            className="p-1.5 rounded-lg hover:bg-black/5 text-stone-600 hover:text-stone-900 transition-colors text-base font-black leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Suggestion Chips Banner */}
      <div className="px-3 py-2 border-b border-white/20 bg-white/20 flex gap-1.5 overflow-x-auto custom-scrollbar">
        {PROMPT_SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(s.query)}
            disabled={isTyping}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/60 hover:bg-white text-stone-800 hover:text-blue-700 border border-white/50 transition-all shadow-sm flex-shrink-0"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m) => {
          const isUser = m.role === 'user';

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-stone-500 px-1">
                <span>{isUser ? (user?.name || 'You') : 'AROC Copilot'}</span>
                <span>&bull;</span>
                <span>{m.timestamp}</span>
                {m.fallback_mode && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-800 border border-amber-500/30">
                    Rule Engine
                  </span>
                )}
              </div>

              {/* Tool Calls Pill Indicators */}
              {m.tool_calls_made && m.tool_calls_made.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {m.tool_calls_made.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-800 border border-purple-500/30"
                    >
                      <span>⚡ Tool:</span>
                      <span>{t}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[95%] shadow-sm ${
                  isUser
                    ? 'bg-blue-600 text-white font-semibold rounded-tr-sm'
                    : 'bg-white/85 text-stone-900 border border-white/70 font-medium rounded-tl-sm backdrop-blur-md'
                }`}
              >
                <div className="prose prose-stone prose-xs max-w-none space-y-2 whitespace-pre-line break-words text-stone-900">
                  {formatMarkdownContent(m.content, isUser, navigate)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Bubble */}
        {isTyping && (
          <div className="flex flex-col items-start animate-fade-in">
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-stone-500 px-1">
              <span>AROC Copilot is reasoning with OpenRouter...</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 border border-white/60 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-100" />
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-200" />
              <span className="text-[11px] font-bold text-stone-600 ml-1">Executing DB queries & simulation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-white/30 bg-white/50 backdrop-blur-md">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask any supply chain doubt or simulation..."
            disabled={isTyping}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/90 border border-stone-300 text-xs font-semibold text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="p-2.5 rounded-xl bg-stone-900 text-white hover:bg-black disabled:opacity-40 transition-all shadow-md flex items-center justify-center"
          >
            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[9px] font-bold text-stone-500 px-1">
          <span>Connected: OpenRouter AI</span>
          <span>Role: {user?.roleTitle || 'Supply Chain'}</span>
        </div>
      </div>
    </aside>
  );
}

/**
 * Basic markdown styling helper to turn markdown headers/bold/tables into crisp React elements
 */
function formatMarkdownContent(raw: string, isUser: boolean, navigate: any) {
  if (isUser) return raw;

  // Render text with bolding and section styling
  const lines = raw.split('\n');
  return lines.map((line, i) => {
    // Header
    if (line.startsWith('### ')) {
      return (
        <div key={i} className="text-xs font-black text-stone-900 mt-2 mb-1 border-b border-stone-200 pb-0.5">
          {line.replace('### ', '')}
        </div>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <div key={i} className="text-sm font-black text-stone-900 mt-2 mb-1">
          {line.replace('## ', '')}
        </div>
      );
    }
    // Bullet point
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.substring(2);
      return (
        <div key={i} className="flex items-start gap-1.5 pl-1 my-0.5">
          <span className="text-blue-600 font-black">&bull;</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
        </div>
      );
    }
    // Quick action trigger shortcuts
    if (line.includes('Simulation') && line.includes('page')) {
      return (
        <div key={i} className="my-1.5">
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
          <button
            onClick={() => navigate('/simulation')}
            className="ml-2 px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700"
          >
            Open Simulator &rarr;
          </button>
        </div>
      );
    }

    return (
      <div key={i} className="my-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
    );
  });
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-stone-950 font-black">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/5 font-mono px-1 py-0.2 rounded text-[11px] font-bold text-blue-800">$1</code>');
}
