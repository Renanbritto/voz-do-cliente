import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, productName } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Texto da avaliação obrigatório." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const lower = text.toLowerCase();

    // Se tiver chave de API do Gemini configurada, tenta chamada real ao Google GenAI
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Você é um especialista em Voz do Cliente (VoC). Analise a avaliação abaixo e retorne APENAS um JSON válido.
Produto: ${productName || "Não especificado"}
Avaliação: "${text}"

Responda no formato JSON exato:
{
  "sentiment": "Positivo" | "Negativo" | "Neutro" | "Misto",
  "sentiment_score": float entre -1.0 e 1.0,
  "aspect": "Bateria" | "Qualidade de Áudio" | "Conectividade" | "Ergonomia" | "Logística" | "Atendimento SAC" | "Geral",
  "primary_problem_tag": "Causa-raiz primária em 2 a 4 palavras",
  "secondary_tag": "Subtag contextual",
  "churn_risk": "Alto" | "Médio" | "Baixo",
  "suggested_action": "Ação recomendada para o time",
  "summary_pt": "Resumo executivo em uma frase"
}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const candidateText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const parsed = JSON.parse(candidateText);

          const inputTokens = data.usageMetadata?.promptTokenCount || 240;
          const outputTokens = data.usageMetadata?.candidatesTokenCount || 85;
          const totalTokens = inputTokens + outputTokens;

          // Preço Gemini 1.5 Flash: $0.075 / 1M input, $0.30 / 1M output
          const costUsd =
            (inputTokens * 0.075) / 1000000 + (outputTokens * 0.3) / 1000000;
          const costBrl = costUsd * 5.7;

          return NextResponse.json({
            result: parsed,
            metrics: {
              total_tokens: totalTokens,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost_usd: costUsd,
              cost_brl: costBrl,
              is_live: true,
            },
          });
        }
      } catch (err) {
        console.error("Gemini API call failed, falling back to heuristic engine:", err);
      }
    }

    // Heurística analítica inteligente caso sem chave ou offline
    let sentiment: "Positivo" | "Negativo" | "Misto" | "Neutro" = "Misto";
    let sentimentScore = 0.0;
    let aspect = "Geral";
    let primaryProblemTag = "Experiência Geral";
    let churnRisk: "Alto" | "Médio" | "Baixo" = "Médio";
    let suggestedAction = "Monitorar ocorrências no backlog de Produto.";
    let summaryPt = "Avaliação com feedback variado sobre o produto.";

    if (
      lower.includes("bateria") ||
      lower.includes("descarrega") ||
      lower.includes("carga") ||
      lower.includes("autonomia")
    ) {
      aspect = "Bateria";
      if (lower.includes("não dura") || lower.includes("ruim") || lower.includes("pouco") || lower.includes("péssim")) {
        sentiment = "Negativo";
        sentimentScore = -0.88;
        primaryProblemTag = "Autonomia Insuficiente";
        churnRisk = "Alto";
        suggestedAction = "Priorizar recall preventivo ou revisar controle de qualidade das células de bateria.";
        summaryPt = "Cliente severamente insatisfeito com a autonomia da bateria.";
      } else {
        sentiment = "Positivo";
        sentimentScore = 0.92;
        primaryProblemTag = "Bateria Durável";
        churnRisk = "Baixo";
        suggestedAction = "Incentivar depoimento em campanhas de marketing.";
        summaryPt = "Cliente altamente satisfeito com a longevidade da bateria.";
      }
    } else if (
      lower.includes("bluetooth") ||
      lower.includes("desconect") ||
      lower.includes("gps") ||
      lower.includes("sinal") ||
      lower.includes("wi-fi") ||
      lower.includes("wifi")
    ) {
      aspect = "Conectividade";
      sentiment = "Negativo";
      sentimentScore = -0.85;
      primaryProblemTag = "Desconexão Frequente";
      churnRisk = "Alto";
      suggestedAction = "Submeter atualização de firmware para estabilização de conexão.";
      summaryPt = "Falhas reincidentes de conexão e sincronização de dados.";
    } else if (
      lower.includes("dor") ||
      lower.includes("confort") ||
      lower.includes("ergonomia") ||
      lower.includes("pesad") ||
      lower.includes("punho")
    ) {
      aspect = "Ergonomia";
      if (lower.includes("sumiram") || lower.includes("ótimo") || lower.includes("melhor")) {
        sentiment = "Positivo";
        sentimentScore = 0.89;
        primaryProblemTag = "Excelente Ergonomia";
        churnRisk = "Baixo";
        suggestedAction = "Destacar conforto ergonômico como diferencial comercial.";
        summaryPt = "Feedback positivo sobre alívio ergonômico e postura.";
      } else {
        sentiment = "Negativo";
        sentimentScore = -0.65;
        primaryProblemTag = "Peso Excessivo";
        churnRisk = "Médio";
        suggestedAction = "Reavaliar distribuição de peso do chassi para próxima versão.";
        summaryPt = "Desconforto físico relatado após uso prolongado.";
      }
    } else if (
      lower.includes("sac") ||
      lower.includes("atendimento") ||
      lower.includes("demor") ||
      lower.includes("troca") ||
      lower.includes("garantia")
    ) {
      aspect = "Atendimento SAC";
      sentiment = "Negativo";
      sentimentScore = -0.92;
      primaryProblemTag = "Lentidão no Atendimento";
      churnRisk = "Alto";
      suggestedAction = "Escalonar ticket para o time de retenção VIP com atendimento humanizado em até 2h.";
      summaryPt = "Reclamação severa sobre lentidão e atrito na jornada de suporte pós-venda.";
    } else if (
      lower.includes("som") ||
      lower.includes("áudio") ||
      lower.includes("ruído") ||
      lower.includes("chia") ||
      lower.includes("grave")
    ) {
      aspect = "Qualidade de Áudio";
      if (lower.includes("chia") || lower.includes("estala") || lower.includes("ruim")) {
        sentiment = "Negativo";
        sentimentScore = -0.85;
        primaryProblemTag = "Distorção / Ruído";
        churnRisk = "Alto";
        suggestedAction = "Inspecionar curva acústica dos drivers e calibragem do microfone ANC.";
        summaryPt = "Artefatos sonoros e estalos relatados pelo cliente.";
      } else {
        sentiment = "Positivo";
        sentimentScore = 0.94;
        primaryProblemTag = "Áudio Imersivo";
        churnRisk = "Baixo";
        suggestedAction = "Aproveitar menção como prova social.";
        summaryPt = "Elogio contundente à fidelidade sonora e equilíbrio dos graves.";
      }
    } else if (lower.includes("excelente") || lower.includes("melhor") || lower.includes("maravilh")) {
      sentiment = "Positivo";
      sentimentScore = 0.95;
      primaryProblemTag = "Excelência Geral";
      churnRisk = "Baixo";
      suggestedAction = "Enviar cupom de fidelidade para próxima compra.";
      summaryPt = "Cliente altamente satisfeito com a experiência global do produto.";
    }

    return NextResponse.json({
      result: {
        sentiment,
        sentiment_score: sentimentScore,
        aspect,
        primary_problem_tag: primaryProblemTag,
        secondary_tag: "Classificação Automatizada",
        churn_risk: churnRisk,
        suggested_action: suggestedAction,
        summary_pt: summaryPt,
      },
      metrics: {
        total_tokens: 318,
        input_tokens: 236,
        output_tokens: 82,
        cost_usd: 0.000032,
        cost_brl: 0.000182,
        is_live: false,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro interno na análise" },
      { status: 500 }
    );
  }
}
