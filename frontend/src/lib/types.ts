export interface EnrichedReview {
  id: string;
  author: string;
  product: string;
  sku: string;
  rating: number;
  price: number;
  review_date: string;
  original_text: string;
  ai_sentiment: "Positivo" | "Negativo" | "Neutro" | "Misto";
  ai_sentiment_score: number;
  primary_problem_tag: string;
  secondary_tag: string;
  aspect: string;
  churn_risk: "Alto" | "Médio" | "Baixo";
  suggested_action: string;
  summary_pt: string;
  estimated_financial_loss: number;
  token_cost_usd: number;
  token_cost_brl: number;
}

export interface ParetoItem {
  rank: number;
  primary_problem_tag: string;
  aspect: string;
  complaints_count: number;
  total_loss_brl: number;
  percentage_of_total: number;
  cumulative_loss_brl: number;
  cumulative_pct: number;
  pareto_class: "Classe A (Crítico 80%)" | "Classe B / C (Resíduo)";
}

export interface FinOpsSummary {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  total_cost_brl: number;
  avg_cost_per_review_brl: number;
}
