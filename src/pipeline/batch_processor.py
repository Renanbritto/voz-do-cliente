import csv
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..ai.client import GeminiVoCClient
from ..ai.schemas import ReviewAnalysisResult
from ..utils.logger import logger

class BatchProcessor:
    """Processador em lote de avaliações brutas com enriquecimento via Gemini."""

    def __init__(self, client: Optional[GeminiVoCClient] = None):
        self.client = client or GeminiVoCClient()

    def process_csv(self, input_path: str | Path, output_dir: str | Path) -> List[Dict[str, Any]]:
        input_file = Path(input_path)
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Iniciando processamento do arquivo: {input_file.name}")
        records = []
        with open(input_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)

        enriched_rows = []
        for i, row in enumerate(records, 1):
            text = row.get("text", "")
            product = row.get("product", "")
            price = float(row.get("price", 0.0))

            logger.info(f"[{i}/{len(records)}] Analisando: {product}...")
            analysis, cost_metrics = self.client.analyze_review(text, product_name=product)

            # Risco financeiro estimado: se for churn alto ou rating <= 2, considera o valor do produto
            is_risk = analysis.churn_risk.value == "Alto" or int(row.get("rating", 3)) <= 2
            financial_loss = price if is_risk else 0.0

            enriched_data = {
                "id": row.get("id", f"rev-{i:02d}"),
                "author": row.get("author", "Anônimo"),
                "product": product,
                "sku": row.get("sku", "SKU-GEN"),
                "rating": int(row.get("rating", 3)),
                "price": price,
                "review_date": row.get("review_date", ""),
                "original_text": text,
                "ai_sentiment": analysis.sentiment.value,
                "ai_sentiment_score": analysis.sentiment_score,
                "primary_problem_tag": analysis.primary_problem_tag,
                "secondary_tag": analysis.secondary_tag,
                "aspect": analysis.aspect.value,
                "churn_risk": analysis.churn_risk.value,
                "suggested_action": analysis.suggested_action,
                "summary_pt": analysis.summary_pt,
                "estimated_financial_loss": financial_loss,
                "token_cost_usd": cost_metrics.cost_usd,
                "token_cost_brl": cost_metrics.cost_brl,
            }
            enriched_rows.append(enriched_data)

        # Salva em JSON estruturado
        json_output = out_dir / "reviews_enriched.json"
        with open(json_output, "w", encoding="utf-8") as f:
            json.dump(enriched_rows, f, ensure_ascii=False, indent=2)

        logger.info(f"Processamento concluído com sucesso! Salvo em: {json_output}")
        return enriched_rows