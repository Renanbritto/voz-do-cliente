from src.pipeline.pareto_matrix import ParetoAnalyzer

def test_pareto_calculation_ranks_by_financial_loss():
    sample = [
        {"primary_problem_tag": "Defeito de Tela", "aspect": "Display", "estimated_financial_loss": 2500.0},
        {"primary_problem_tag": "Bateria Fraca", "aspect": "Bateria", "estimated_financial_loss": 900.0},
        {"primary_problem_tag": "Defeito de Tela", "aspect": "Display", "estimated_financial_loss": 2500.0},
        {"primary_problem_tag": "Botão Duro", "aspect": "Ergonomia", "estimated_financial_loss": 100.0},
    ]
    # Total = 6000. Defeito de Tela = 5000 (83.3%)
    table = ParetoAnalyzer.calculate_pareto(sample)
    assert len(table) == 3
    assert table[0]["primary_problem_tag"] == "Defeito de Tela"
    assert table[0]["total_loss_brl"] == 5000.0
    assert table[0]["cumulative_pct"] > 80.0
    assert "A" in table[0]["pareto_class"]