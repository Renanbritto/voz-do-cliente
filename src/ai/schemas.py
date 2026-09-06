from enum import Enum
from pydantic import BaseModel, Field

class SentimentEnum(str, Enum):
    POSITIVO = "Positivo"
    NEGATIVO = "Negativo"
    NEUTRO = "Neutro"
    MISTO = "Misto"

class AspectEnum(str, Enum):
    BATERIA = "Bateria"
    AUDIO = "Qualidade de Áudio"
    CONECTIVIDADE = "Conectividade"
    ERGONOMIA = "Ergonomia"
    LOGISTICA = "Logística"
    SAC = "Atendimento SAC"
    GERAL = "Geral"

class ChurnRiskEnum(str, Enum):
    ALTO = "Alto"
    MEDIO = "Médio"
    BAIXO = "Baixo"

class ReviewAnalysisResult(BaseModel):
    """Contrato rigoroso para saída estruturada (Structured Outputs) do Gemini."""
    sentiment: SentimentEnum = Field(
        description="Classificação macro do sentimento geral da avaliação."
    )
    sentiment_score: float = Field(
        ge=-1.0, le=1.0,
        description="Score contínuo de sentimento: -1.0 (extremamente negativo) a +1.0 (extremamente positivo)."
    )
    aspect: AspectEnum = Field(
        description="Dimensão técnica ou operacional foco da avaliação."
    )
    primary_problem_tag: str = Field(
        description="Causa-raiz primária do problema em 2 a 4 palavras."
    )
    secondary_tag: str = Field(
        description="Subtag contextual específica ou nuance secundária detectada."
    )
    churn_risk: ChurnRiskEnum = Field(
        description="Probabilidade de cancelamento, devolução ou abandono da marca."
    )
    suggested_action: str = Field(
        description="Ação prescritiva recomendada para os times de Engenharia de Produto, Logística ou SAC."
    )
    summary_pt: str = Field(
        description="Síntese executiva da avaliação em uma única frase assertiva em português."
    )
