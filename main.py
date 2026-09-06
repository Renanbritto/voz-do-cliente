import argparse
import sys
from pathlib import Path
from src.ai.client import GeminiVoCClient
from src.pipeline.batch_processor import BatchProcessor
from src.pipeline.pareto_matrix import ParetoAnalyzer

def print_banner():
    print("=" * 75)
    print("🎙️  VOZ DO CLIENTE (VoC) & ENRIQUECIMENTO COM IA - GEMINI API")
    print("=" * 75)

def run_test_review(client: GeminiVoCClient, review_text: str, product: str = "Produto Teste"):
    print_banner()
    print(f"\n🔍 Analisando avaliação ao vivo: \"{review_text}\"")
    print(f"📦 Produto: {product}\n")

    result, metrics = client.analyze_review(review_text, product_name=product)

    print("📊 RESULTADO DO ENRIQUECIMENTO COM IA:")
    print(f"  • Sentimento:          {result.sentiment.value} (Score: {result.sentiment_score:+.2f})")
    print(f"  • Dimensão / Aspecto:  {result.aspect.value}")
    print(f"  • Causa-Raiz Primária: {result.primary_problem_tag}")
    print(f"  • Subtag Contextual:   {result.secondary_tag}")
    print(f"  • Risco de Churn:      {result.churn_risk.value}")
    print(f"  • Ação Recomendada:    {result.suggested_action}")
    print(f"  • Resumo Executivo:    {result.summary_pt}")
    print("-" * 75)
    print(f"💰 FinOps (Tokens): {metrics.total_tokens} tokens | Custo: R$ {metrics.cost_brl:.5f} ($ {metrics.cost_usd:.5f})\n")

def run_batch_and_pareto():
    print_banner()
    input_csv = Path("data/raw/reviews_sample.csv")
    out_dir = Path("data/enriched")

    if not input_csv.exists():
        print(f"❌ Arquivo de entrada não encontrado em: {input_csv}")
        return

    processor = BatchProcessor()
    enriched_reviews = processor.process_csv(input_csv, out_dir)

    print("\n📈 CALCULANDO DIAGRAMA DE PARETO (IMPACTO FINANCEIRO 80/20)...\n")
    pareto_data = ParetoAnalyzer.calculate_pareto(enriched_reviews)

    print(f"{'Rank':<5} | {'Causa-Raiz':<26} | {'Dimensão':<18} | {'Qtd':<4} | {'Prejuízo (R$)':<14} | {'% Acum'}")
    print("-" * 85)
    for row in pareto_data:
        print(f"{row['rank']:<5} | {row['primary_problem_tag']:<26} | {row['aspect']:<18} | {row['complaints_count']:<4} | R$ {row['total_loss_brl']:<11.2f} | {row['cumulative_pct']}% ({row['pareto_class'][:7]})")

    finops = processor.client.calculator.get_cumulative_summary()
    print("\n" + "=" * 85)
    print(f"💵 FINOPS TOTAL DO LOTE:")
    print(f"  • Tokens Consumidos: {finops['total_tokens']:,}")
    print(f"  • Custo Total:       R$ {finops['total_cost_brl']:.5f} (US$ {finops['total_cost_usd']:.5f})")
    print(f"  • Custo Médio/Review: R$ {finops['avg_cost_per_review_brl']:.5f}")
    print("=" * 85 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Pipeline de Voz do Cliente (VoC) com Gemini")
    parser.add_argument("--test", type=str, help="Analisa um review de texto ao vivo")
    parser.add_argument("--product", type=str, default="Dispositivo", help="Nome do produto para o teste")
    parser.add_argument("--batch", action="store_true", help="Executa o processamento do lote e exibe Pareto")

    args = parser.parse_args()

    if args.test:
        client = GeminiVoCClient()
        run_test_review(client, args.test, product=args.product)
    else:
        run_batch_and_pareto()

if __name__ == "__main__":
    main()