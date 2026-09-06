import os
import time
import json
from typing import Optional, Tuple
from dotenv import load_dotenv

from .schemas import ReviewAnalysisResult, SentimentEnum, AspectEnum, ChurnRiskEnum
from .cost_calc import FinOpsCalculator, CostMetrics, TokenUsage
from ..utils.logger import logger

load_dotenv()

SYSTEM_INSTRUCTION = """
Você é um Engenheiro de Inteligência de Produto e Especialista Sênior em Voz do Cliente (VoC) e Customer Experience (CX).
Sua missão é analisar avaliações de consumidores de e-commerce e tecnologia com rigor analítico absoluto.

Diretrizes obrigatórias:
1. Extraia o sentimento real, evitando falso otimismo em reviews irônicas.
2. Atribua o score contínuo entre -1.0 (detrator severo com devolução) e +1.0 (promotor leal).
3. Identifique a causa-raiz primária (primary_problem_tag) de forma concisa em 2 a 4 palavras.
4. Categorize a dimensão (aspect) mais afetada: Bateria, Qualidade de Áudio, Conectividade, Ergonomia, Logística ou Atendimento SAC.
5. Emita uma recomendação acionável e prescritiva para engenharia ou operações.
"""

class GeminiVoCClient:
    """Cliente oficial de integração com Google GenAI SDK e Gemini 1.5 Flash."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        self.model_name = model_name
        self.calculator = FinOpsCalculator()
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                # Tentativa de inicialização com o novo SDK google-genai
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info(f"Conectado com sucesso à API Google GenAI (Modelo: {self.model_name})")
            except ImportError:
                try:
                    # Fallback para google.generativeai legado caso o novo ainda não esteja instalado
                    import google.generativeai as legacy_genai
                    legacy_genai.configure(api_key=self.api_key)
                    self._client = legacy_genai.GenerativeModel(
                        model_name=self.model_name,
                        system_instruction=SYSTEM_INSTRUCTION
                    )
                    logger.info("Conectado via google.generativeai (fallback legado)")
                except Exception as ex:
                    logger.warning(f"Erro ao inicializar SDK do Gemini: {ex}")
                    self._client = None
        else:
            logger.warning("GEMINI_API_KEY não encontrada no ambiente. Operando em modo de simulação inteligente.")

    def analyze_review(
        self, text: str, product_name: str = "", max_retries: int = 3
    ) -> Tuple[ReviewAnalysisResult, CostMetrics]:
        """
        Executa a análise de sentimento e extração de causa-raiz com Structured Outputs.
        Retorna a tupla (ReviewAnalysisResult, CostMetrics).
        """
        prompt = f"Produto: {product_name or 'Não especificado'}\nAvaliação do Cliente:\n\"{text}\""

        # Se houver cliente real configurado
        if self._client is not None:
            for attempt in range(max_retries):
                try:
                    return self._call_gemini_api(prompt)
                except Exception as e:
                    logger.warning(f"Tentativa {attempt + 1}/{max_retries} falhou: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                    else:
                        logger.error("Todas as tentativas esgotadas. Utilizando fallback local estruturado.")
                        return self._generate_heuristic_fallback(text, product_name)

        # Fallback de simulação caso esteja sem API Key configurada
        return self._generate_heuristic_fallback(text, product_name)

    def _call_gemini_api(self, prompt: str) -> Tuple[ReviewAnalysisResult, CostMetrics]:
        """Executa a chamada real à API exigindo o schema Pydantic."""
        try:
            # Google GenAI SDK moderno
            from google.genai import types
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=ReviewAnalysisResult,
                    temperature=0.1,
                ),
            )
            raw_text = response.text
            parsed_data = json.loads(raw_text)
            result = ReviewAnalysisResult(**parsed_data)

            # Extrai tokens reais da resposta
            prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", len(prompt) // 4)
            completion_tokens = getattr(response.usage_metadata, "candidates_token_count", len(raw_text) // 4)
            metrics = self.calculator.calculate_cost(prompt_tokens, completion_tokens)
            return result, metrics
        except Exception:
            # Tentativa com SDK GenerativeModel legado
            response = self._client.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json", "temperature": 0.1}
            )
            raw_text = response.text
            parsed_data = json.loads(raw_text)
            result = ReviewAnalysisResult(**parsed_data)
            metrics = self.calculator.calculate_cost(len(prompt) // 4, len(raw_text) // 4)
            return result, metrics

    def _generate_heuristic_fallback(
        self, text: str, product_name: str
    ) -> Tuple[ReviewAnalysisResult, CostMetrics]:
        """Simulação analítica local de alta fidelidade para testes sem gastar tokens."""
        lower = text.lower()

        # Detecção de aspecto e sentimento por palavras-chave
        if any(w in lower for w in ["bateria", "horas", "autonomia", "carrega"]):
            aspect = AspectEnum.BATERIA
            tag = "Autonomia Insuficiente" if any(w in lower for w in ["não dura", "pouco", "acaba", "longe"]) else "Bateria Durável"
        elif any(w in lower for w in ["áudio", "som", "chiado", "graves", "ruído"]):
            aspect = AspectEnum.AUDIO
            tag = "Chiado & Ruído" if any(w in lower for w in ["chia", "defeito", "ruim"]) else "Áudio de Alta Definição"
        elif any(w in lower for w in ["bluetooth", "conecta", "sinal", "desconecta"]):
            aspect = AspectEnum.CONECTIVIDADE
            tag = "Desconexão Frequente"
        elif any(w in lower for w in ["dor", "punho", "pesado", "conforto", "ergonomia"]):
            aspect = AspectEnum.ERGONOMIA
            tag = "Peso & Pressão Excessiva" if "pesado" in lower else "Excelente Ergonomia"
        elif any(w in lower for w in ["entrega", "demorou", "sac", "troca", "garantia"]):
            aspect = AspectEnum.SAC
            tag = "Lentidão no Atendimento"
        else:
            aspect = AspectEnum.GERAL
            tag = "Experiência Geral"

        # Sentimento e score
        if any(w in lower for w in ["devolução", "defeito", "ruim", "péssimo", "não dura", "desconectando", "decepcionado"]):
            sentiment = SentimentEnum.NEGATIVO
            score = -0.85
            churn = ChurnRiskEnum.ALTO
            action = "Contatar cliente com prioridade e revisar lote de produção."
        elif any(w in lower for w in ["espetacular", "excelente", "melhor", "adorei", "perfeitamente", "recomendo"]):
            sentiment = SentimentEnum.POSITIVO
            score = 0.90
            churn = ChurnRiskEnum.BAIXO
            action = "Incentivar compartilhamento de experiência de compra."
        else:
            sentiment = SentimentEnum.MISTO
            score = 0.20
            churn = ChurnRiskEnum.MEDIO
            action = "Monitorar ocorrências similares no backlog de Produto."

        result = ReviewAnalysisResult(
            sentiment=sentiment,
            sentiment_score=score,
            aspect=aspect,
            primary_problem_tag=tag,
            secondary_tag="Classificação Automatizada",
            churn_risk=churn,
            suggested_action=action,
            summary_pt=f"Avaliação sobre {aspect.value}: cliente expressou sentimento {sentiment.value.lower()}."
        )

        estimated_prompt_tokens = max(50, len(text) // 3)
        estimated_output_tokens = 95
        metrics = self.calculator.calculate_cost(estimated_prompt_tokens, estimated_output_tokens)
        return result, metrics