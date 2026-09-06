import pytest
from src.ai.cost_calc import FinOpsCalculator

def test_cost_calculation():
    calc = FinOpsCalculator(usd_to_brl=5.0)
    # 1.000.000 prompt tokens = $0.075 | 1.000.000 completion = $0.300
    metrics = calc.calculate_cost(prompt_tokens=1_000_000, completion_tokens=1_000_000)
    assert metrics.cost_usd == 0.375
    assert metrics.cost_brl == 1.875
    assert metrics.total_tokens == 2_000_000

def test_single_review_micro_cost():
    calc = FinOpsCalculator(usd_to_brl=5.60)
    # Review típica: ~250 prompt tokens e ~100 completion tokens
    metrics = calc.calculate_cost(prompt_tokens=250, completion_tokens=100)
    assert metrics.cost_usd > 0
    # Custo de 1 review deve ser inferior a 1 centavo de real (R$ 0,001)
    assert metrics.cost_brl < 0.001