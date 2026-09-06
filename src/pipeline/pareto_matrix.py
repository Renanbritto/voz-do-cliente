from typing import List, Dict, Any

class ParetoAnalyzer:
    """
    Analisa as causas-raiz de insatisfação utilizando o Princípio de Pareto (Regra 80/20):
    Identifica quais 20% das causas-raiz concentram 80% do prejuízo financeiro das devoluções.
    """

    @staticmethod
    def calculate_pareto(enriched_reviews: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Filtra ocorrências com causa-raiz e perda financeira ou detratores
        loss_by_tag: Dict[str, Dict[str, Any]] = {}

        for rev in enriched_reviews:
            tag = rev.get("primary_problem_tag", "Outros")
            loss = rev.get("estimated_financial_loss", 0.0)
            aspect = rev.get("aspect", "Geral")

            if tag not in loss_by_tag:
                loss_by_tag[tag] = {
                    "tag": tag,
                    "aspect": aspect,
                    "count": 0,
                    "total_loss": 0.0,
                }
            loss_by_tag[tag]["count"] += 1
            loss_by_tag[tag]["total_loss"] += loss

        # Ordena decrescente pelo prejuízo financeiro total
        sorted_tags = sorted(loss_by_tag.values(), key=lambda x: x["total_loss"], reverse=True)
        total_loss_all = sum(x["total_loss"] for x in sorted_tags) or 1.0

        cumulative_loss = 0.0
        pareto_table = []
        for rank, item in enumerate(sorted_tags, 1):
            cumulative_loss += item["total_loss"]
            cumulative_pct = (cumulative_loss / total_loss_all) * 100.0
            individual_pct = (item["total_loss"] / total_loss_all) * 100.0

            # Classificação ABC de severidade financeira
            if cumulative_pct <= 80.0 or rank == 1:
                category = "A (Crítico - Top 80% Prejuízo)"
            elif cumulative_pct <= 95.0:
                category = "B (Moderado - Próximos 15%)"
            else:
                category = "C (Leve - Cauda Longa)"

            pareto_table.append({
                "rank": rank,
                "primary_problem_tag": item["tag"],
                "aspect": item["aspect"],
                "complaints_count": item["count"],
                "total_loss_brl": round(item["total_loss"], 2),
                "share_pct": round(individual_pct, 1),
                "cumulative_pct": round(cumulative_pct, 1),
                "pareto_class": category,
            })

        return pareto_table