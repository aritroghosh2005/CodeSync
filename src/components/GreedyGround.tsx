import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bot,
  Send,
  Sparkles,
  Compass,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Code2,
  HelpCircle,
  BrainCircuit,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Problem, ChatMessage, GreedyMode, PYPY_TEMPLATE } from '../types.ts';
import { getEloConfig } from '../utils/elo.ts';
import { useHighContrast } from '../context/HighContrastContext.tsx';

interface GreedyGroundProps {
  problem: Problem;
  userHandle: string;
  onClose: () => void;
}

export const GreedyGround: React.FC<GreedyGroundProps> = ({
  problem,
  userHandle,
  onClose,
}) => {
  const { isHighContrast } = useHighContrast();
  const elo = getEloConfig(problem.rating, isHighContrast);
  const [mode, setMode] = useState<GreedyMode>('mentor');
  const [modeSelected, setModeSelected] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const problemUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;

  // Render MathJax formulas ($...$ and $$...$$) whenever messages or loading state changes
  useEffect(() => {
    const renderMath = () => {
      if (typeof window !== 'undefined' && window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        if (messagesContainerRef.current) {
          window.MathJax.typesetPromise([messagesContainerRef.current]).catch((err) => {
            console.debug('MathJax typesetting error or skipped:', err);
          });
        }
      }
    };

    // Staggered triggers to accommodate Markdown DOM rendering and async MathJax script load
    const t1 = setTimeout(renderMath, 40);
    const t2 = setTimeout(renderMath, 200);
    const t3 = setTimeout(renderMath, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [messages, isLoading]);

  // Load existing chat history from backend database
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      try {
        const problemId = `${problem.contestId}_${problem.index}`;
        const res = await fetch(`/api/chat/history/${encodeURIComponent(userHandle)}/${encodeURIComponent(problemId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.chat && data.chat.messages && data.chat.messages.length > 0) {
            setMessages(data.chat.messages);
            if (data.chat.mode) {
              setMode(data.chat.mode as GreedyMode);
              setModeSelected(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [problem, userHandle]);

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectMode = (selectedMode: GreedyMode) => {
    setMode(selectedMode);
    setModeSelected(true);

    if (messages.length === 0) {
      if (selectedMode === 'mentor') {
        sendMessage(
          "Hello Greedy! I have not coded a single line yet and I'm currently stuck. Please provide a hint towards the key algorithm or observation to point me in the right direction without completely giving away the answer.",
          selectedMode
        );
      } else {
        // Examiner mode welcome prompt
        const initialPrompt: ChatMessage = {
          role: 'model',
          content: `### 🛡️ Examiner Mode Activated\n\nWelcome! I am **Greedy**, your Codeforces Examiner for **${problem.name}**.\n\nPlease paste your Python / PyPy \`solution.py\` below. I will rigorously test it across edge cases, asymptotic time limits, and memory constraints to give you a definitive verdict (**Accepted**, **Wrong Answer**, **TLE**, or **Runtime Error**).\n\nYou can also click **"Insert PyPy Template"** below to structure your code using CodeSync's standard fast I/O setup!`,
        };
        setMessages([initialPrompt]);
      }
    }
  };

  const sendMessage = async (textToSend?: string, currentMode?: GreedyMode) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const activeMode = currentMode || mode;
    const newMsg: ChatMessage = { role: 'user', content: text };
    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: userHandle,
          problem: {
            contestId: problem.contestId,
            index: problem.index,
            name: problem.name,
            rating: problem.rating,
            tags: problem.tags,
            url: problemUrl,
          },
          mode: activeMode,
          message: text,
          history: messages,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to get response from Greedy`);
      }

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
      } else {
        throw new Error(data.error || 'No reply generated');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: `⚠️ **Greedy encountered an issue:** ${
            err.message || 'Failed to connect to AI service.'
          }\n\nPlease verify your network or try again in a moment.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(PYPY_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInsertTemplateIntoInput = () => {
    setInputMessage(PYPY_TEMPLATE);
    inputRef.current?.focus();
  };

  const handleResetChat = async () => {
    setIsConfirmingReset(false);
    const problemId = `${problem.contestId}_${problem.index}`;
    try {
      await fetch('/api/chat/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: userHandle, problemId }),
      });
      setMessages([]);
      setModeSelected(false);
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  return (
    <div
      id="greedy-ground-window"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 text-zinc-100 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Top Header / Bar */}
      <header
        id="greedy-ground-header"
        className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-6 py-3 shrink-0 shadow-lg"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-900/30">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base tracking-wide text-zinc-100">
                  Greedy’s Ground
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-700/50">
                  <Sparkles className="w-2.5 h-2.5" /> Gemini 3.1 Pro
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                AI Competitive Programming Mentor & Codeforces Examiner
              </p>
            </div>
          </div>

          <div className="hidden md:block h-6 w-px bg-zinc-800" />

          {/* Problem Details */}
          <div className="hidden md:flex items-center gap-2.5 min-w-0">
            <div
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${elo.badgeBg}`}
            >
              {problem.rating || 'Unrated'}
            </div>
            <a
              href={problemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-zinc-200 hover:text-white hover:underline flex items-center gap-1 truncate max-w-xs"
              title="Open problem in new tab"
            >
              <span>
                {problem.contestId}
                {problem.index}. {problem.name}
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {modeSelected && (
            <>
              <span
                id="badge-mathjax-active"
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700/50 text-[11px] font-mono text-zinc-300 shadow-xs"
                title="MathJax TeX Formula Rendering is Active ($...$ and $$...$$)"
              >
                <span className="text-emerald-400 font-serif italic font-bold">∑</span>
                <span>MathJax</span>
              </span>

              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  id="btn-switch-mentor"
                  onClick={() => setMode('mentor')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    mode === 'mentor'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>Mentor</span>
                </button>
                <button
                  id="btn-switch-examiner"
                  onClick={() => setMode('examiner')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    mode === 'examiner'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Examiner</span>
                </button>
              </div>
            </>
          )}

          {isConfirmingReset ? (
            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-800 rounded-lg px-2.5 py-1 text-xs animate-in fade-in">
              <span className="text-rose-200">Reset?</span>
              <button
                id="btn-confirm-reset-chat"
                onClick={handleResetChat}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer text-xs"
              >
                Yes
              </button>
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="btn-reset-chat"
              onClick={() => setIsConfirmingReset(true)}
              title="Reset Chat Session"
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-close-greedy-ground"
            onClick={onClose}
            title="Exit Greedy’s Ground"
            className="p-2 text-zinc-400 hover:text-white hover:bg-rose-900/40 hover:border-rose-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Problem Mini-Banner for Mobile */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className={`font-mono font-bold px-1.5 py-0.5 rounded border ${elo.badgeBg}`}>
            {problem.rating || 'Unrated'}
          </span>
          <span className="truncate font-medium">{problem.name}</span>
        </div>
        <a
          href={problemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline shrink-0 ml-2"
        >
          View on CF
        </a>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl w-full mx-auto p-4 sm:p-6">
        {!modeSelected ? (
          /* Mode Selector Modal / Screen */
          <div
            id="mode-selector-prompt"
            className="flex-1 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
          >
            <div className="max-w-xl w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 shadow-inner">
                <BrainCircuit className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                  Welcome to Greedy’s Ground
                </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  Working on{' '}
                  <strong className="text-zinc-200">
                    {problem.contestId}
                    {problem.index} - {problem.name}
                  </strong>{' '}
                  (rated <span className="font-mono text-emerald-400">{problem.rating}</span>).
                  Select your objective to begin:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {/* Mentor Mode Option */}
                <button
                  id="btn-select-mentor-mode"
                  onClick={() => handleSelectMode('mentor')}
                  className="group relative p-5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-emerald-500/60 hover:bg-emerald-950/10 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm sm:text-base">
                      <Compass className="w-4 h-4" />
                      <span>Mentor Mode</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      Totally stuck or haven&apos;t written code? Greedy gives subtle hints first, then builds the complete algorithm & PyPy solution if you are still stuck.
                    </p>
                  </div>
                  <div className="mt-4 text-[11px] font-mono text-emerald-400/80 group-hover:text-emerald-300 flex items-center gap-1">
                    Deploy Mentor &rarr;
                  </div>
                </button>

                {/* Examiner Mode Option */}
                <button
                  id="btn-select-examiner-mode"
                  onClick={() => handleSelectMode('examiner')}
                  className="group relative p-5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-cyan-500/60 hover:bg-cyan-950/10 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm sm:text-base">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Examiner Mode</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      Written a solution? Paste your code to receive a comprehensive analysis. Flawless code gets an <strong>Accepted</strong> verdict; flaws get counter-testcases and advice.
                    </p>
                  </div>
                  <div className="mt-4 text-[11px] font-mono text-cyan-400/80 group-hover:text-cyan-300 flex items-center gap-1">
                    Deploy Examiner &rarr;
                  </div>
                </button>
              </div>

              {/* Template Helper Note */}
              <div className="pt-2 text-xs text-zinc-500 flex items-center justify-center gap-2">
                <span>Fast PyPy3 template standard is enforced.</span>
                <button
                  onClick={handleCopyTemplate}
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied Template!' : 'Copy PyPy Template'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/50 border border-zinc-800/80 rounded-2xl shadow-xl">
            {/* Messages Scroll Area */}
            <div
              id="greedy-messages-container"
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
            >
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    id={`chat-message-${index}`}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-sm mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-3xl rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-zinc-950/80 text-zinc-200 border border-zinc-800 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      ) : (
                        <div className="markdown-body prose prose-invert max-w-none text-zinc-200 space-y-2 [&_pre]:bg-zinc-900/90 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-xs [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:text-zinc-100 [&_h2]:text-zinc-100 [&_h3]:text-zinc-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_strong]:text-emerald-400">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 justify-start animate-pulse">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Greedy is analyzing with Gemini AI...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="px-4 py-2 border-t border-zinc-800/60 bg-zinc-950/40 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
              <span className="text-zinc-500 shrink-0 flex items-center gap-1 font-mono text-[11px]">
                <HelpCircle className="w-3 h-3" /> Quick Prompts:
              </span>

              {mode === 'mentor' && (
                <>
                  <button
                    id="chip-mentor-hint"
                    onClick={() => sendMessage('Can you give me another hint to guide my intuition?')}
                    className="shrink-0 px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Give me another hint
                  </button>
                  <button
                    id="chip-mentor-teach-all"
                    onClick={() =>
                      sendMessage(
                        "I am still stuck! Please teach me everything: 1. The Key Observation, 2. The Algorithm, and 3. The Solution in Python with complete explanatory comments using the PyPy template."
                      )
                    }
                    className="shrink-0 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                  >
                    I&apos;m still stuck &mdash; teach me everything!
                  </button>
                  <button
                    id="chip-mentor-complexity"
                    onClick={() => sendMessage('What is the optimal time and space complexity required for this problem?')}
                    className="shrink-0 px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Target Time Complexity?
                  </button>
                </>
              )}

              {mode === 'examiner' && (
                <>
                  <button
                    id="chip-examiner-template"
                    onClick={handleInsertTemplateIntoInput}
                    className="shrink-0 px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Code2 className="w-3 h-3" /> Insert PyPy Template
                  </button>
                  <button
                    id="chip-examiner-switch-mentor"
                    onClick={() => {
                      setMode('mentor');
                      sendMessage('I would like to switch to Mentor Mode. Please guide me through hints.');
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Switch to Mentor Mode
                  </button>
                </>
              )}
            </div>

            {/* Input Box */}
            <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/80">
              <div className="relative flex items-end gap-2 bg-zinc-900/90 border border-zinc-700/80 rounded-xl p-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                <textarea
                  id="greedy-chat-input"
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    mode === 'mentor'
                      ? 'Ask Greedy for a hint, question an intuition, or type "I am stuck"...'
                      : 'Paste your solution.py code here for examination...'
                  }
                  rows={mode === 'examiner' && inputMessage.includes('\n') ? 5 : 2}
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none font-mono py-1 px-1.5"
                />

                <div className="flex items-center gap-1.5 shrink-0 pb-1">
                  <button
                    id="btn-copy-pypy-template"
                    type="button"
                    onClick={handleCopyTemplate}
                    title="Copy standard PyPy template"
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Code2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    id="btn-send-greedy-message"
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all duration-150 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 mt-1.5 font-mono">
                <span>Press Enter to send, Shift+Enter for newline</span>
                <span>Powered by Gemini 3.1 Pro &bull; Python 3 / PyPy JIT</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
