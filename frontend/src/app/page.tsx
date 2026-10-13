"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  Sparkles,
  Layers,
  Zap,
  TrendingDown,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  ChevronRight,
  Download,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Send,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Info,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INITIAL_REVIEWS, calculatePareto, ParetoRow } from "@/data/mock-data";
import { EnrichedReview } from "@/lib/types";
import { CopilotSidebar } from "@/components/chat/copilot-sidebar";

type ActiveTab = "overview" | "playground" | "table" | "finops";

export default function VoCDashboardPage() {
  // Estado da Sidebar retrátil: INICIA FECHADA/RECOLHIDA por padrão (w-20)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);

  // Módulo ativo
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Estado do Drawer do Copilot (FAB)
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Reviews do dataset
  const [reviews, setReviews] = useState<EnrichedReview[]>(INITIAL_REVIEWS);

  // Filtros da tabela
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("TODOS");
  const [selectedAspect, setSelectedAspect] = useState<string>("TODOS");

  // Estado do Playground de Análise IA
  const [playgroundText, setPlaygroundText] = useState(
    "A bateria não dura 2 horas com o cancelamento de ruído ligado, bem longe das 30 horas da caixa. Pedi a devolução imediata."
  );
  const [playgroundProduct, setPlaygroundProduct] = useState(
    "Fone de Ouvido Noise Cancelling Pro"
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    result: {
      sentiment: string;
      sentiment_score: number;
      aspect: string;
      primary_problem_tag: string;
      secondary_tag: string;
      churn_risk: string;
      suggested_action: string;
      summary_pt: string;
    };
    metrics: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
      cost_usd: number;
      cost_brl: number;
      is_live: boolean;
    };
  } | null>(null);

  // Cálculos do Pareto 80/20
  const paretoData = useMemo(() => calculatePareto(reviews), [reviews]);

  // Cálculos dos 4 KPIs de Alto Impacto
  const totalReviews = reviews.length;
  const totalLoss = useMemo(
    () => reviews.reduce((acc, r) => acc + (r.estimated_financial_loss || 0), 0),
    [reviews]
  );
  const detractorsCount = useMemo(
    () => reviews.filter((r) => r.ai_sentiment === "Negativo").length,
    [reviews]
  );
  const detractorsPct = totalReviews > 0 ? (detractorsCount / totalReviews) * 100 : 0;
  const highRiskCount = useMemo(
    () => reviews.filter((r) => r.churn_risk === "Alto").length,
    [reviews]
  );
  const totalCostBrl = useMemo(
    () => reviews.reduce((acc, r) => acc + (r.token_cost_brl || 0), 0),
    [reviews]
  );
  const totalCostUsd = useMemo(
    () => reviews.reduce((acc, r) => acc + (r.token_cost_usd || 0), 0),
    [reviews]
  );

  // Distribuição por Aspecto
  const aspectDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach((r) => {
      const asp = r.aspect || "Geral";
      counts[asp] = (counts[asp] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reviews]);

  // Distribuição por Sentimento
  const sentimentDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach((r) => {
      const sent = r.ai_sentiment || "Neutro";
      counts[sent] = (counts[sent] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reviews]);

  // Reviews filtrados para a tabela
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        r.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.original_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.primary_problem_tag.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSentiment =
        selectedSentiment === "TODOS" || r.ai_sentiment === selectedSentiment;

      const matchesAspect =
        selectedAspect === "TODOS" || r.aspect === selectedAspect;

      return matchesSearch && matchesSentiment && matchesAspect;
    });
  }, [reviews, searchQuery, selectedSentiment, selectedAspect]);

  // Função para executar análise no Playground
  const handleRunAnalysis = async () => {
    if (!playgroundText.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: playgroundText,
          productName: playgroundProduct,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
      }
    } catch (err) {
      console.error("Falha ao analisar review:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Exportar dados em CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Autor",
      "Produto",
      "SKU",
      "Rating",
      "Preço",
      "Sentimento IA",
      "Score Sentimento",
      "Causa-Raiz",
      "Dimensão",
      "Risco Churn",
      "Prejuízo Estimado (R$)",
      "Ação Recomendada",
      "Texto Original",
    ];

    const rows = filteredReviews.map((r) => [
      r.id,
      `"${r.author}"`,
      `"${r.product}"`,
      r.sku,
      r.rating,
      r.price,
      r.ai_sentiment,
      r.ai_sentiment_score,
      `"${r.primary_problem_tag}"`,
      `"${r.aspect}"`,
      r.churn_risk,
      r.estimated_financial_loss,
      `"${r.suggested_action}"`,
      `"${r.original_text.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reviews_enriquecidas_gemini.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navItems = [
    {
      id: "overview" as ActiveTab,
      label: "Visão Geral & Pareto",
      icon: BarChart3,
      badge: "80/20",
    },
    {
      id: "playground" as ActiveTab,
      label: "Análise IA em Tempo Real",
      icon: Sparkles,
      badge: "Live",
    },
    {
      id: "table" as ActiveTab,
      label: "Reviews Enriquecidas",
      icon: Layers,
      badge: `${reviews.length}`,
    },
    {
      id: "finops" as ActiveTab,
      label: "FinOps & Telemetria",
      icon: Zap,
      badge: "Tokens",
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col md:flex-row relative">
      {/* =========================================================================
          CABEÇALHO MOBILE (ULTRA-LIMPO: Apenas logo e seletor de módulos)
          ========================================================================= */}
      <header className="md:hidden sticky top-0 z-30 bg-[#0b0f1a]/95 backdrop-blur-2xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#090d16] border border-rose-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-md shadow-rose-500/10">
            <img
              src="/rn_logo_emblem.jpg"
              alt="RN Intelligence"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide">VoC Analytics</h1>
            <p className="text-[10px] text-slate-400 font-mono">RN Intelligence</p>
          </div>
        </div>

        {/* Seletor de Módulos Mobile */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  isActive
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </header>

      {/* =========================================================================
          SIDEBAR DESKTOP (RETRÁTIL: INICIA RECOLHIDA w-20 POR PADRÃO, EXPANSÍVEL w-72)
          ========================================================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 bg-[#0b0f1a]/95 backdrop-blur-2xl border-r border-white/10 sticky top-0 h-screen transition-all duration-300 z-30",
          isSidebarExpanded ? "w-72" : "w-20"
        )}
      >
        {/* Topo da Sidebar com Logo oficial RN Intelligence */}
        <div
          className={cn(
            "p-3.5 border-b border-white/10 flex transition-all",
            isSidebarExpanded
              ? "flex-row items-center justify-between"
              : "flex-col items-center justify-center gap-2.5"
          )}
        >
          <div
            className={cn(
              "flex items-center min-w-0",
              isSidebarExpanded ? "gap-3" : "justify-center"
            )}
          >
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="h-11 w-11 rounded-2xl bg-[#090d16] border border-rose-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-rose-500/10 hover:border-rose-500/60 transition-all cursor-pointer group/logo"
              title={isSidebarExpanded ? "RN Intelligence" : "Expandir menu lateral"}
              aria-label="RN Intelligence"
            >
              <img
                src="/rn_logo_emblem.jpg"
                alt="RN Intelligence Emblema"
                className="w-full h-full object-cover group-hover/logo:scale-105 transition-transform"
              />
            </button>

            {isSidebarExpanded && (
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-white tracking-wider block truncate">
                  RN INTELLIGENCE
                </span>
                <span className="text-[11px] text-slate-400 block truncate font-mono">
                  Voz do Cliente (VoC)
                </span>
              </div>
            )}
          </div>

          {/* Botão de Toggle da Sidebar */}
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className={cn(
              "rounded-xl text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all cursor-pointer shrink-0 flex items-center justify-center",
              isSidebarExpanded ? "p-1.5" : "w-8 h-8 text-rose-400"
            )}
            title={isSidebarExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
            aria-label="Alternar menu lateral"
          >
            {isSidebarExpanded ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-rose-400" />
            )}
          </button>
        </div>

        {/* Itens de Navegação com Tooltips */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center rounded-2xl transition-all cursor-pointer",
                    isSidebarExpanded
                      ? "px-3.5 py-3 gap-3 justify-between"
                      : "p-3 justify-center",
                    isActive
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-950/20"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0 transition-colors",
                        isActive ? "text-rose-400" : "text-slate-400 group-hover:text-white"
                      )}
                    />
                    {isSidebarExpanded && (
                      <span className="text-xs font-medium tracking-wide truncate">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {isSidebarExpanded && (
                    <span
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-md",
                        isActive
                          ? "bg-rose-500/30 text-rose-200"
                          : "bg-white/[0.04] text-slate-400"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Tooltip quando recolhido (w-20) */}
                {!isSidebarExpanded && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#0b0f1a] text-slate-100 text-xs rounded-xl border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50">
                    <div className="font-semibold text-white">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.badge}</div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-white/10 bg-[#090d16]/50">
          <div
            className={cn(
              "rounded-2xl p-2.5 bg-white/[0.02] border border-white/5 flex items-center",
              isSidebarExpanded ? "gap-3" : "justify-center"
            )}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            {isSidebarExpanded && (
              <div className="overflow-hidden">
                <span className="text-[11px] font-medium text-slate-300 block truncate">
                  Gemini 1.5 Flash
                </span>
                <span className="text-[10px] text-slate-500 block truncate font-mono">
                  Structured Outputs
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          ÁREA PRINCIPAL DE CONTEÚDO
          ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* =======================================================================
            MÓDULO 1: VISÃO GERAL & DIAGRAMA DE PARETO 80/20
            ======================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Grid de 4 KPIs de Alto Impacto da Visão Geral */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Total de Reviews (Cyan #06b6d4) */}
              <div className="p-5 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-xl hover:border-cyan-500/30 transition-all group">
                <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-[#06b6d4]/10 rounded-full blur-2xl group-hover:bg-[#06b6d4]/20 transition-all" />
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Total de Reviews
                  </span>
                  <div className="p-2 rounded-2xl bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold font-mono text-[#06b6d4] tracking-tight">
                    {totalReviews}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                    100% com Structured Outputs
                  </p>
                </div>
              </div>

              {/* KPI 2: Taxa de Detratores (Rose #f43f5e) */}
              <div className="p-5 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-xl hover:border-rose-500/30 transition-all group">
                <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-[#f43f5e]/10 rounded-full blur-2xl group-hover:bg-[#f43f5e]/20 transition-all" />
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Taxa de Detratores
                  </span>
                  <div className="p-2 rounded-2xl bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold font-mono text-[#f43f5e] tracking-tight">
                    {detractorsPct.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span className="font-mono text-rose-400 font-semibold">{highRiskCount}</span> clientes em alto risco de churn
                  </p>
                </div>
              </div>

              {/* KPI 3: Prejuízo Mapeado em Devoluções (Amber #f59e0b) */}
              <div className="p-5 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-xl hover:border-amber-500/30 transition-all group">
                <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-[#f59e0b]/10 rounded-full blur-2xl group-hover:bg-[#f59e0b]/20 transition-all" />
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Prejuízo Devoluções
                  </span>
                  <div className="p-2 rounded-2xl bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold font-mono text-[#f59e0b] tracking-tight">
                    R$ {totalLoss.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-amber-400 inline" />
                    Concentrado em 2 causas no Pareto
                  </p>
                </div>
              </div>

              {/* KPI 4: Custo Total de IA / FinOps (Emerald #10b981) */}
              <div className="p-5 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-xl hover:border-emerald-500/30 transition-all group">
                <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-[#10b981]/10 rounded-full blur-2xl group-hover:bg-[#10b981]/20 transition-all" />
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Custo de IA (FinOps)
                  </span>
                  <div className="p-2 rounded-2xl bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold font-mono text-[#10b981] tracking-tight">
                    R$ {totalCostBrl.toFixed(4)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span className="font-mono text-emerald-400">R$ 0,00018</span> por review analisada
                  </p>
                </div>
              </div>
            </section>
            {/* Gráfico de Pareto 80/20 Principal */}
            <div className="p-6 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      Diagrama de Pareto 80/20: Causas-Raiz vs Prejuízo Financeiro
                    </h2>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Regra 80/20
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Identificação exata dos 20% de defeitos e problemas operacionais que concentram 80% do valor de devoluções.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-[#06b6d4]" />
                    <span className="text-slate-300">Prejuízo (R$)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                    <span className="text-slate-300">% Acumulada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-[#f43f5e]" />
                    <span className="text-rose-400">Limiar 80%</span>
                  </div>
                </div>
              </div>

              {/* Gráfico Composto Recharts */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={paretoData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="primary_problem_tag"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#06b6d4"
                      tick={{ fill: "#06b6d4", fontSize: 11 }}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      stroke="#f59e0b"
                      tick={{ fill: "#f59e0b", fontSize: 11 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as ParetoRow;
                          return (
                            <div className="p-3.5 rounded-2xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl text-xs space-y-1.5 font-sans">
                              <p className="font-bold text-white text-sm">
                                #{data.rank} {data.primary_problem_tag}
                              </p>
                              <p className="text-slate-400">
                                Dimensão: <span className="text-slate-200 font-semibold">{data.aspect}</span>
                              </p>
                              <p className="text-cyan-400 font-mono">
                                Prejuízo Total: <span className="font-bold">R$ {data.total_loss_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              </p>
                              <p className="text-amber-400 font-mono">
                                Impacto Acumulado: <span className="font-bold">{data.cumulative_pct}%</span> ({data.share_pct}% individual)
                              </p>
                              <p className="text-slate-300 font-mono text-[10px] pt-1 border-t border-white/10">
                                Classificação: <span className="text-rose-400 font-bold">{data.pareto_class}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      yAxisId="right"
                      y={80}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: "Corte 80% Pareto",
                        fill: "#f43f5e",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="total_loss_brl"
                      radius={[8, 8, 0, 0]}
                    >
                      {paretoData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.cumulative_pct <= 80 ? "#06b6d4" : "#3b82f6"}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulative_pct"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#f59e0b", stroke: "#0b0f1a", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#f43f5e" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela de Matriz Pareto */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Causa-Raiz Detectada</th>
                      <th className="py-2.5 px-3">Dimensão</th>
                      <th className="py-2.5 px-3 text-center">Queixas</th>
                      <th className="py-2.5 px-3 text-right">Prejuízo (R$)</th>
                      <th className="py-2.5 px-3 text-right">% Acumulada</th>
                      <th className="py-2.5 px-3 text-right">Severidade ABC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {paretoData.map((row) => (
                      <tr
                        key={row.rank}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-300">
                          #{row.rank}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {row.primary_problem_tag}
                        </td>
                        <td className="py-3 px-3 text-slate-400">{row.aspect}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300">
                          {row.complaints_count}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                          R$ {row.total_loss_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-200">
                          {row.cumulative_pct}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-lg text-[10px] font-semibold border",
                              row.cumulative_pct <= 80 || row.rank === 1
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                            )}
                          >
                            {row.pareto_class}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráficos Complementares de Apoio */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição por Dimensão */}
              <div className="p-6 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Distribuição por Dimensão Técnica
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ocorrências categorizadas por aspecto do produto
                    </p>
                  </div>
                  <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Activity className="w-4 h-4" />
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {aspectDistribution.map((asp, idx) => {
                    const pct = Math.round((asp.value / totalReviews) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">{asp.name}</span>
                          <span className="text-slate-400 font-mono">
                            {asp.value} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-rose-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Matriz de Churn Risk */}
              <div className="p-6 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Matriz de Risco de Churn dos Clientes
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Probabilidade de perda de cliente e cancelamento
                    </p>
                  </div>
                  <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">
                      Alto Risco
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-rose-400 mt-1 block">
                      {highRiskCount}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Devolução iminente
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                      Médio Risco
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-amber-400 mt-1 block">
                      {reviews.filter((r) => r.churn_risk === "Médio").length}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Atrito moderado
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                      Baixo Risco
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 block">
                      {reviews.filter((r) => r.churn_risk === "Baixo").length}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Promotores
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 leading-relaxed">
                  💡 <span className="text-slate-200 font-semibold">Insight Prescritivo:</span> 100% dos clientes em "Alto Risco" tiveram reviews com falha de produto associada a resposta demorada do SAC. Atendimento em menos de 2h reverte 65% das perdas.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================================
            MÓDULO 2: PLAYGROUND & ANÁLISE EM TEMPO REAL COM IA (STRUCTURED OUTPUTS)
            ======================================================================= */}
        {activeTab === "playground" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      Análise de Avaliação em Tempo Real
                    </h2>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Gemini 1.5 Flash
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Digite ou selecione uma avaliação de e-commerce para inspecionar a extração de causa-raiz, score de sentimento e custo FinOps por token.
                  </p>
                </div>
              </div>

              {/* Exemplos Rápidos */}
              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2 font-mono">
                  ⚡ Exemplos Rápidos para Testar:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setPlaygroundText(
                        "A bateria não dura 2 horas com o cancelamento de ruído ligado, bem longe das 30 horas da caixa. Pedi a devolução imediata."
                      );
                      setPlaygroundProduct("Fone de Ouvido Noise Cancelling Pro");
                    }}
                    className="text-left p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <span className="text-rose-400 font-semibold block mb-0.5">
                      🔋 Bateria Fraca (Detrator)
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      Fone ANC com autonomia muito abaixo do prometido
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setPlaygroundText(
                        "O bluetooth fica caindo a cada 10 minutos quando uso no trabalho. Impossível participar de reuniões."
                      );
                      setPlaygroundProduct("Teclado Mecânico Wireless Stealth");
                    }}
                    className="text-left p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <span className="text-amber-400 font-semibold block mb-0.5">
                      📶 Bluetooth Desconectando
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      Teclado sem fio desconectando com frequência
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setPlaygroundText(
                        "Melhor compra que fiz no ano! Conforto absurdo, som cristalino e bateria durou 4 dias de uso intenso."
                      );
                      setPlaygroundProduct("Smartwatch Tracker Ultra");
                    }}
                    className="text-left p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <span className="text-emerald-400 font-semibold block mb-0.5">
                      ⭐ Produto Excelente (Promotor)
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      Cliente encantado com qualidade e bateria
                    </span>
                  </button>
                </div>
              </div>

              {/* Formulário de Input */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Nome do Produto / SKU:
                  </label>
                  <input
                    type="text"
                    value={playgroundProduct}
                    onChange={(e) => setPlaygroundProduct(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-rose-500/50 rounded-2xl px-4 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Texto da Mensagem / Avaliação do Cliente:
                  </label>
                  <textarea
                    rows={3}
                    value={playgroundText}
                    onChange={(e) => setPlaygroundText(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-rose-500/50 rounded-2xl p-4 text-xs sm:text-sm text-white outline-none transition-all resize-none"
                    placeholder="Digite a avaliação para classificar..."
                  />
                </div>

                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing || !playgroundText.trim()}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 font-semibold text-xs sm:text-sm text-white transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processando com Structured Outputs (Gemini 1.5 Flash)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analisar Avaliação com Inteligência Artificial
                    </>
                  )}
                </button>
              </div>

              {/* Card de Resultados da Análise */}
              {analysisResult && (
                <div className="mt-6 p-5 rounded-2xl bg-[#090d16] border border-rose-500/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Resultado da Análise Estruturada
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {analysisResult.metrics.is_live ? "API Gemini Conectada" : "Modo Simulado / Fallback"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Sentimento:</span>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono",
                            analysisResult.result.sentiment === "Positivo"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : analysisResult.result.sentiment === "Negativo"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          )}
                        >
                          {analysisResult.result.sentiment} (Score: {analysisResult.result.sentiment_score > 0 ? `+${analysisResult.result.sentiment_score}` : analysisResult.result.sentiment_score})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Dimensão / Aspecto:</span>
                        <span className="text-xs font-semibold text-white">
                          {analysisResult.result.aspect}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Causa-Raiz Detectada:</span>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {analysisResult.result.primary_problem_tag}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Risco de Churn:</span>
                        <span
                          className={cn(
                            "text-xs font-bold font-mono",
                            analysisResult.result.churn_risk === "Alto"
                              ? "text-rose-400"
                              : analysisResult.result.churn_risk === "Médio"
                              ? "text-amber-400"
                              : "text-emerald-400"
                          )}
                        >
                          {analysisResult.result.churn_risk}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                        💰 FinOps da Chamada:
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Tokens Consumidos:</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {analysisResult.metrics.total_tokens}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Custo da Chamada (R$):</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          R$ {analysisResult.metrics.cost_brl.toFixed(5)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Custo em Dólar (USD):</span>
                        <span className="font-mono text-slate-300">
                          ${analysisResult.metrics.cost_usd.toFixed(5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-xs text-amber-300 font-semibold block">
                      💡 Ação Prescritiva Recomendada:
                    </span>
                    <p className="text-xs text-slate-300">
                      {analysisResult.result.suggested_action}
                    </p>
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-white/5">
                      📝 {analysisResult.result.summary_pt}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =======================================================================
            MÓDULO 3: TABELA DE REVIEWS ENRIQUECIDAS
            ======================================================================= */}
        {activeTab === "table" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    Base de Avaliações Enriquecidas
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Catálogo completo de avaliações com tags de causa-raiz, risco de churn e cálculo de perdas financeiras.
                  </p>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  Exportar CSV
                </button>
              </div>

              {/* Filtros e Busca */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por produto, autor ou causa-raiz..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-rose-500/50 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <select
                    value={selectedSentiment}
                    onChange={(e) => setSelectedSentiment(e.target.value)}
                    className="w-full bg-[#0b0f1a] border border-white/10 focus:border-rose-500/50 rounded-2xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="TODOS">Todos os Sentimentos</option>
                    <option value="Positivo">Apenas Positivo</option>
                    <option value="Negativo">Apenas Negativo</option>
                    <option value="Misto">Apenas Misto</option>
                  </select>
                </div>

                <div>
                  <select
                    value={selectedAspect}
                    onChange={(e) => setSelectedAspect(e.target.value)}
                    className="w-full bg-[#0b0f1a] border border-white/10 focus:border-rose-500/50 rounded-2xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="TODOS">Todas as Dimensões</option>
                    <option value="Bateria">Bateria</option>
                    <option value="Conectividade">Conectividade</option>
                    <option value="Ergonomia">Ergonomia</option>
                    <option value="Atendimento SAC">Atendimento SAC</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Dados */}
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-white/[0.02]">
                    <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                      <th className="py-3 px-3.5">ID / Autor</th>
                      <th className="py-3 px-3.5">Produto</th>
                      <th className="py-3 px-3.5 text-center">Nota</th>
                      <th className="py-3 px-3.5">Sentimento</th>
                      <th className="py-3 px-3.5">Causa-Raiz</th>
                      <th className="py-3 px-3.5">Dimensão</th>
                      <th className="py-3 px-3.5 text-center">Risco Churn</th>
                      <th className="py-3 px-3.5 text-right">Perda (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredReviews.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                          Nenhum review encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredReviews.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-white block">{r.author}</span>
                            <span className="text-[10px] font-mono text-slate-500">{r.id}</span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-300 font-medium">
                            {r.product}
                          </td>
                          <td className="py-3 px-3.5 text-center font-mono">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-amber-300 font-bold">
                              ★ {r.rating}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold border",
                                r.ai_sentiment === "Positivo"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : r.ai_sentiment === "Negativo"
                                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              )}
                            >
                              {r.ai_sentiment} ({r.ai_sentiment_score > 0 ? `+${r.ai_sentiment_score}` : r.ai_sentiment_score})
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-cyan-300">
                            {r.primary_problem_tag}
                          </td>
                          <td className="py-3 px-3.5 text-slate-400">{r.aspect}</td>
                          <td className="py-3 px-3.5 text-center font-mono">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md",
                                r.churn_risk === "Alto"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : r.churn_risk === "Médio"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              )}
                            >
                              {r.churn_risk}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-400">
                            {r.estimated_financial_loss > 0
                              ? `R$ ${r.estimated_financial_loss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================================
            MÓDULO 4: FINOPS & ARQUITETURA DE TOKENS
            ======================================================================= */}
        {activeTab === "finops" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0b0f1a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    FinOps: Eficiência de Custo por Token
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Cálculo rigoroso de retorno sobre investimento (ROI) da IA Generativa aplicada a CX.
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    Custo por 1M de Tokens (Input)
                  </span>
                  <div className="text-xl font-extrabold font-mono text-cyan-400">
                    $0.075 USD (~R$ 0,42)
                  </div>
                  <p className="text-[11px] text-slate-400">Gemini 1.5 Flash Tier Padrão</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    Custo por 1M de Tokens (Output)
                  </span>
                  <div className="text-xl font-extrabold font-mono text-amber-400">
                    $0.300 USD (~R$ 1,68)
                  </div>
                  <p className="text-[11px] text-slate-400">Structured Outputs em JSON Estrito</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    Economia Estimada por Lote
                  </span>
                  <div className="text-xl font-extrabold font-mono text-emerald-400">
                    99.9% de Margem
                  </div>
                  <p className="text-[11px] text-slate-400">R$ 7.943 prevenidos vs R$ 0,0018 gasto</p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-xs font-bold text-white block mb-2 font-mono">
                  JSON Schema Estrito (Structured Outputs Contratado):
                </span>
                <pre className="p-3 rounded-xl bg-black/60 font-mono text-[11px] text-cyan-200 overflow-x-auto whitespace-pre">
{`{
  "sentiment": "Positivo | Negativo | Neutro | Misto",
  "sentiment_score": "float [-1.0 ... +1.0]",
  "aspect": "Bateria | Qualidade de Áudio | Conectividade | Ergonomia | SAC | Geral",
  "primary_problem_tag": "string (2 a 4 palavras)",
  "secondary_tag": "string",
  "churn_risk": "Alto | Médio | Baixo",
  "suggested_action": "string prescritiva",
  "summary_pt": "string executiva em uma frase"
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          FLOATING ACTION BUTTON (FAB) NO CANTO INFERIOR DIREITO
          Posicionamento: fixed bottom-5 right-5 z-40
          Estilo: Pílula gradiente, efeito backdrop-blur, SEM atalhos no botão
          ========================================================================= */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-5 py-3 rounded-full bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-semibold text-xs sm:text-sm shadow-2xl shadow-rose-500/30 backdrop-blur-xl border border-white/20 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Abrir assistente Copilot IA"
      >
        <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/40">
          <img src="/rn_logo_emblem.jpg" alt="" className="w-full h-full object-cover" />
        </div>
        <span className="tracking-wide">Copilot IA</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
      </button>

      {/* =========================================================================
          COPILOT CHAT DRAWER
          ========================================================================= */}
      <CopilotSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}
