import streamlit as st
import pandas as pd
import json
from pathlib import Path

from src.ai.client import GeminiVoCClient
from src.pipeline.batch_processor import BatchProcessor
from src.pipeline.pareto_matrix import ParetoAnalyzer

# Configuração da página Streamlit
st.set_page_config(
    page_title="Voz do Cliente (VoC) | IA Gemini",
    page_icon="🎙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilização CSS personalizada
st.markdown("""
<style>
    .metric-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .metric-value {
        font-size: 28px;
        font-weight: 800;
        color: #38bdf8;
    }
    .metric-label {
        font-size: 13px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .badge-neg { color: #f87171; font-weight: bold; }
    .badge-pos { color: #4ade80; font-weight: bold; }
    .badge-neu { color: #facc15; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

# Barra Lateral
st.sidebar.title("🎙️ VoC Analytics AI")
st.sidebar.caption("Pipeline de Engenharia com Gemini 1.5 Flash")

api_key_input = st.sidebar.text_input(
    "Google Gemini API Key (Opcional)",
    type="password",
    help="Se configurada no arquivo .env, não é necessário digitar aqui."
)

st.sidebar.markdown("---")
st.sidebar.markdown("### 📊 Origem dos Dados")
data_source = st.sidebar.radio(
    "Escolha a base de reviews:",
    ["Amostra Padrão (E-commerce Tech)", "Upload de Arquivo CSV"]
)

# Inicializa cliente de IA
@st.cache_resource
def get_client(api_key: str):
    return GeminiVoCClient(api_key=api_key if api_key else None)

client = get_client(api_key_input)

# Carregamento de dados
@st.cache_data
def load_and_enrich_data():
    raw_path = Path("data/raw/reviews_sample.csv")
    enriched_path = Path("data/enriched/reviews_enriched.json")

    # Se já existir enriquecido salvo, lê direto
    if enriched_path.exists():
        with open(enriched_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Senão, roda o batch processor
    processor = BatchProcessor(client=client)
    return processor.process_csv(raw_path, Path("data/enriched"))

with st.spinner("Carregando e processando avaliações com IA..."):
    reviews_data = load_and_enrich_data()

df = pd.DataFrame(reviews_data)
pareto_table = ParetoAnalyzer.calculate_pareto(reviews_data)
pareto_df = pd.DataFrame(pareto_table)

# Cabeçalho Principal
st.title("🎙️ Inteligência de Voz do Cliente (VoC) com Gemini API")
st.markdown(
    "Transformação de avaliações não estruturadas em **causas-raiz acionáveis**, "
    "cálculo de **FinOps por token** e **Diagrama de Pareto 80/20** de perdas financeiras."
)
st.markdown("---")

# Abas de Navegação
tab_overview, tab_table, tab_live = st.tabs([
    "📊 Visão Geral & Pareto",
    "📋 Tabela de Reviews Enriquecidas",
    "⚡ Teste ao Vivo (Playground IA)"
])

# =============================================================================
# ABA 1: VISÃO GERAL & PARETO
# =============================================================================
with tab_overview:
    # 4 Cartões de Métricas
    c1, c2, c3, c4 = st.columns(4)
    total_reviews = len(df)
    total_loss = df["estimated_financial_loss"].sum()
    detractors_count = len(df[df["ai_sentiment"] == "Negativo"])
    detractors_pct = (detractors_count / total_reviews) * 100 if total_reviews else 0
    total_cost_brl = df["token_cost_brl"].sum()

    with c1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Total de Reviews</div>
            <div class="metric-value">{total_reviews}</div>
        </div>
        """, unsafe_allow_html=True)

    with c2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Taxa de Detratores</div>
            <div class="metric-value" style="color: #f87171;">{detractors_pct:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)

    with c3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Prejuízo Mapeado (Devoluções)</div>
            <div class="metric-value" style="color: #fb923c;">R$ {total_loss:,.2f}</div>
        </div>
        """, unsafe_allow_html=True)

    with c4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Custo Total de IA (FinOps)</div>
            <div class="metric-value" style="color: #4ade80;">R$ {total_cost_brl:.4f}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("###")

    # Gráfico de Pareto (Plotly)
    st.subheader("📈 Diagrama de Pareto 80/20: Causas-Raiz vs Prejuízo Financeiro")
    st.caption("Identificação dos 20% de defeitos que concentram 80% do valor de produtos devolvidos.")

    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots

        fig = make_subplots(specs=[[{"secondary_y": True}]])

        # Barras de Perda Financeira
        fig.add_trace(
            go.Bar(
                x=pareto_df["primary_problem_tag"],
                y=pareto_df["total_loss_brl"],
                name="Prejuízo Acumulado (R$)",
                marker_color="#38bdf8",
                opacity=0.85,
            ),
            secondary_y=False,
        )

        # Linha de % Acumulada (Pareto)
        fig.add_trace(
            go.Scatter(
                x=pareto_df["primary_problem_tag"],
                y=pareto_df["cumulative_pct"],
                name="% Acumulada",
                mode="lines+markers",
                marker_color="#f59e0b",
                line=dict(width=3),
            ),
            secondary_y=True,
        )

        # Linha de corte de 80%
        fig.add_hline(
            y=80, line_dash="dash", line_color="#ef4444",
            annotation_text="Limiar 80% Pareto", annotation_position="top right",
            secondary_y=True
        )

        fig.update_layout(
            template="plotly_dark",
            height=420,
            margin=dict(l=20, r=20, t=30, b=50),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        fig.update_yaxes(title_text="Perda Estimada em Devoluções (R$)", secondary_y=False)
        fig.update_yaxes(title_text="% Acumulada", maxallowed=100, secondary_y=True)

        st.plotly_chart(fig, use_container_width=True)
    except ImportError:
        st.bar_chart(pareto_df.set_index("primary_problem_tag")["total_loss_brl"])

    # Gráficos complementares
    col_left, col_right = st.columns(2)
    with col_left:
        st.subheader("🎯 Distribuição por Dimensão")
        aspect_counts = df["aspect"].value_counts()
        st.bar_chart(aspect_counts)

    with col_right:
        st.subheader("⚠️ Risco de Churn dos Clientes")
        churn_counts = df["churn_risk"].value_counts()
        st.bar_chart(churn_counts)

# =============================================================================
# ABA 2: TABELA DE REVIEWS ENRIQUECIDAS
# =============================================================================
with tab_table:
    st.subheader("📋 Base de Dados Enriquecida com Structured Outputs")

    # Filtros interativos
    f_col1, f_col2 = st.columns(2)
    with f_col1:
        selected_sentiment = st.multiselect(
            "Filtrar por Sentimento:",
            options=df["ai_sentiment"].unique(),
            default=df["ai_sentiment"].unique()
        )
    with f_col2:
        selected_aspect = st.multiselect(
            "Filtrar por Dimensão/Aspecto:",
            options=df["aspect"].unique(),
            default=df["aspect"].unique()
        )

    filtered_df = df[
        (df["ai_sentiment"].isin(selected_sentiment)) &
        (df["aspect"].isin(selected_aspect))
    ]

    display_cols = [
        "product", "rating", "ai_sentiment", "ai_sentiment_score",
        "primary_problem_tag", "aspect", "churn_risk", "suggested_action"
    ]
    st.dataframe(filtered_df[display_cols], use_container_width=True, height=450)

    # Botão de download dos dados enriquecidos
    csv_bytes = filtered_df.to_csv(index=False).encode("utf-8")
    st.download_button(
        "📥 Baixar Dados Enriquecidos (CSV)",
        data=csv_bytes,
        file_name="reviews_enriquecidas_gemini.csv",
        mime="text/csv"
    )

# =============================================================================
# ABA 3: TESTE AO VIVO (PLAYGROUND IA)
# =============================================================================
with tab_live:
    st.subheader("⚡ Playground de Análise de Review em Tempo Real")
    st.markdown("Digite ou cole qualquer avaliação de cliente para ver o Gemini 1.5 Flash classificar na hora.")

    sample_test = "Comprei o fone há 3 dias e o cancelamento de ruído estala no ouvido esquerdo. Péssima experiência, solicitei devolução e reembolso imediato."
    user_input = st.text_area("Texto da Avaliação:", value=sample_test, height=110)
    product_name_input = st.text_input("Nome do Produto:", value="Fone de Ouvido ANC")

    if st.button("🚀 Analisar com Gemini IA", type="primary"):
        with st.spinner("Classificando com Structured Outputs..."):
            result, metrics = client.analyze_review(user_input, product_name=product_name_input)

            st.success("Análise concluída!")
            res_col1, res_col2 = st.columns([2, 1])

            with res_col1:
                st.markdown(f"### Sentimento: **{result.sentiment.value}** (Score: `{result.sentiment_score:+.2f}`)")
                st.markdown(f"**Dimensão Afetada:** `{result.aspect.value}`")
                st.markdown(f"**Causa-Raiz Detectada:** `{result.primary_problem_tag}`")
                st.markdown(f"**Subtag:** `{result.secondary_tag}`")
                st.markdown(f"**Risco de Churn:** `{result.churn_risk.value}`")
                st.info(f"💡 **Ação Prescritiva de CX/Produto:** {result.suggested_action}")
                st.caption(f"📝 Síntese: {result.summary_pt}")

            with res_col2:
                st.markdown("#### 💰 Métricas de FinOps (Tokens)")
                st.metric("Tokens Consumidos", f"{metrics.total_tokens}")
                st.metric("Custo da Chamada (R$)", f"R$ {metrics.cost_brl:.5f}")
                st.metric("Custo da Chamada (USD)", f"${metrics.cost_usd:.5f}")
                st.caption("Base: $0.075/M tokens de input no Gemini 1.5 Flash.")