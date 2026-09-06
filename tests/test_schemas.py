import pytest
from pydantic import ValidationError
from src.ai.schemas import ReviewAnalysisResult, SentimentEnum, AspectEnum, ChurnRiskEnum

def test_valid_review_analysis():
    payload = {
        "sentiment": "Negativo",
        "sentiment_score": -0.85,
        "aspect": "Bateria",
        "primary_problem_tag": "Autonomia Insuficiente",
        "secondary_tag": "Promessa Enganosa",
        "churn_risk": "Alto",
        "suggested_action": "Recalibrar firmware e atualizar especificações na página do produto.",
        "summary_pt": "Cliente insatisfeito com a duração real da bateria e solicitou devolução."
    }
    result = ReviewAnalysisResult(**payload)
    assert result.sentiment == SentimentEnum.NEGATIVO
    assert result.aspect == AspectEnum.BATERIA
    assert result.churn_risk == ChurnRiskEnum.ALTO
    assert result.sentiment_score == -0.85

def test_score_boundary_validation():
    with pytest.raises(ValidationError):
        ReviewAnalysisResult(
            sentiment="Positivo",
            sentiment_score=1.5,  # Excede limite superior (+1.0)
            aspect="Qualidade de Áudio",
            primary_problem_tag="Excelente",
            secondary_tag="",
            churn_risk="Baixo",
            suggested_action="Nenhuma",
            summary_pt="Ótimo áudio."
        )

def test_invalid_aspect_enum():
    with pytest.raises(ValidationError):
        ReviewAnalysisResult(
            sentiment="Neutro",
            sentiment_score=0.0,
            aspect="AspectoInexistente",  # Não pertence ao Enum
            primary_problem_tag="Teste",
            secondary_tag="",
            churn_risk="Baixo",
            suggested_action="Nenhuma",
            summary_pt="Teste."
        )