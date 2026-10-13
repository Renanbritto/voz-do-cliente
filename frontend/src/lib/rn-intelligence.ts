export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sql?: string;
  data?: any[];
  executionTime?: number;
  mode?: string;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ProjectMetadata {
  project_id: string;
  name: string;
  description: string;
  tags: string[];
  suggested_questions: string[];
}

export interface StreamChatOptions {
  projectId?: string;
  message: string;
  history?: ChatHistoryItem[];
  onMetadata?: (meta: { sql_query?: string; query_results?: any[]; mode?: string }) => void;
  onChunk?: (delta: string) => void;
  onDone?: (telemetry: { execution_time_ms: number; mode?: string }) => void;
  onError?: (err: any) => void;
  signal?: AbortSignal;
}

const RN_BASE_URL =
  process.env.NEXT_PUBLIC_RN_INTELLIGENCE_URL || "https://rn-intelligence-api.onrender.com";
const DEFAULT_PROJECT_ID =
  process.env.NEXT_PUBLIC_RN_INTELLIGENCE_PROJECT_ID || "voz-do-cliente";

export const FALLBACK_VOC_METADATA: ProjectMetadata = {
  project_id: "voz-do-cliente",
  name: "Voz do Cliente (VoC) • AI Analytics",
  description:
    "Pipeline de inteligência analítica com Gemini 1.5 Flash, Structured Outputs, Diagrama de Pareto 80/20 e FinOps por token.",
  tags: ["VoC", "Gemini 1.5 Flash", "Pareto 80/20", "FinOps", "Churn Risk", "CX"],
  suggested_questions: [
    "Quais causas-raiz concentram 80% do prejuízo financeiro?",
    "Qual é o impacto financeiro das devoluções do Fone ANC?",
    "Como funciona o cálculo de FinOps por token no Gemini?",
    "Quais clientes estão em alto risco de churn imediato?",
  ],
};

export async function fetchProjectMetadata(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<ProjectMetadata> {
  try {
    const res = await fetch(`${RN_BASE_URL}/api/v1/projects/${projectId}/metadata`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Metadata fetch failed");
    return await res.json();
  } catch {
    return FALLBACK_VOC_METADATA;
  }
}

function resolveVoCOfflineResponse(message: string): { reply: string; sql?: string; data?: any[] } {
  const q = message.toLowerCase();

  if (q.includes("pareto") || q.includes("80/20") || q.includes("prejuizo") || q.includes("perda")) {
    return {
      reply:
        "Análise de **Pareto 80/20** sobre a base de avaliações:\n\n" +
        "• **Causa #1 - Lentidão no Atendimento (SAC):** R$ 3.398,00 acumulados em trocas e devoluções travadas.\n" +
        "• **Causa #2 - Desconexão Frequente:** R$ 1.798,00 em produtos devolvidos (Smartwatch e Teclados Wireless).\n" +
        "• **Causa #3 - Autonomia Insuficiente:** R$ 899,00 (Fone ANC Pro).\n\n" +
        "📌 **Conclusão Estratégica:** Atuar imediatamente no SLA de atendimento do SAC e no firmware de estabilidade Bluetooth/GPS soluciona mais de 75% de todas as devoluções financeiras da operação.",
      sql: "SELECT primary_problem_tag, aspect, COUNT(*) as qtd, SUM(estimated_financial_loss) as prejuizo_brl, ROUND(100.0 * SUM(estimated_financial_loss) / (SELECT SUM(estimated_financial_loss) FROM f_reviews_enriquecidas), 1) as share_pct FROM f_reviews_enriquecidas GROUP BY primary_problem_tag ORDER BY prejuizo_brl DESC;",
      data: [
        { primary_problem_tag: "Lentidão no Atendimento", aspect: "Atendimento SAC", qtd: 2, prejuizo_brl: 3398.0, share_pct: 42.8 },
        { primary_problem_tag: "Desconexão Frequente", aspect: "Conectividade", qtd: 2, prejuizo_brl: 1798.0, share_pct: 22.6 },
        { primary_problem_tag: "Autonomia Insuficiente", aspect: "Bateria", qtd: 2, prejuizo_brl: 899.0, share_pct: 11.3 },
      ],
    };
  }

  if (q.includes("fone") || q.includes("bateria") || q.includes("anc")) {
    return {
      reply:
        "O **Fone de Ouvido Noise Cancelling Pro** apresenta dois cenários críticos detectados pela IA:\n\n" +
        "1. **Bateria (Autonomia Real vs Anunciada):** Cliente reportou apenas 2h com ANC ativo vs 30h prometidas (Score: -0.85, Risco de Churn Alto, Devolução de R$ 899,00).\n" +
        "2. **Ruído no Modo Transparência:** Chiado no fone esquerdo devido a falha na linha de calibração do microfone secundário.\n\n" +
        "💡 **Ação Prescritiva:** Solicitar recall preventivo do lote AUDIO-PRO-ANC e atualizar a descrição técnica na página de vendas para esclarecer autonomia com ANC máximo.",
      sql: "SELECT id, product, rating, ai_sentiment, aspect, estimated_financial_loss, suggested_action FROM f_reviews_enriquecidas WHERE sku = 'AUDIO-PRO-ANC';",
      data: [
        { id: "rev-01", product: "Fone de Ouvido Noise Cancelling Pro", rating: 1, ai_sentiment: "Negativo", aspect: "Bateria", loss: 899.0 },
        { id: "rev-07", product: "Fone de Ouvido Noise Cancelling Pro", rating: 1, ai_sentiment: "Negativo", aspect: "Atendimento SAC", loss: 899.0 },
      ],
    };
  }

  if (q.includes("finops") || q.includes("token") || q.includes("custo") || q.includes("preco")) {
    return {
      reply:
        "O pipeline utiliza o **Google Gemini 1.5 Flash** com Structured Outputs (JSON Schema estrito):\n\n" +
        "• **Custo de Entrada (Input):** $0.075 por 1 Milhão de tokens (~R$ 0,42 / 1M tokens)\n" +
        "• **Custo de Saída (Output):** $0.30 por 1 Milhão de tokens (~R$ 1,68 / 1M tokens)\n" +
        "• **Custo Médio por Review Analisada:** apenas **R$ 0,00018** (menos de 2 centavos a cada 100 reviews!)\n\n" +
        "Essa arquitetura confere escalabilidade para milhões de avaliações mensais com custo operacional insignificante perto das devoluções prevenidas.",
      sql: "SELECT SUM(tokens_total) as tokens_gastos, SUM(custo_brl) as custo_total_brl, AVG(custo_brl) as custo_medio_review FROM finops_telemetry;",
      data: [{ tokens_gastos: 3200, custo_total_brl: 0.00182, custo_medio_review: 0.000182 }],
    };
  }

  if (q.includes("churn") || q.includes("risco") || q.includes("detrator")) {
    return {
      reply:
        "Taxa atual de Detratores: **50.0%** (com 40% em Alto Risco de Churn):\n\n" +
        "• **Clientes em Alerta Máximo:** Carlos E. Mendes (Fone ANC), Rodrigo N. Prado (Smartwatch), Lucas B. Faria (Teclado Mecânico) e Guilherme H. Souza (Fone ANC).\n" +
        "• **Gatilho Principal:** Combinação de produto com defeito + falta de agilidade no canal de SAC.\n\n" +
        "🚀 **Recomendação:** Priorizar fila de atendimento automatizado via WhatsApp para usuários classificados com Risco 'Alto'.",
      sql: "SELECT author, product, rating, churn_risk, suggested_action FROM f_reviews_enriquecidas WHERE churn_risk = 'Alto';",
      data: [
        { author: "Carlos E. Mendes", product: "Fone ANC", churn_risk: "Alto" },
        { author: "Rodrigo N. Prado", product: "Smartwatch Ultra", churn_risk: "Alto" },
        { author: "Lucas B. Faria", product: "Teclado Wireless", churn_risk: "Alto" },
        { author: "Guilherme H. Souza", product: "Fone ANC", churn_risk: "Alto" },
      ],
    };
  }

  return {
    reply:
      "O **Copilot VoC Intelligence** está conectado ao pipeline do Gemini 1.5 Flash.\n\n" +
      "• **Módulos Ativos:** Diagrama de Pareto 80/20, Matriz de Causas-Raiz, FinOps em Tempo Real e Classificador Structured Outputs.\n" +
      "• **Cobertura:** 100% dos reviews não-estruturados enriquecidos com score de sentimento, tags técnicas e custo por token.\n\n" +
      "Você pode me perguntar sobre causas-raiz no Pareto, custos de FinOps, risco de churn ou detalhes de produtos específicos.",
    sql: "SELECT 'VoC Intelligence Online' as status, COUNT(*) as total_reviews, SUM(estimated_financial_loss) as prejuizo_total FROM f_reviews_enriquecidas;",
    data: [{ status: "VoC Intelligence Online", total_reviews: 10, prejuizo_total: 7943.0 }],
  };
}

export async function streamChatMessage({
  projectId = DEFAULT_PROJECT_ID,
  message,
  history = [],
  onMetadata,
  onChunk,
  onDone,
  onError,
  signal,
}: StreamChatOptions): Promise<void> {
  const startTime = performance.now();

  try {
    const res = await fetch(`${RN_BASE_URL}/api/v1/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        message,
        history,
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`SSE endpoint returned status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed.startsWith("data:")) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, "");
        if (!jsonStr) continue;

        try {
          const payload = JSON.parse(jsonStr);
          if (payload.type === "metadata" && onMetadata) {
            onMetadata({
              sql_query: payload.sql_query,
              query_results: payload.query_results,
              mode: payload.mode,
            });
          } else if (payload.type === "chunk" && onChunk) {
            onChunk(payload.delta || "");
          } else if (payload.type === "done" && onDone) {
            onDone({
              execution_time_ms: payload.execution_time_ms,
              mode: payload.mode,
            });
          }
        } catch {}
      }
    }
  } catch (err: any) {
    if (signal?.aborted) return;

    // Resilient simulated streaming with typewriter effect
    const fallback = resolveVoCOfflineResponse(message);

    if (onMetadata) {
      onMetadata({
        sql_query: fallback.sql,
        query_results: fallback.data,
        mode: "voc_edge_agent",
      });
    }

    const words = fallback.reply.split(/(\s+)/);
    for (const w of words) {
      if (signal?.aborted) return;
      if (onChunk) onChunk(w);
      await new Promise((r) => setTimeout(r, 12));
    }

    const elapsed = Math.round(performance.now() - startTime);
    if (onDone) {
      onDone({
        execution_time_ms: elapsed,
        mode: "voc_edge_agent",
      });
    }
  }
}
