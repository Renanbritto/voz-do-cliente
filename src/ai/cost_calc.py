from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

@dataclass
class CostMetrics:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    cost_brl: float

class FinOpsCalculator:
    """
    Calculadora de custos de tokens para Gemini 1.5 Flash.
    Preços oficiais Google AI Studio (contexto <= 128k tokens):
      - Input: $0.075 por 1.000.000 tokens
      - Output: $0.300 por 1.000.000 tokens
    """
    PRICE_INPUT_PER_M_USD: float = 0.075
    PRICE_OUTPUT_PER_M_USD: float = 0.300
    DEFAULT_USD_TO_BRL: float = 5.65

    def __init__(self, usd_to_brl: float = DEFAULT_USD_TO_BRL):
        self.usd_to_brl = usd_to_brl
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> CostMetrics:
        cost_input_usd = (prompt_tokens / 1_000_000.0) * self.PRICE_INPUT_PER_M_USD
        cost_output_usd = (completion_tokens / 1_000_000.0) * self.PRICE_OUTPUT_PER_M_USD
        total_usd = cost_input_usd + cost_output_usd
        total_brl = total_usd * self.usd_to_brl

        self.total_prompt_tokens += prompt_tokens
        self.total_completion_tokens += completion_tokens

        return CostMetrics(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_usd=round(total_usd, 6),
            cost_brl=round(total_brl, 6),
        )

    def get_cumulative_summary(self) -> Dict[str, Any]:
        total_tokens = self.total_prompt_tokens + self.total_completion_tokens
        total_usd = (
            (self.total_prompt_tokens / 1_000_000.0) * self.PRICE_INPUT_PER_M_USD +
            (self.total_completion_tokens / 1_000_000.0) * self.PRICE_OUTPUT_PER_M_USD
        )
        return {
            "total_prompt_tokens": self.total_prompt_tokens,
            "total_completion_tokens": self.total_completion_tokens,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_usd, 6),
            "total_cost_brl": round(total_usd * self.usd_to_brl, 6),
            "avg_cost_per_review_brl": round(
                (total_usd * self.usd_to_brl) / max(1, (self.total_prompt_tokens // 250)), 6
            )
        }