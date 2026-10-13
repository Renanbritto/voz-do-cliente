"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  X,
  User,
  Trash2,
  MessageSquare,
  Sparkles,
  Database,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  ChatMessage,
  ChatHistoryItem,
  ProjectMetadata,
  fetchProjectMetadata,
  streamChatMessage,
  FALLBACK_VOC_METADATA,
} from "@/lib/rn-intelligence";
import { cn } from "@/lib/utils";

interface CopilotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export function CopilotSidebar({ isOpen, onClose, initialPrompt }: CopilotSidebarProps) {
  const [projectMeta, setProjectMeta] = useState<ProjectMetadata>(FALLBACK_VOC_METADATA);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Carrega metadados do projeto
  useEffect(() => {
    let mounted = true;
    fetchProjectMetadata().then((meta) => {
      if (mounted) {
        setProjectMeta(meta);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Atalho Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Rolagem suave
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Trigger inicial caso enviado externamente
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, isOpen]);

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setHasStarted(false);
    setIsLoading(false);
  };

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || input).trim();
      if (!query || isLoading) return;

      const userMsgId = Date.now().toString();
      const assistantMsgId = (Date.now() + 1).toString();

      const nowTimestamp = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: query,
        timestamp: nowTimestamp,
      };

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: nowTimestamp,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setHasStarted(true);
      if (!textToSend) setInput("");
      setIsLoading(true);

      const historyPayload: ChatHistoryItem[] = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      abortControllerRef.current = new AbortController();

      try {
        await streamChatMessage({
          projectId: projectMeta.project_id,
          message: query,
          history: historyPayload,
          signal: abortControllerRef.current.signal,
          onMetadata: (meta) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      sql: meta.sql_query,
                      data: meta.query_results,
                      mode: meta.mode,
                    }
                  : msg
              )
            );
          },
          onChunk: (delta) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: msg.content + delta,
                    }
                  : msg
              )
            );
          },
          onDone: (telemetry) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      executionTime: telemetry.execution_time_ms,
                      mode: telemetry.mode || msg.mode,
                    }
                  : msg
              )
            );
            setIsLoading(false);
          },
          onError: () => {
            setIsLoading(false);
          },
        });
      } catch {
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, projectMeta.project_id]
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-end transition-all duration-300 ease-out",
        isOpen
          ? "pointer-events-auto bg-black/60 backdrop-blur-sm opacity-100"
          : "pointer-events-none bg-black/0 backdrop-blur-none opacity-0"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg md:max-w-xl h-full bg-[#0b0f1a]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl transition-all duration-300 ease-out relative overflow-hidden",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de ambientação no topo */}
        <div className="pointer-events-none absolute top-0 right-0 w-80 h-40 bg-gradient-to-b from-rose-500/15 via-cyan-500/10 to-transparent blur-3xl" />

        {/* HEADER DO DRAWER */}
        <div className="p-4 px-5 border-b border-white/10 flex items-center justify-between bg-[#0b0f1a]/95 backdrop-blur-2xl relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-[#090d16] border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-500/10 overflow-hidden shrink-0">
                <img
                  src="/rn_logo_emblem.jpg"
                  alt="RN Intelligence Emblema"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">RN Intelligence</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  VoC AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[240px] sm:max-w-[300px]">
                {projectMeta.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearChat}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-white/5"
              title="Limpar Conversa"
              aria-label="Limpar Conversa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-white/5"
              title="Fechar Painel (Esc)"
              aria-label="Fechar Painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DAS MENSAGENS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#090d16]/70 relative">
          {!hasStarted && messages.length === 0 && (
            <div className="my-auto py-6 flex flex-col items-center text-center space-y-5 animate-in fade-in duration-300">
              <div className="h-16 w-16 rounded-3xl bg-[#090d16] border border-rose-500/40 flex items-center justify-center shadow-xl shadow-rose-500/15 overflow-hidden shrink-0">
                <img
                  src="/rn_logo_emblem.jpg"
                  alt="RN Intelligence"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-bold text-white">
                  Copilot de Voz do Cliente (VoC)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Assistente analítico conectado ao pipeline do Gemini 1.5 Flash. Pergunte sobre o diagrama de Pareto 80/20, causas-raiz de devoluções, métricas de FinOps e risco de churn de clientes.
                </p>
              </div>

              {/* Tags do projeto */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
                {projectMeta.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-white/[0.04] text-slate-300 border border-white/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Perguntas Sugeridas */}
              <div className="w-full text-left space-y-2 pt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1">
                  Perguntas Sugeridas:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {projectMeta.suggested_questions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="text-left p-3 rounded-2xl bg-[#0b0f1a]/90 hover:bg-white/[0.06] border border-white/10 hover:border-rose-500/30 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors ml-2 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lista de Mensagens */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1.5 max-w-[88%]",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1">
                {msg.role === "user" ? (
                  <>
                    <span>Você</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    <User className="w-3 h-3 text-slate-400 ml-0.5" />
                  </>
                ) : (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 border border-rose-500/40">
                      <img src="/rn_logo_emblem.jpg" alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-rose-300 font-semibold">VoC Copilot</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={cn(
                  "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words border",
                  msg.role === "user"
                    ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white border-rose-500/30 shadow-lg shadow-rose-900/20 rounded-tr-sm"
                    : "bg-[#0b0f1a]/95 text-slate-200 border-white/10 shadow-xl rounded-tl-sm backdrop-blur-xl"
                )}
              >
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-slate-400 italic">
                    <span className="animate-pulse">Consultando pipeline de VoC...</span>
                  </span>
                )}

                {/* Exibição opcional de SQL analítico */}
                {msg.sql && (
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-semibold mb-1">
                      <Database className="w-3 h-3" />
                      <span>SQL Analítico Executado:</span>
                    </div>
                    <pre className="p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-cyan-200/90 overflow-x-auto whitespace-pre">
                      {msg.sql}
                    </pre>
                  </div>
                )}

                {/* Telemetria do assistente */}
                {msg.role === "assistant" && msg.executionTime && (
                  <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {msg.executionTime}ms
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                      {msg.mode || "voc_agent"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0b0f1a]/95 backdrop-blur-2xl relative z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre Pareto, perdas financeiras, causas-raiz..."
              disabled={isLoading}
              className="flex-1 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/10 focus:border-rose-500/50 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
              aria-label="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
            RN Intelligence • Gemini 1.5 Flash • Structured Outputs
          </p>
        </div>
      </div>
    </div>
  );
}
